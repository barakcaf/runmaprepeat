"""Integration tests for Spotify API — hits real endpoints.

Run explicitly with:
    pytest -m integration backend/tests/test_spotify_integration.py

Requires SSM parameters:
    /runmaprepeat/spotify/client-id
    /runmaprepeat/spotify/client-secret
"""

from __future__ import annotations

import base64
import json
import urllib.parse
import urllib.request

import boto3
import pytest

_SSM_CLIENT_ID = "/runmaprepeat/spotify/client-id"
_SSM_CLIENT_SECRET = "/runmaprepeat/spotify/client-secret"
_TOKEN_URL = "https://accounts.spotify.com/api/token"
_SEARCH_URL = "https://api.spotify.com/v1/search"


def _load_credentials() -> tuple[str, str]:
    """Read Spotify credentials from SSM."""
    ssm = boto3.client("ssm")
    response = ssm.get_parameters(
        Names=[_SSM_CLIENT_ID, _SSM_CLIENT_SECRET],
        WithDecryption=True,
    )
    params = {p["Name"]: p["Value"] for p in response["Parameters"]}
    assert _SSM_CLIENT_ID in params, f"Missing SSM param: {_SSM_CLIENT_ID}"
    assert _SSM_CLIENT_SECRET in params, f"Missing SSM param: {_SSM_CLIENT_SECRET}"
    return params[_SSM_CLIENT_ID], params[_SSM_CLIENT_SECRET]


def _get_token(client_id: str, client_secret: str) -> str:
    """Exchange client credentials for an access token."""
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
    assert "access_token" in body
    assert body.get("token_type", "").lower() == "bearer"
    assert body.get("expires_in", 0) > 0
    return body["access_token"]


@pytest.fixture(scope="module")
def spotify_token() -> str:
    """Provide a real Spotify access token for the test module."""
    client_id, client_secret = _load_credentials()
    return _get_token(client_id, client_secret)


@pytest.mark.integration
class TestSpotifyTokenExchange:
    """Verify Client Credentials flow against real Spotify."""

    def test_token_returns_bearer(self) -> None:
        client_id, client_secret = _load_credentials()
        token = _get_token(client_id, client_secret)
        assert isinstance(token, str)
        assert len(token) > 0


@pytest.mark.integration
class TestSpotifySearch:
    """Verify search endpoint returns expected structure."""

    @staticmethod
    def _search(token: str, query: str, types: str, limit: int = 3) -> dict:
        params = urllib.parse.urlencode({"q": query, "type": types, "limit": limit})
        req = urllib.request.Request(
            f"{_SEARCH_URL}?{params}",
            headers={"Authorization": f"Bearer {token}"},
        )
        with urllib.request.urlopen(req) as resp:
            assert resp.status == 200
            return json.loads(resp.read().decode())

    def test_search_tracks(self, spotify_token: str) -> None:
        data = self._search(spotify_token, "Around the World Daft Punk", "track")
        assert "tracks" in data
        items = data["tracks"]["items"]
        assert len(items) > 0
        track = items[0]
        assert "id" in track
        assert "name" in track
        assert "artists" in track
        assert "album" in track
        assert "external_urls" in track

    def test_search_artists(self, spotify_token: str) -> None:
        data = self._search(spotify_token, "Daft Punk", "artist")
        assert "artists" in data
        items = data["artists"]["items"]
        assert len(items) > 0
        artist = items[0]
        assert "id" in artist
        assert "name" in artist
        assert "images" in artist

    def test_search_albums(self, spotify_token: str) -> None:
        data = self._search(spotify_token, "Discovery Daft Punk", "album")
        assert "albums" in data
        items = data["albums"]["items"]
        assert len(items) > 0
        album = items[0]
        assert "id" in album
        assert "name" in album
        assert "artists" in album

    def test_search_multi_type(self, spotify_token: str) -> None:
        data = self._search(spotify_token, "Bohemian Rhapsody", "track,artist,album")
        assert "tracks" in data
        assert "artists" in data
        assert "albums" in data

    def test_search_gibberish_returns_tracks_key(self, spotify_token: str) -> None:
        """Even gibberish queries return a valid response structure."""
        data = self._search(spotify_token, "xyzzynonexistent999qqq", "track")
        assert "tracks" in data
        assert isinstance(data["tracks"]["items"], list)

    def test_search_respects_limit(self, spotify_token: str) -> None:
        data = self._search(spotify_token, "love", "track", limit=2)
        assert len(data["tracks"]["items"]) <= 2


@pytest.mark.integration
class TestSpotifyDataModule:
    """Integration test using the actual data.spotify module."""

    def test_search_via_module(self) -> None:
        """Call the real search() function end-to-end."""
        from data.spotify import search

        results = search("Stairway to Heaven", types=["track"], limit=3)
        assert "tracks" in results
        assert len(results["tracks"]) > 0
        track = results["tracks"][0]
        assert "spotifyId" in track
        assert "name" in track
        assert "artistName" in track
        assert "spotifyUrl" in track
        assert track["type"] == "track"
