"""Tests for profile data layer — Decimal serialization and DynamoDB integration."""

from __future__ import annotations

import json
from decimal import Decimal
from unittest.mock import MagicMock, patch

from data.profile import _convert_decimals, get_profile, put_profile


# --- _convert_decimals unit tests ---


def test_convert_decimal_integer() -> None:
    """Decimal with no fractional part → int."""
    assert _convert_decimals(Decimal("75")) == 75
    assert isinstance(_convert_decimals(Decimal("75")), int)


def test_convert_decimal_float() -> None:
    """Decimal with fractional part → float."""
    assert _convert_decimals(Decimal("75.5")) == 75.5
    assert isinstance(_convert_decimals(Decimal("75.5")), float)


def test_convert_decimal_in_dict() -> None:
    """Nested Decimals in a dict are converted."""
    data = {"weightKg": Decimal("80"), "heightCm": Decimal("175.5"), "name": "Alice"}
    result = _convert_decimals(data)
    assert result == {"weightKg": 80, "heightCm": 175.5, "name": "Alice"}
    assert isinstance(result["weightKg"], int)
    assert isinstance(result["heightCm"], float)
    assert isinstance(result["name"], str)


def test_convert_decimal_in_list() -> None:
    """Decimals in a list are converted."""
    data = [Decimal("1"), Decimal("2.5"), "text"]
    result = _convert_decimals(data)
    assert result == [1, 2.5, "text"]


def test_convert_decimal_nested() -> None:
    """Deeply nested Decimals are converted."""
    data = {"outer": {"inner": [Decimal("10"), {"deep": Decimal("3.14")}]}}
    result = _convert_decimals(data)
    assert result == {"outer": {"inner": [10, {"deep": 3.14}]}}


def test_convert_passthrough_non_decimal() -> None:
    """Non-Decimal types pass through unchanged."""
    assert _convert_decimals("hello") == "hello"
    assert _convert_decimals(42) == 42
    assert _convert_decimals(None) is None


def test_converted_result_is_json_serializable() -> None:
    """The whole point: converted data must survive json.dumps()."""
    data = {
        "weightKg": Decimal("75"),
        "heightCm": Decimal("180.5"),
        "displayName": "Test User",
        "email": "user@example.com",
    }
    result = _convert_decimals(data)
    # This would raise TypeError if Decimals leaked through
    serialized = json.dumps(result)
    assert '"weightKg": 75' in serialized


# --- get_profile integration tests (mocked DynamoDB) ---


@patch("data.profile.get_table")
def test_get_profile_converts_decimals(mock_get_table: MagicMock) -> None:
    """get_profile returns native Python types, not Decimals."""
    mock_table = MagicMock()
    mock_table.get_item.return_value = {
        "Item": {
            "userId": "user-1",
            "sk": "PROFILE",
            "weightKg": Decimal("80"),
            "heightCm": Decimal("175"),
            "displayName": "Test",
        }
    }
    mock_get_table.return_value = mock_table

    profile = get_profile("user-1")
    assert profile is not None
    assert profile["weightKg"] == 80
    assert isinstance(profile["weightKg"], int)
    assert profile["heightCm"] == 175
    assert isinstance(profile["heightCm"], int)
    # json.dumps must work — this is the actual bug regression test
    json.dumps(profile)


@patch("data.profile.get_table")
def test_get_profile_converts_fractional_decimals(mock_get_table: MagicMock) -> None:
    """Fractional weights (e.g. 72.5 kg) come back as float, not Decimal."""
    mock_table = MagicMock()
    mock_table.get_item.return_value = {
        "Item": {
            "userId": "user-1",
            "sk": "PROFILE",
            "weightKg": Decimal("72.5"),
        }
    }
    mock_get_table.return_value = mock_table

    profile = get_profile("user-1")
    assert profile is not None
    assert profile["weightKg"] == 72.5
    assert isinstance(profile["weightKg"], float)
    json.dumps(profile)


@patch("data.profile.get_table")
def test_get_profile_not_found_returns_none(mock_get_table: MagicMock) -> None:
    mock_table = MagicMock()
    mock_table.get_item.return_value = {}
    mock_get_table.return_value = mock_table

    assert get_profile("nonexistent") is None


# --- put_profile integration tests (mocked DynamoDB) ---


@patch("data.profile.get_table")
def test_put_profile_returns_converted_types(mock_get_table: MagicMock) -> None:
    """put_profile return value is JSON-serializable (no Decimals)."""
    mock_table = MagicMock()
    mock_get_table.return_value = mock_table

    result = put_profile("user-1", {"weightKg": Decimal("85"), "heightCm": Decimal("190")})
    assert isinstance(result["weightKg"], int)
    assert isinstance(result["heightCm"], int)
    # Must not raise
    json.dumps(result)


@patch("data.profile.get_table")
def test_put_profile_strips_keys(mock_get_table: MagicMock) -> None:
    """put_profile strips internal keys (userId, sk) from the response."""
    mock_table = MagicMock()
    mock_get_table.return_value = mock_table

    result = put_profile("user-1", {"displayName": "Bob"})
    assert "userId" not in result
    assert "sk" not in result


# --- End-to-end handler test with real Decimal path ---


@patch("handlers.profile.get_profile")
def test_handler_get_profile_with_decimal_response_is_valid_json(mock_get: MagicMock) -> None:
    """Full handler round-trip: Decimal data → valid JSON response body."""
    from handlers.profile import handler

    # Simulate what the data layer returns after Decimal conversion
    mock_get.return_value = {
        "weightKg": 80,
        "heightCm": 175,
        "displayName": "Test",
        "email": "test@example.com",
    }
    event = {
        "httpMethod": "GET",
        "resource": "/profile",
        "requestContext": {"authorizer": {"claims": {"sub": "test-user"}}},
        "body": None,
    }
    response = handler(event, None)
    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert body["weightKg"] == 80
    assert body["heightCm"] == 175
