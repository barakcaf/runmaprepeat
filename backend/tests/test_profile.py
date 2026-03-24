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


@patch("handlers.profile.get_profile")
def test_get_profile_success(mock_get: object) -> None:
    mock_get.return_value = {"weightKg": 70, "heightCm": 175, "birthDate": "1990-01-01"}
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
    mock_put.return_value = {"weightKg": 75, "heightCm": 180}
    response = handler(_make_event("PUT", {"weightKg": 75, "heightCm": 180}), None)
    assert response["statusCode"] == 200


def test_put_profile_invalid_weight() -> None:
    response = handler(_make_event("PUT", {"weightKg": -10}), None)
    assert response["statusCode"] == 400
    body = json.loads(response["body"])
    assert "weightKg" in body["error"]


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


def test_put_profile_invalid_birth_date() -> None:
    response = handler(_make_event("PUT", {"birthDate": "not-a-date"}), None)
    assert response["statusCode"] == 400


@patch("handlers.profile.put_profile")
def test_put_profile_sets_updated_at(mock_put: object) -> None:
    mock_put.return_value = {"weightKg": 70}
    handler(_make_event("PUT", {"weightKg": 70}), None)
    call_args = mock_put.call_args
    profile_data = call_args[0][1]
    assert "updatedAt" in profile_data
