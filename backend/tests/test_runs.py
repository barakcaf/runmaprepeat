"""Tests for runs Lambda handler."""

from __future__ import annotations

import json
from unittest.mock import patch

from handlers.runs import handler


def _make_event(
    method: str = "GET",
    resource: str = "/runs",
    body: dict | None = None,
    user_id: str = "test-user-123",
    run_id: str | None = None,
) -> dict:
    event = {
        "httpMethod": method,
        "resource": resource,
        "requestContext": {
            "authorizer": {
                "claims": {"sub": user_id},
            },
        },
        "body": json.dumps(body) if body else None,
        "pathParameters": {"runId": run_id} if run_id else None,
    }
    return event


@patch("handlers.runs.get_profile")
@patch("handlers.runs.create_run")
def test_create_run(mock_create: object, mock_profile: object) -> None:
    mock_profile.return_value = {"weightKg": 70}
    mock_create.side_effect = lambda uid, rid, data: {"runId": rid, **data}
    event = _make_event(
        "POST",
        "/runs",
        body={
            "status": "completed",
            "runDate": "2024-01-15T08:00:00Z",
            "distanceMeters": 5000,
            "durationSeconds": 1800,
        },
    )
    response = handler(event, None)
    assert response["statusCode"] == 201
    body = json.loads(response["body"])
    assert body["status"] == "completed"
    assert "paceSecondsPerKm" in body
    assert "caloriesBurned" in body


@patch("handlers.runs.list_runs")
def test_list_runs(mock_list: object) -> None:
    mock_list.return_value = [{"runId": "ABC", "status": "planned"}]
    response = handler(_make_event("GET", "/runs"), None)
    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert len(body) == 1


@patch("handlers.runs.get_run")
def test_get_run(mock_get: object) -> None:
    mock_get.return_value = {"runId": "ABC", "status": "completed"}
    event = _make_event("GET", "/runs/{runId}", run_id="ABC")
    response = handler(event, None)
    assert response["statusCode"] == 200


@patch("handlers.runs.get_run")
def test_get_run_not_found(mock_get: object) -> None:
    mock_get.return_value = None
    event = _make_event("GET", "/runs/{runId}", run_id="XYZ")
    response = handler(event, None)
    assert response["statusCode"] == 404


@patch("handlers.runs.update_run")
def test_update_run(mock_update: object) -> None:
    mock_update.return_value = {"runId": "ABC", "title": "Morning run"}
    event = _make_event("PUT", "/runs/{runId}", body={"title": "Morning run"}, run_id="ABC")
    response = handler(event, None)
    assert response["statusCode"] == 200


@patch("handlers.runs.update_run")
def test_update_run_not_found(mock_update: object) -> None:
    mock_update.return_value = None
    event = _make_event("PUT", "/runs/{runId}", body={"title": "x"}, run_id="ABC")
    response = handler(event, None)
    assert response["statusCode"] == 404


@patch("handlers.runs.delete_run")
def test_delete_run(mock_delete: object) -> None:
    mock_delete.return_value = True
    event = _make_event("DELETE", "/runs/{runId}", run_id="ABC")
    response = handler(event, None)
    assert response["statusCode"] == 200


@patch("handlers.runs.delete_run")
def test_delete_run_not_found(mock_delete: object) -> None:
    mock_delete.return_value = False
    event = _make_event("DELETE", "/runs/{runId}", run_id="ABC")
    response = handler(event, None)
    assert response["statusCode"] == 404


@patch("handlers.runs.get_profile")
@patch("handlers.runs.update_run")
@patch("handlers.runs.get_run")
def test_complete_run(mock_get: object, mock_update: object, mock_profile: object) -> None:
    mock_get.return_value = {"runId": "ABC", "status": "planned", "distanceMeters": 5000}
    mock_update.return_value = {
        "runId": "ABC",
        "status": "completed",
        "durationSeconds": 1800,
        "distanceMeters": 5000,
    }
    mock_profile.return_value = {"weightKg": 70}
    event = _make_event("POST", "/runs/{runId}/complete", body={"durationSeconds": 1800}, run_id="ABC")
    response = handler(event, None)
    assert response["statusCode"] == 200


@patch("handlers.runs.get_run")
def test_complete_run_already_completed(mock_get: object) -> None:
    mock_get.return_value = {"runId": "ABC", "status": "completed"}
    event = _make_event("POST", "/runs/{runId}/complete", body={"durationSeconds": 1800}, run_id="ABC")
    response = handler(event, None)
    assert response["statusCode"] == 400
    body = json.loads(response["body"])
    assert "planned" in body["error"]


def test_complete_run_missing_duration() -> None:
    event = _make_event("POST", "/runs/{runId}/complete", body={}, run_id="ABC")
    response = handler(event, None)
    assert response["statusCode"] == 400


def test_unauthorized() -> None:
    event = {
        "httpMethod": "GET",
        "resource": "/runs",
        "requestContext": {},
        "body": None,
        "pathParameters": None,
    }
    response = handler(event, None)
    assert response["statusCode"] == 401


def test_create_run_invalid_status() -> None:
    event = _make_event("POST", "/runs", body={"status": "invalid"})
    response = handler(event, None)
    assert response["statusCode"] == 400


def test_options_returns_200() -> None:
    event = _make_event("OPTIONS")
    response = handler(event, None)
    assert response["statusCode"] == 200
