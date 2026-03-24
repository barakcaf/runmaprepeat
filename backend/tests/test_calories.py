"""Tests for calorie calculation utility."""

from handlers.utils.calories import RUNNING_MET, calculate_calories


def test_calculate_calories_basic() -> None:
    """70kg runner for 1 hour should burn ~686 calories."""
    result = calculate_calories(70.0, 3600)
    expected = round(70.0 * RUNNING_MET * 1.0)
    assert result == expected


def test_calculate_calories_30_minutes() -> None:
    """70kg runner for 30 minutes should burn ~343 calories."""
    result = calculate_calories(70.0, 1800)
    expected = round(70.0 * RUNNING_MET * 0.5)
    assert result == expected


def test_calculate_calories_zero_weight() -> None:
    result = calculate_calories(0, 3600)
    assert result == 0


def test_calculate_calories_negative_weight() -> None:
    result = calculate_calories(-70.0, 3600)
    assert result == 0


def test_calculate_calories_zero_duration() -> None:
    result = calculate_calories(70.0, 0)
    assert result == 0


def test_calculate_calories_negative_duration() -> None:
    result = calculate_calories(70.0, -100)
    assert result == 0


def test_calculate_calories_returns_integer() -> None:
    result = calculate_calories(65.5, 2700)
    assert isinstance(result, int)
