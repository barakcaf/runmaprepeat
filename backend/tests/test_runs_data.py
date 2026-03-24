"""Tests for runs data layer — float/Decimal conversion and DynamoDB integration."""

from __future__ import annotations

import json
from decimal import Decimal
from unittest.mock import MagicMock, patch

from data.runs import (
    _convert_decimals,
    _convert_floats_to_decimal,
    create_run,
    get_run,
    list_runs,
    update_run,
)


# --- _convert_floats_to_decimal unit tests ---


def test_convert_float_to_decimal() -> None:
    """A plain float becomes a Decimal."""
    result = _convert_floats_to_decimal(3.14)
    assert result == Decimal("3.14")
    assert isinstance(result, Decimal)


def test_convert_float_in_dict() -> None:
    """Floats inside a dict are converted."""
    data = {"distanceMeters": 5000.5, "name": "Morning run"}
    result = _convert_floats_to_decimal(data)
    assert isinstance(result["distanceMeters"], Decimal)
    assert result["distanceMeters"] == Decimal("5000.5")
    assert isinstance(result["name"], str)


def test_convert_float_in_list() -> None:
    """Floats inside a list (route coordinates) are converted."""
    route = [[-73.9857, 40.7484], [-73.9862, 40.7490]]
    result = _convert_floats_to_decimal(route)
    assert isinstance(result[0][0], Decimal)
    assert isinstance(result[0][1], Decimal)
    assert result[0][0] == Decimal("-73.9857")
    assert result[1][1] == Decimal("40.749")


def test_convert_passthrough_non_float() -> None:
    """Non-float types pass through unchanged."""
    assert _convert_floats_to_decimal("hello") == "hello"
    assert _convert_floats_to_decimal(42) == 42
    assert _convert_floats_to_decimal(None) is None


def test_convert_nested_float_structure() -> None:
    """Deeply nested floats are converted."""
    data = {"route": [[-73.98, 40.74]], "stats": {"pace": 5.5}}
    result = _convert_floats_to_decimal(data)
    assert isinstance(result["route"][0][0], Decimal)
    assert isinstance(result["stats"]["pace"], Decimal)


# --- _convert_decimals (read path) unit tests ---


def test_convert_decimal_to_float() -> None:
    """Decimal with fractional part → float."""
    assert _convert_decimals(Decimal("3.14")) == 3.14
    assert isinstance(_convert_decimals(Decimal("3.14")), float)


def test_convert_decimal_to_int() -> None:
    """Decimal with no fractional part → int."""
    assert _convert_decimals(Decimal("5000")) == 5000
    assert isinstance(_convert_decimals(Decimal("5000")), int)


# --- create_run integration tests (mocked DynamoDB) ---


@patch("data.runs.get_table")
def test_create_run_with_float_route(mock_get_table: MagicMock) -> None:
    """create_run converts float route coordinates to Decimal before put_item."""
    mock_table = MagicMock()
    mock_get_table.return_value = mock_table

    run_data = {
        "route": [[-73.9857, 40.7484], [-73.9862, 40.7490]],
        "distanceMeters": 5000.5,
        "durationSeconds": 1800.0,
        "status": "completed",
    }
    create_run("user-1", "run-1", run_data)

    # Verify put_item was called with Decimal values, not floats
    call_args = mock_table.put_item.call_args
    item = call_args[1]["Item"]
    assert isinstance(item["distanceMeters"], Decimal)
    assert isinstance(item["durationSeconds"], Decimal)
    assert isinstance(item["route"][0][0], Decimal)
    assert isinstance(item["route"][0][1], Decimal)


@patch("data.runs.get_table")
def test_create_run_returns_native_types(mock_get_table: MagicMock) -> None:
    """create_run return value has native Python types (not Decimal)."""
    mock_table = MagicMock()
    mock_get_table.return_value = mock_table

    run_data = {
        "distanceMeters": 5000.5,
        "durationSeconds": 1800,
        "status": "completed",
    }
    result = create_run("user-1", "run-1", run_data)

    # Return value should be JSON-serializable
    json.dumps(result)
    assert "userId" not in result
    assert result["runId"] == "run-1"


# --- update_run integration tests (mocked DynamoDB) ---


@patch("data.runs.get_table")
def test_update_run_converts_floats(mock_get_table: MagicMock) -> None:
    """update_run converts float values to Decimal before put_item."""
    mock_table = MagicMock()
    mock_table.get_item.return_value = {
        "Item": {
            "userId": "user-1",
            "sk": "RUN#run-1",
            "status": "planned",
        }
    }
    mock_get_table.return_value = mock_table

    update_data = {
        "durationSeconds": 1800.0,
        "elevationGainMeters": 45.3,
    }
    update_run("user-1", "run-1", update_data)

    call_args = mock_table.put_item.call_args
    item = call_args[1]["Item"]
    assert isinstance(item["durationSeconds"], Decimal)
    assert isinstance(item["elevationGainMeters"], Decimal)


# --- Round-trip test ---


@patch("data.runs.get_table")
def test_round_trip_create_then_get(mock_get_table: MagicMock) -> None:
    """Create with floats → get returns correct numeric types (not Decimal)."""
    mock_table = MagicMock()
    mock_get_table.return_value = mock_table

    # Simulate what DynamoDB would store and return (Decimals)
    mock_table.get_item.return_value = {
        "Item": {
            "userId": "user-1",
            "sk": "RUN#run-1",
            "distanceMeters": Decimal("5000.5"),
            "durationSeconds": Decimal("1800"),
            "route": [[Decimal("-73.9857"), Decimal("40.7484")]],
            "status": "completed",
        }
    }

    result = get_run("user-1", "run-1")
    assert result is not None
    assert isinstance(result["distanceMeters"], float)
    assert isinstance(result["durationSeconds"], int)
    assert isinstance(result["route"][0][0], float)
    # Must be JSON-serializable
    json.dumps(result)


@patch("data.runs.get_table")
def test_list_runs_converts_decimals(mock_get_table: MagicMock) -> None:
    """list_runs returns native Python types, not Decimals."""
    mock_table = MagicMock()
    mock_table.query.return_value = {
        "Items": [
            {
                "userId": "user-1",
                "sk": "RUN#run-1",
                "distanceMeters": Decimal("3000"),
                "route": [[Decimal("-73.98"), Decimal("40.74")]],
            }
        ]
    }
    mock_get_table.return_value = mock_table

    results = list_runs("user-1")
    assert len(results) == 1
    assert isinstance(results[0]["distanceMeters"], int)
    assert isinstance(results[0]["route"][0][0], float)
    json.dumps(results)
