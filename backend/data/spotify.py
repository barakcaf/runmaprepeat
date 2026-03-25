"""Spotify API wrapper for search and authentication."""

from __future__ import annotations

import base64
import json
import logging
import time
import urllib.request
import urllib.parse
from typing import Any

import boto3

logger = logging.getLogger(__name__)

_ssm = boto3.client("ssm")

# SSM params read at cold start
_client_id: str | None = None
_client_secret: str | None = None

# Cached access token
_cached_token: str | None = None
_token_expiry: float = 0.0

_TOKEN_URL = "https://accounts.spotify.com/api/token"
_SEARCH_URL = "https://api.spotify.com/v1/search"
_EXPIRY_BUFFER_SECONDS = 60


def _load_credentials() -> tuple[str, str]:
    """Load Spotify credentials from SSM Parameter Store (cached after cold start)."""
    global _client_id, _client_secret
    if _client_id and _client_secret:
        return _client_id, _client_secret

    response = _ssm.get_parameters(
        Names=[
            "/runmaprepeat/spotify/client-id",
            "/runmaprepeat/spotify/client-secret",
        ],
        WithDecryption=True,
    )
    params = {p["Name"]: p["Value"] for p in response["Parameters"]}
    _client_id = params["/runmaprepeat/spotify/client-id"]
    _client_secret = params["/runmaprepeat/spotify/client-secret"]
    return _client_id, _client_secret


def get_access_token() -> str:
    """Get a valid Spotify access token, refreshing if needed."""
    global _cached_token, _token_expiry

    if _cached_token and time.time() < _token_expiry:
        return _cached_token

    client_id, client_secret = _load_credentials()
    credentials = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()

    data = urllib.parse.urlencode({"grant_type": "client_credentials"}).encode()
    req = urllib.request.Request(
        _TOKEN_URL,
        data=data,
        headers={
            "Authorization": f"Basic {credentials}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )

    with urllib.request.urlopen(req) as resp:
        body = json.loads(resp.read().decode())

    _cached_token = body["access_token"]
    _token_expiry = time.time() + body["expires_in"] - _EXPIRY_BUFFER_SECONDS
    return _cached_token


class SpotifyError(Exception):
    """Raised when Spotify API returns an error."""

    def __init__(self, status_code: int, retry_after: str | None = None) -> None:
        self.status_code = status_code
        self.retry_after = retry_after
        super().__init__(f"Spotify API error: {status_code}")


def search(query: str, types: list[str], limit: int = 5) -> dict[str, Any]:
    """Search Spotify and return transformed results."""
    token = get_access_token()

    params = urllib.parse.urlencode({
        "q": query,
        "type": ",".join(types),
        "limit": limit,
    })
    url = f"{_SEARCH_URL}?{params}"
    req = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {token}"},
    )

    try:
        with urllib.request.urlopen(req) as resp:
            raw = json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        retry_after = e.headers.get("Retry-After") if e.headers else None
        raise SpotifyError(e.code, retry_after=retry_after) from e

    return _transform_results(raw)


def _transform_results(raw: dict[str, Any]) -> dict[str, Any]:
    """Transform raw Spotify search response to slim payload."""
    results: dict[str, Any] = {}

    if "artists" in raw:
        results["artists"] = [
            {
                "spotifyId": item["id"],
                "name": item["name"],
                "imageUrl": _pick_image(item.get("images", [])),
                "spotifyUrl": item.get("external_urls", {}).get("spotify", ""),
                "type": "artist",
            }
            for item in raw["artists"].get("items", [])
        ]

    if "albums" in raw:
        results["albums"] = [
            {
                "spotifyId": item["id"],
                "name": item["name"],
                "artistName": item["artists"][0]["name"] if item.get("artists") else None,
                "imageUrl": _pick_image(item.get("images", [])),
                "spotifyUrl": item.get("external_urls", {}).get("spotify", ""),
                "type": "album",
            }
            for item in raw["albums"].get("items", [])
        ]

    if "tracks" in raw:
        results["tracks"] = [
            {
                "spotifyId": item["id"],
                "name": item["name"],
                "artistName": item["artists"][0]["name"] if item.get("artists") else None,
                "albumName": item.get("album", {}).get("name"),
                "imageUrl": _pick_image(item.get("album", {}).get("images", [])),
                "spotifyUrl": item.get("external_urls", {}).get("spotify", ""),
                "type": "track",
            }
            for item in raw["tracks"].get("items", [])
        ]

    return results


def _pick_image(images: list[dict[str, Any]], min_width: int = 64) -> str | None:
    """Select the smallest image >= min_width pixels wide, or first available."""
    if not images:
        return None

    candidates = [img for img in images if img.get("width", 0) >= min_width]
    if candidates:
        candidates.sort(key=lambda img: img.get("width", 0))
        return candidates[0]["url"]

    return images[0]["url"]
