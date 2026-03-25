"""Tests for route_calculator Lambda handler."""

from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

from handlers.route_calculator import handler


def _make_event(
    method: str = "POST",
    body: dict | list | None = None,
    user_id: str = "test-user-123",
) -> dict:
    return {
        "httpMethod": method,
        "resource": "/routes/calculate",
        "requestContext": {
            "authorizer": {
                "claims": {"sub": user_id},
            },
        },
        "body": json.dumps(body) if body is not None else None,
    }


def test_options_returns_200() -> None:
    event = _make_event(method="OPTIONS")
    response = handler(event, None)
    assert response["statusCode"] == 200


def test_unauthorized_without_user() -> None:
    event = _make_event()
    event["requestContext"]["authorizer"]["claims"] = {}
    response = handler(event, None)
    assert response["statusCode"] == 401


def test_method_not_allowed() -> None:
    event = _make_event(method="GET")
    response = handler(event, None)
    assert response["statusCode"] == 405


def test_invalid_json_body() -> None:
    event = _make_event()
    event["body"] = "not json"
    response = handler(event, None)
    assert response["statusCode"] == 400
    assert "Invalid JSON" in json.loads(response["body"])["error"]


def test_missing_waypoints() -> None:
    event = _make_event(body={})
    response = handler(event, None)
    assert response["statusCode"] == 400
    assert "must be an array" in json.loads(response["body"])["error"]


def test_too_few_waypoints() -> None:
    event = _make_event(body={"waypoints": [[0, 0]]})
    response = handler(event, None)
    assert response["statusCode"] == 400
    assert "At least 2" in json.loads(response["body"])["error"]


def test_too_many_waypoints() -> None:
    event = _make_event(body={"waypoints": [[0, 0]] * 26})
    response = handler(event, None)
    assert response["statusCode"] == 400
    assert "At most 25" in json.loads(response["body"])["error"]


def test_invalid_waypoint_format() -> None:
    event = _make_event(body={"waypoints": [[0, 0], "bad"]})
    response = handler(event, None)
    assert response["statusCode"] == 400
    assert "waypoints[1]" in json.loads(response["body"])["error"]


def test_waypoint_non_numeric() -> None:
    event = _make_event(body={"waypoints": [[0, 0], ["a", "b"]]})
    response = handler(event, None)
    assert response["statusCode"] == 400
    assert "must contain numbers" in json.loads(response["body"])["error"]


def test_waypoint_lng_out_of_range() -> None:
    event = _make_event(body={"waypoints": [[0, 0], [200, 0]]})
    response = handler(event, None)
    assert response["statusCode"] == 400
    assert "lng must be between" in json.loads(response["body"])["error"]


def test_waypoint_lat_out_of_range() -> None:
    event = _make_event(body={"waypoints": [[0, 0], [0, -100]]})
    response = handler(event, None)
    assert response["statusCode"] == 400
    assert "lat must be between" in json.loads(response["body"])["error"]


@patch("handlers.route_calculator.location_client")
def test_successful_route_calculation(mock_client: MagicMock) -> None:
    mock_client.calculate_route.return_value = {
        "Legs": [
            {
                "Geometry": {
                    "LineString": [[34.78, 32.08], [34.785, 32.085], [34.79, 32.09]],
                },
            },
        ],
        "Summary": {"Distance": 5.0},
    }

    event = _make_event(body={"waypoints": [[34.78, 32.08], [34.79, 32.09]]})
    response = handler(event, None)

    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert body["geometry"] == [[34.78, 32.08], [34.785, 32.085], [34.79, 32.09]]
    assert body["distanceMeters"] == 5000.0

    mock_client.calculate_route.assert_called_once()
    call_kwargs = mock_client.calculate_route.call_args[1]
    assert call_kwargs["TravelMode"] == "Walking"
    assert call_kwargs["DeparturePosition"] == [34.78, 32.08]
    assert call_kwargs["DestinationPosition"] == [34.79, 32.09]
    assert call_kwargs["WaypointPositions"] == []


@patch("handlers.route_calculator.location_client")
def test_multi_leg_route(mock_client: MagicMock) -> None:
    mock_client.calculate_route.return_value = {
        "Legs": [
            {
                "Geometry": {
                    "LineString": [[1, 1], [1.5, 1.5], [2, 2]],
                },
            },
            {
                "Geometry": {
                    "LineString": [[2, 2], [2.5, 2.5], [3, 3]],
                },
            },
        ],
        "Summary": {"Distance": 10.0},
    }

    event = _make_event(body={"waypoints": [[1, 1], [2, 2], [3, 3]]})
    response = handler(event, None)

    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    # Second leg's first point (duplicate of first leg's last) should be skipped
    assert body["geometry"] == [[1, 1], [1.5, 1.5], [2, 2], [2.5, 2.5], [3, 3]]
    assert body["distanceMeters"] == 10000.0

    call_kwargs = mock_client.calculate_route.call_args[1]
    assert call_kwargs["WaypointPositions"] == [[2, 2]]


@patch("handlers.route_calculator.location_client")
def test_route_calculation_failure(mock_client: MagicMock) -> None:
    mock_client.calculate_route.side_effect = Exception("AWS error")

    event = _make_event(body={"waypoints": [[34.78, 32.08], [34.79, 32.09]]})
    response = handler(event, None)

    assert response["statusCode"] == 500
    assert "failed" in json.loads(response["body"])["error"]


def test_cors_headers_present() -> None:
    event = _make_event(body={"waypoints": [[0, 0]]})
    response = handler(event, None)
    assert "Access-Control-Allow-Origin" in response["headers"]
