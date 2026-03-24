"""Input validation helpers for API handlers."""

from __future__ import annotations

import logging
import re
from typing import Any

logger = logging.getLogger(__name__)

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
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

    required_fields = ("email", "displayName", "heightCm", "weightKg")
    for field in required_fields:
        if field not in body:
            errors.append(f"{field} is required")

    if "email" in body:
        if not isinstance(body["email"], str) or not EMAIL_PATTERN.match(body["email"]):
            errors.append("email must be a valid email address")

    if "displayName" in body:
        if not isinstance(body["displayName"], str) or len(body["displayName"]) > 100:
            errors.append("displayName must be a string of 100 characters or less")

    if "heightCm" in body:
        if not isinstance(body["heightCm"], (int, float)) or body["heightCm"] <= 0:
            errors.append("heightCm must be a positive number")

    if "weightKg" in body:
        if not isinstance(body["weightKg"], (int, float)) or body["weightKg"] <= 0:
            errors.append("weightKg must be a positive number")

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

    if "audio" in body:
        errors.extend(validate_audio(body["audio"]))

    return errors


_AUDIO_TYPES = ("music", "podcast")
_MUSIC_SUBTYPES = ("artist", "playlist")
_ARTIST_FORMATS = ("album", "mix")


def validate_audio(audio: Any) -> list[str]:
    """Validate the audio field on a run. Returns list of error messages."""
    errors: list[str] = []

    if not isinstance(audio, dict):
        return ["audio must be an object"]

    audio_type = audio.get("type")
    if audio_type not in _AUDIO_TYPES:
        errors.append(f"audio.type must be one of: {', '.join(_AUDIO_TYPES)}")
        return errors

    name = audio.get("name")
    if not isinstance(name, str) or not name.strip():
        errors.append("audio.name is required and must be a non-empty string")

    if "detail" in audio:
        if not isinstance(audio["detail"], str):
            errors.append("audio.detail must be a string")

    if audio_type == "music":
        subtype = audio.get("subtype")
        if subtype not in _MUSIC_SUBTYPES:
            errors.append(f"audio.subtype must be one of: {', '.join(_MUSIC_SUBTYPES)}")
        elif subtype == "artist":
            fmt = audio.get("format")
            if fmt not in _ARTIST_FORMATS:
                errors.append(f"audio.format must be one of: {', '.join(_ARTIST_FORMATS)}")

    return errors


def validate_complete_run(body: dict[str, Any]) -> list[str]:
    """Validate run completion payload. Returns list of error messages."""
    errors: list[str] = []

    if "durationSeconds" not in body:
        errors.append("durationSeconds is required")
    elif not isinstance(body["durationSeconds"], (int, float)) or body["durationSeconds"] <= 0:
        errors.append("durationSeconds must be a positive number")

    return errors
