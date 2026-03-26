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

    if "emailSubscriptions" in body:
        subs = body["emailSubscriptions"]
        if not isinstance(subs, dict):
            errors.append("emailSubscriptions must be an object")
        else:
            for key in ("weekly", "monthly"):
                if key in subs and not isinstance(subs[key], bool):
                    errors.append(f"emailSubscriptions.{key} must be a boolean")

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
        audio = body["audio"]
        if audio is None:
            pass  # null means "clear audio" — skip validation
        elif isinstance(audio, list):
            for i, item in enumerate(audio):
                item_errors = validate_audio(item)
                errors.extend(f"audio[{i}].{e.split('.', 1)[1]}" if '.' in e else e for e in item_errors)
        else:
            errors.extend(validate_audio(audio))

    return errors


_SPOTIFY_TYPES = ("artist", "album", "track")


def validate_audio(audio: Any) -> list[str]:
    """Validate the audio field on a run. Returns list of error messages."""
    errors: list[str] = []

    if not isinstance(audio, dict):
        return ["audio must be an object"]

    source = audio.get("source")
    if source is None:
        return errors

    if source == "spotify":
        if "spotifyId" not in audio or not isinstance(audio["spotifyId"], str):
            errors.append("audio.spotifyId is required for spotify source")
        audio_type = audio.get("type")
        if audio_type not in _SPOTIFY_TYPES:
            errors.append(f"audio.type must be one of: {', '.join(_SPOTIFY_TYPES)}")
        name = audio.get("name")
        if not isinstance(name, str) or not name.strip():
            errors.append("audio.name is required and must be a non-empty string")
        if "spotifyUrl" not in audio or not isinstance(audio["spotifyUrl"], str):
            errors.append("audio.spotifyUrl is required for spotify source")
    elif source == "manual":
        name = audio.get("name")
        if not isinstance(name, str) or not name.strip():
            errors.append("audio.name is required and must be a non-empty string")
    else:
        errors.append("audio.source must be 'spotify' or 'manual'")

    if "artistName" in audio and not isinstance(audio["artistName"], str):
        errors.append("audio.artistName must be a string")
    if "albumName" in audio and not isinstance(audio["albumName"], str):
        errors.append("audio.albumName must be a string")

    return errors


def validate_complete_run(body: dict[str, Any]) -> list[str]:
    """Validate run completion payload. Returns list of error messages."""
    errors: list[str] = []

    if "durationSeconds" not in body:
        errors.append("durationSeconds is required")
    elif not isinstance(body["durationSeconds"], (int, float)) or body["durationSeconds"] <= 0:
        errors.append("durationSeconds must be a positive number")

    return errors
