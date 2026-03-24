"""Lambda handler for user profile CRUD operations."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any

from data.profile import get_profile, put_profile
from handlers.utils.validation import get_user_id, validate_profile

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
}


def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """Route profile requests to appropriate handler."""
    http_method = event.get("httpMethod", "")

    if http_method == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    user_id = get_user_id(event)
    if not user_id:
        return _error(401, "Unauthorized")

    if http_method == "GET":
        return _get_profile(user_id)
    elif http_method == "PUT":
        return _put_profile(user_id, event)
    else:
        return _error(405, "Method not allowed")


def _get_profile(user_id: str) -> dict[str, Any]:
    """Handle GET /profile."""
    profile = get_profile(user_id)
    if profile is None:
        return _error(404, "Profile not found")
    return _success(profile)


def _put_profile(user_id: str, event: dict[str, Any]) -> dict[str, Any]:
    """Handle PUT /profile."""
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return _error(400, "Invalid JSON body")

    errors = validate_profile(body)
    if errors:
        return _error(400, "; ".join(errors))

    profile_data = {}
    for field in ("weightKg", "heightCm", "birthDate", "displayName"):
        if field in body:
            profile_data[field] = body[field]

    profile_data["updatedAt"] = datetime.now(timezone.utc).isoformat()

    result = put_profile(user_id, profile_data)
    return _success(result)


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
