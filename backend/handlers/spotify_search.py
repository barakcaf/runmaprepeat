"""Lambda handler for Spotify search."""

from __future__ import annotations

import json
import logging
import os
from typing import Any

from data.spotify import SpotifyError, search
from handlers.utils.validation import get_user_id

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": os.environ["ALLOWED_ORIGIN"],
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
}

_VALID_TYPES = {"artist", "album", "track"}
_DEFAULT_TYPES = "artist,album,track"


def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """Handle GET /api/spotify/search."""
    http_method = event.get("httpMethod", "")

    if http_method == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    user_id = get_user_id(event)
    if not user_id:
        return _error(401, "Unauthorized")

    if http_method != "GET":
        return _error(405, "Method not allowed")

    params = event.get("queryStringParameters") or {}
    query = params.get("q", "").strip()
    if not query:
        return _error(400, "q parameter is required")

    if len(query) > 256:
        return _error(400, "Query too long (max 256 chars)")

    type_param = params.get("type", _DEFAULT_TYPES)
    types = [t.strip() for t in type_param.split(",") if t.strip() in _VALID_TYPES]
    if not types:
        return _error(400, f"type must be one or more of: {', '.join(sorted(_VALID_TYPES))}")

    try:
        results = search(query, types)
    except SpotifyError as e:
        if e.status_code == 429:
            headers = {**CORS_HEADERS}
            if e.retry_after:
                headers["Retry-After"] = e.retry_after
            return {
                "statusCode": 429,
                "headers": headers,
                "body": json.dumps({"error": "Rate limited by Spotify"}),
            }
        logger.error("Spotify API error: %d", e.status_code)
        return _error(502, "Spotify unavailable")

    return _success(results)


def _success(data: Any, status_code: int = 200) -> dict[str, Any]:
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": json.dumps(data),
    }


def _error(status_code: int, message: str) -> dict[str, Any]:
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": json.dumps({"error": message}),
    }
