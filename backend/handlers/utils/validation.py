"""Input validation helpers for API handlers."""

from __future__ import annotations

import logging
import re
from typing import Any

logger = logging.getLogger(__name__)

ISO_DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
ISO_DATETIME_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}")
ULID_PATTERN = re.compile(r"^[0-9A-Z]{26}$")


def get_user_id(event: dict[str, Any]) -> str | None:
    """Extract userId (Cognito sub) from API Gateway event."""
    try:
        return event["requestContext"]["authorizer"]["claims"]["sub"]
    except (KeyError, TypeError):
        logger.error("Could not extract userId from event")
        return None


def validate_profile(body: dict[str, Any]) -> list[str]:
    """Validate profile update payload. Returns list of error messages."""
    errors: list[str] = []

    if "weightKg" in body:
        if not isinstance(body["weightKg"], (int, float)) or body["weightKg"] <= 0:
            errors.append("weightKg must be a positive number")

    if "heightCm" in body:
        if not isinstance(body["heightCm"], (int, float)) or body["heightCm"] <= 0:
            errors.append("heightCm must be a positive number")

    if "birthDate" in body:
        if not isinstance(body["birthDate"], str) or not ISO_DATE_PATTERN.match(body["birthDate"]):
            errors.append("birthDate must be a valid ISO date (YYYY-MM-DD)")

    if "displayName" in body:
        if not isinstance(body["displayName"], str) or len(body["displayName"]) > 100:
            errors.append("displayName must be a string of 100 characters or less")

    return errors


def validate_run(body: dict[str, Any]) -> list[str]:
    """Validate run creation/update payload. Returns list of error messages."""
    errors: list[str] = []

    if "status" in body:
        if body["status"] not in ("completed", "planned"):
            errors.append("status must be 'completed' or 'planned'")

    if "runDate" in body:
        if not isinstance(body["runDate"], str) or not ISO_DATETIME_PATTERN.match(body["runDate"]):
            errors.append("runDate must be a valid ISO 8601 datetime")

    if "distanceMeters" in body:
        if not isinstance(body["distanceMeters"], (int, float)) or body["distanceMeters"] < 0:
            errors.append("distanceMeters must be a non-negative number")

    if "durationSeconds" in body:
        if not isinstance(body["durationSeconds"], (int, float)) or body["durationSeconds"] < 0:
            errors.append("durationSeconds must be a non-negative number")

    if "route" in body:
        if not isinstance(body["route"], list):
            errors.append("route must be an array of [lng, lat] pairs")

    if "elevationGainMeters" in body:
        if not isinstance(body["elevationGainMeters"], (int, float)) or body["elevationGainMeters"] < 0:
            errors.append("elevationGainMeters must be a non-negative number")

    return errors


def validate_complete_run(body: dict[str, Any]) -> list[str]:
    """Validate run completion payload. Returns list of error messages."""
    errors: list[str] = []

    if "durationSeconds" not in body:
        errors.append("durationSeconds is required")
    elif not isinstance(body["durationSeconds"], (int, float)) or body["durationSeconds"] <= 0:
        errors.append("durationSeconds must be a positive number")

    return errors
