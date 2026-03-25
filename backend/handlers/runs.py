import os
"""Lambda handler for run CRUD operations."""

from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timezone
from typing import Any

from data.profile import get_profile
from data.runs import create_run, delete_run, get_run, list_runs, update_run
from handlers.utils.calories import calculate_calories
from handlers.utils.validation import (
    get_user_id,
    validate_complete_run,
    validate_run,
)

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": os.environ["ALLOWED_ORIGIN"],
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
}

# ULID uses Crockford's base32
_CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"


def _generate_ulid() -> str:
    """Generate a ULID-like ID (timestamp + random)."""
    import os

    timestamp_ms = int(time.time() * 1000)
    # Encode 48-bit timestamp in 10 chars
    t_part = ""
    for _ in range(10):
        t_part = _CROCKFORD_BASE32[timestamp_ms & 0x1F] + t_part
        timestamp_ms >>= 5
    # 16 random chars for randomness portion
    random_bytes = os.urandom(10)
    r_part = ""
    for b in random_bytes:
        r_part += _CROCKFORD_BASE32[b & 0x1F]
    return t_part + r_part[:16]


def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """Route run requests to appropriate handler."""
    http_method = event.get("httpMethod", "")
    path = event.get("resource", "")

    if http_method == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    user_id = get_user_id(event)
    if not user_id:
        return _error(401, "Unauthorized")

    path_params = event.get("pathParameters") or {}
    run_id = path_params.get("runId")

    if path == "/runs" and http_method == "POST":
        return _create_run(user_id, event)
    elif path == "/runs" and http_method == "GET":
        return _list_runs(user_id)
    elif path == "/runs/{runId}" and http_method == "GET":
        return _get_run(user_id, run_id)
    elif path == "/runs/{runId}" and http_method == "PUT":
        return _update_run(user_id, run_id, event)
    elif path == "/runs/{runId}" and http_method == "DELETE":
        return _delete_run(user_id, run_id)
    elif path == "/runs/{runId}/complete" and http_method == "POST":
        return _complete_run(user_id, run_id, event)
    else:
        return _error(405, "Method not allowed")


def _calculate_pace(distance_meters: float, duration_seconds: float) -> float | None:
    """Calculate pace in seconds per km."""
    if distance_meters <= 0 or duration_seconds <= 0:
        return None
    distance_km = distance_meters / 1000
    return round(duration_seconds / distance_km, 1)


def _create_run(user_id: str, event: dict[str, Any]) -> dict[str, Any]:
    """Handle POST /runs."""
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return _error(400, "Invalid JSON body")

    errors = validate_run(body)
    if errors:
        return _error(400, "; ".join(errors))

    now = datetime.now(timezone.utc).isoformat()
    run_id = _generate_ulid()

    run_data: dict[str, Any] = {
        "status": body.get("status", "planned"),
        "runDate": body.get("runDate", now),
        "createdAt": now,
        "updatedAt": now,
    }

    for field in ("title", "route", "distanceMeters", "durationSeconds", "elevationGainMeters", "notes", "audio"):
        if field in body:
            run_data[field] = body[field]

    if run_data["status"] == "completed" and "durationSeconds" in run_data and "distanceMeters" in run_data:
        run_data["paceSecondsPerKm"] = _calculate_pace(
            run_data["distanceMeters"], run_data["durationSeconds"]
        )
        profile = get_profile(user_id)
        if profile and "weightKg" in profile:
            run_data["caloriesBurned"] = calculate_calories(
                float(profile["weightKg"]), int(run_data["durationSeconds"])
            )

    result = create_run(user_id, run_id, run_data)
    return _success(result, 201)


def _list_runs(user_id: str) -> dict[str, Any]:
    """Handle GET /runs."""
    runs = list_runs(user_id)
    return _success(runs)


def _get_run(user_id: str, run_id: str | None) -> dict[str, Any]:
    """Handle GET /runs/{runId}."""
    if not run_id:
        return _error(400, "runId is required")
    run = get_run(user_id, run_id)
    if run is None:
        return _error(404, "Run not found")
    return _success(run)


def _update_run(user_id: str, run_id: str | None, event: dict[str, Any]) -> dict[str, Any]:
    """Handle PUT /runs/{runId}."""
    if not run_id:
        return _error(400, "runId is required")

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return _error(400, "Invalid JSON body")

    errors = validate_run(body)
    if errors:
        return _error(400, "; ".join(errors))

    update_data: dict[str, Any] = {"updatedAt": datetime.now(timezone.utc).isoformat()}
    for field in ("status", "runDate", "title", "route", "distanceMeters", "durationSeconds", "elevationGainMeters", "notes", "audio"):
        if field in body:
            update_data[field] = body[field]

    result = update_run(user_id, run_id, update_data)
    if result is None:
        return _error(404, "Run not found")
    return _success(result)


def _delete_run(user_id: str, run_id: str | None) -> dict[str, Any]:
    """Handle DELETE /runs/{runId}."""
    if not run_id:
        return _error(400, "runId is required")
    deleted = delete_run(user_id, run_id)
    if not deleted:
        return _error(404, "Run not found")
    return _success({"message": "Run deleted"})


def _complete_run(user_id: str, run_id: str | None, event: dict[str, Any]) -> dict[str, Any]:
    """Handle POST /runs/{runId}/complete."""
    if not run_id:
        return _error(400, "runId is required")

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return _error(400, "Invalid JSON body")

    errors = validate_complete_run(body)
    if errors:
        return _error(400, "; ".join(errors))

    existing = get_run(user_id, run_id)
    if existing is None:
        return _error(404, "Run not found")

    if existing.get("status") != "planned":
        return _error(400, "Only planned runs can be completed")

    now = datetime.now(timezone.utc).isoformat()
    duration_seconds = body["durationSeconds"]
    distance_meters = existing.get("distanceMeters", 0)

    update_data: dict[str, Any] = {
        "status": "completed",
        "durationSeconds": duration_seconds,
        "updatedAt": now,
    }

    pace = _calculate_pace(distance_meters, duration_seconds)
    if pace is not None:
        update_data["paceSecondsPerKm"] = pace

    profile = get_profile(user_id)
    if profile and "weightKg" in profile:
        update_data["caloriesBurned"] = calculate_calories(
            float(profile["weightKg"]), int(duration_seconds)
        )

    result = update_run(user_id, run_id, update_data)
    if result is None:
        return _error(404, "Run not found")
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
