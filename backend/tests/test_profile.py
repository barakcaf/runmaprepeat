"""Tests for profile Lambda handler."""

from __future__ import annotations

import json
from unittest.mock import patch

from handlers.profile import handler


def _make_event(method: str = "GET", body: dict | None = None, user_id: str = "test-user-123") -> dict:
    event = {
        "httpMethod": method,
        "resource": "/profile",
        "requestContext": {
            "authorizer": {
                "claims": {"sub": user_id},
            },
        },
        "body": json.dumps(body) if body else None,
    }
    return event


VALID_PROFILE = {
    "email": "user@example.com",
    "displayName": "Test User",
    "heightCm": 175,
    "weightKg": 70,
}


@patch("handlers.profile.get_profile")
def test_get_profile_success(mock_get: object) -> None:
    mock_get.return_value = {"email": "u@example.com", "weightKg": 70, "heightCm": 175}
    response = handler(_make_event("GET"), None)
    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert body["weightKg"] == 70


@patch("handlers.profile.get_profile")
def test_get_profile_not_found(mock_get: object) -> None:
    mock_get.return_value = None
    response = handler(_make_event("GET"), None)
    assert response["statusCode"] == 404


@patch("handlers.profile.put_profile")
def test_put_profile_success(mock_put: object) -> None:
    mock_put.return_value = VALID_PROFILE
    response = handler(_make_event("PUT", VALID_PROFILE), None)
    assert response["statusCode"] == 200


def test_put_profile_invalid_weight() -> None:
    body = {**VALID_PROFILE, "weightKg": -10}
    response = handler(_make_event("PUT", body), None)
    assert response["statusCode"] == 400
    resp_body = json.loads(response["body"])
    assert "weightKg" in resp_body["error"]


def test_put_profile_invalid_json() -> None:
    event = _make_event("PUT")
    event["body"] = "not json{"
    response = handler(event, None)
    assert response["statusCode"] == 400


def test_unauthorized_no_claims() -> None:
    event = {
        "httpMethod": "GET",
        "resource": "/profile",
        "requestContext": {},
        "body": None,
    }
    response = handler(event, None)
    assert response["statusCode"] == 401


def test_method_not_allowed() -> None:
    response = handler(_make_event("DELETE"), None)
    assert response["statusCode"] == 405


def test_options_returns_200() -> None:
    event = _make_event("OPTIONS")
    response = handler(event, None)
    assert response["statusCode"] == 200


@patch("handlers.profile.put_profile")
def test_put_profile_sets_updated_at(mock_put: object) -> None:
    mock_put.return_value = VALID_PROFILE
    handler(_make_event("PUT", VALID_PROFILE), None)
    call_args = mock_put.call_args
    profile_data = call_args[0][1]
    assert "updatedAt" in profile_data


def test_put_profile_missing_email() -> None:
    body = {k: v for k, v in VALID_PROFILE.items() if k != "email"}
    response = handler(_make_event("PUT", body), None)
    assert response["statusCode"] == 400
    assert "email is required" in json.loads(response["body"])["error"]


def test_put_profile_missing_display_name() -> None:
    body = {k: v for k, v in VALID_PROFILE.items() if k != "displayName"}
    response = handler(_make_event("PUT", body), None)
    assert response["statusCode"] == 400
    assert "displayName is required" in json.loads(response["body"])["error"]


def test_put_profile_missing_height() -> None:
    body = {k: v for k, v in VALID_PROFILE.items() if k != "heightCm"}
    response = handler(_make_event("PUT", body), None)
    assert response["statusCode"] == 400
    assert "heightCm is required" in json.loads(response["body"])["error"]


def test_put_profile_missing_weight() -> None:
    body = {k: v for k, v in VALID_PROFILE.items() if k != "weightKg"}
    response = handler(_make_event("PUT", body), None)
    assert response["statusCode"] == 400
    assert "weightKg is required" in json.loads(response["body"])["error"]


def test_put_profile_invalid_email_format() -> None:
    body = {**VALID_PROFILE, "email": "not-an-email"}
    response = handler(_make_event("PUT", body), None)
    assert response["statusCode"] == 400
    assert "email" in json.loads(response["body"])["error"]


def test_put_profile_invalid_email_empty() -> None:
    body = {**VALID_PROFILE, "email": ""}
    response = handler(_make_event("PUT", body), None)
    assert response["statusCode"] == 400


def test_put_profile_birth_date_ignored() -> None:
    """birthDate field should not be stored even if sent."""
    body = {**VALID_PROFILE, "birthDate": "1990-01-01"}
    with patch("handlers.profile.put_profile") as mock_put:
        mock_put.return_value = VALID_PROFILE
        handler(_make_event("PUT", body), None)
        profile_data = mock_put.call_args[0][1]
        assert "birthDate" not in profile_data


@patch("handlers.profile.put_profile")
def test_put_profile_email_stored(mock_put: object) -> None:
    mock_put.return_value = VALID_PROFILE
    handler(_make_event("PUT", VALID_PROFILE), None)
    profile_data = mock_put.call_args[0][1]
    assert profile_data["email"] == "user@example.com"


def test_put_profile_missing_all_required() -> None:
    response = handler(_make_event("PUT", {}), None)
    assert response["statusCode"] == 400
    error = json.loads(response["body"])["error"]
    assert "email is required" in error
    assert "displayName is required" in error
    assert "heightCm is required" in error
    assert "weightKg is required" in error
