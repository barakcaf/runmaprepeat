"""Tests for stats Lambda handler."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from handlers.stats import compute_stats, handler


def _make_event(
    method: str = "GET",
    user_id: str = "test-user-123",
) -> dict:
    return {
        "httpMethod": method,
        "resource": "/stats",
        "requestContext": {
            "authorizer": {
                "claims": {"sub": user_id},
            },
        },
        "body": None,
        "pathParameters": None,
    }


def _make_run(
    run_date: str,
    distance: float = 5000,
    duration: float = 1800,
    pace: float | None = 360.0,
    status: str = "completed",
) -> dict:
    run: dict = {
        "runId": "ABC",
        "status": status,
        "runDate": run_date,
        "distanceMeters": distance,
        "durationSeconds": duration,
    }
    if pace is not None:
        run["paceSecondsPerKm"] = pace
    return run


# ---------------------------------------------------------------------------
# Handler-level tests
# ---------------------------------------------------------------------------


@patch("handlers.stats.list_all_runs")
def test_get_stats_success(mock_list: object) -> None:
    mock_list.return_value = []
    response = handler(_make_event(), None)
    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert "currentWeek" in body
    assert "allTime" in body


@patch("handlers.stats.list_all_runs")
def test_get_stats_with_runs(mock_list: object) -> None:
    now = datetime.now(timezone.utc)
    mock_list.return_value = [
        _make_run(now.isoformat(), distance=5000, duration=1800),
    ]
    response = handler(_make_event(), None)
    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert body["allTime"]["totalRuns"] == 1
    assert body["allTime"]["totalDistanceMeters"] == 5000


def test_stats_unauthorized() -> None:
    event = {
        "httpMethod": "GET",
        "resource": "/stats",
        "requestContext": {},
        "body": None,
        "pathParameters": None,
    }
    response = handler(event, None)
    assert response["statusCode"] == 401


def test_stats_method_not_allowed() -> None:
    response = handler(_make_event(method="POST"), None)
    assert response["statusCode"] == 405


def test_stats_options() -> None:
    response = handler(_make_event(method="OPTIONS"), None)
    assert response["statusCode"] == 200


# ---------------------------------------------------------------------------
# compute_stats — zero runs
# ---------------------------------------------------------------------------


def test_zero_runs() -> None:
    now = datetime(2026, 3, 24, 12, 0, 0, tzinfo=timezone.utc)
    stats = compute_stats([], now)

    assert stats["currentWeek"]["runCount"] == 0
    assert stats["currentWeek"]["totalDistanceMeters"] == 0
    assert stats["currentWeek"]["totalDurationSeconds"] == 0
    assert stats["currentWeek"]["avgPaceSecondsPerKm"] == 0.0
    assert stats["currentMonth"]["runCount"] == 0
    assert stats["previousWeek"]["runCount"] == 0
    assert stats["previousMonth"]["runCount"] == 0
    assert stats["allTime"]["totalRuns"] == 0
    assert stats["allTime"]["totalDistanceMeters"] == 0
    assert stats["allTime"]["totalDurationSeconds"] == 0
    assert stats["personalRecords"]["longestRunMeters"] == 0
    assert stats["personalRecords"]["fastestPaceSecondsPerKm"] == 0
    assert stats["personalRecords"]["mostDistanceInWeekMeters"] == 0
    assert stats["personalRecords"]["mostRunsInWeek"] == 0
    assert len(stats["weeklyDistances"]) == 8
    assert len(stats["monthlyDistances"]) == 6
    assert all(w["distanceMeters"] == 0 for w in stats["weeklyDistances"])
    assert all(m["distanceMeters"] == 0 for m in stats["monthlyDistances"])


# ---------------------------------------------------------------------------
# compute_stats — single run
# ---------------------------------------------------------------------------


def test_single_run_current_week() -> None:
    # Tuesday March 24 2026 — week starts Monday March 23
    now = datetime(2026, 3, 24, 12, 0, 0, tzinfo=timezone.utc)
    runs = [_make_run("2026-03-24T08:00:00Z", distance=10000, duration=3600, pace=360.0)]
    stats = compute_stats(runs, now)

    assert stats["currentWeek"]["runCount"] == 1
    assert stats["currentWeek"]["totalDistanceMeters"] == 10000
    assert stats["currentWeek"]["totalDurationSeconds"] == 3600
    assert stats["currentWeek"]["avgPaceSecondsPerKm"] == 360.0

    assert stats["allTime"]["totalRuns"] == 1
    assert stats["allTime"]["totalDistanceMeters"] == 10000

    assert stats["personalRecords"]["longestRunMeters"] == 10000
    assert stats["personalRecords"]["fastestPaceSecondsPerKm"] == 360.0
    assert stats["personalRecords"]["mostRunsInWeek"] == 1


# ---------------------------------------------------------------------------
# compute_stats — multiple runs across weeks/months
# ---------------------------------------------------------------------------


def test_multiple_runs_across_periods() -> None:
    now = datetime(2026, 3, 24, 12, 0, 0, tzinfo=timezone.utc)
    runs = [
        # Current week (March 23-29)
        _make_run("2026-03-24T08:00:00Z", distance=5000, duration=1800, pace=360.0),
        _make_run("2026-03-25T08:00:00Z", distance=3000, duration=1200, pace=400.0),
        # Previous week (March 16-22)
        _make_run("2026-03-17T08:00:00Z", distance=8000, duration=2800, pace=350.0),
        # Previous month (February)
        _make_run("2026-02-15T08:00:00Z", distance=12000, duration=4200, pace=350.0),
        # Older (January)
        _make_run("2026-01-10T08:00:00Z", distance=6000, duration=2400, pace=400.0),
    ]
    stats = compute_stats(runs, now)

    # Current week: 2 runs, 8000m, 3000s
    assert stats["currentWeek"]["runCount"] == 2
    assert stats["currentWeek"]["totalDistanceMeters"] == 8000
    assert stats["currentWeek"]["totalDurationSeconds"] == 3000

    # Previous week: 1 run
    assert stats["previousWeek"]["runCount"] == 1
    assert stats["previousWeek"]["totalDistanceMeters"] == 8000

    # Current month (March): 3 runs
    assert stats["currentMonth"]["runCount"] == 3

    # Previous month (February): 1 run
    assert stats["previousMonth"]["runCount"] == 1
    assert stats["previousMonth"]["totalDistanceMeters"] == 12000

    # All-time
    assert stats["allTime"]["totalRuns"] == 5
    assert stats["allTime"]["totalDistanceMeters"] == 34000


# ---------------------------------------------------------------------------
# Personal records
# ---------------------------------------------------------------------------


def test_personal_records() -> None:
    now = datetime(2026, 3, 24, 12, 0, 0, tzinfo=timezone.utc)
    runs = [
        _make_run("2026-03-24T08:00:00Z", distance=5000, duration=1800, pace=360.0),
        _make_run("2026-03-24T09:00:00Z", distance=15000, duration=5400, pace=360.0),
        _make_run("2026-03-17T08:00:00Z", distance=3000, duration=900, pace=300.0),
    ]
    stats = compute_stats(runs, now)

    pr = stats["personalRecords"]
    assert pr["longestRunMeters"] == 15000
    assert pr["fastestPaceSecondsPerKm"] == 300.0
    # Week of March 23: 20000m (two runs)
    assert pr["mostDistanceInWeekMeters"] == 20000
    # Week of March 23 has 2 runs
    assert pr["mostRunsInWeek"] == 2


# ---------------------------------------------------------------------------
# Weekly and monthly distances
# ---------------------------------------------------------------------------


def test_weekly_distances_ordering() -> None:
    now = datetime(2026, 3, 24, 12, 0, 0, tzinfo=timezone.utc)
    runs = [
        _make_run("2026-03-24T08:00:00Z", distance=5000, duration=1800),
        _make_run("2026-03-10T08:00:00Z", distance=3000, duration=1200),
    ]
    stats = compute_stats(runs, now)

    weekly = stats["weeklyDistances"]
    assert len(weekly) == 8
    # Should be oldest first
    assert weekly[0]["weekStart"] < weekly[-1]["weekStart"]
    # Last entry (current week) should have 5000
    assert weekly[-1]["distanceMeters"] == 5000


def test_monthly_distances_ordering() -> None:
    now = datetime(2026, 3, 24, 12, 0, 0, tzinfo=timezone.utc)
    runs = [
        _make_run("2026-03-24T08:00:00Z", distance=5000, duration=1800),
        _make_run("2026-01-15T08:00:00Z", distance=7000, duration=2800),
    ]
    stats = compute_stats(runs, now)

    monthly = stats["monthlyDistances"]
    assert len(monthly) == 6
    # Should be oldest first
    assert monthly[0]["month"] < monthly[-1]["month"]
    # Last entry (March 2026) should have 5000
    assert monthly[-1]["distanceMeters"] == 5000


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------


def test_planned_runs_excluded_from_stats() -> None:
    now = datetime(2026, 3, 24, 12, 0, 0, tzinfo=timezone.utc)
    runs = [
        _make_run("2026-03-24T08:00:00Z", distance=5000, duration=1800, status="planned"),
        _make_run("2026-03-24T09:00:00Z", distance=3000, duration=1200, status="completed"),
    ]
    stats = compute_stats(runs, now)

    assert stats["allTime"]["totalRuns"] == 1
    assert stats["allTime"]["totalDistanceMeters"] == 3000
    assert stats["currentWeek"]["runCount"] == 1


def test_run_with_missing_distance() -> None:
    now = datetime(2026, 3, 24, 12, 0, 0, tzinfo=timezone.utc)
    run = {
        "runId": "ABC",
        "status": "completed",
        "runDate": "2026-03-24T08:00:00Z",
        "durationSeconds": 1800,
    }
    stats = compute_stats([run], now)

    assert stats["allTime"]["totalRuns"] == 1
    assert stats["allTime"]["totalDistanceMeters"] == 0
    assert stats["currentWeek"]["avgPaceSecondsPerKm"] == 0.0


def test_run_with_invalid_date_skipped() -> None:
    now = datetime(2026, 3, 24, 12, 0, 0, tzinfo=timezone.utc)
    run = {
        "runId": "ABC",
        "status": "completed",
        "runDate": "not-a-date",
        "distanceMeters": 5000,
        "durationSeconds": 1800,
    }
    stats = compute_stats([run], now)

    # Run counts in allTime but not in any period
    assert stats["allTime"]["totalRuns"] == 1
    assert stats["currentWeek"]["runCount"] == 0
    assert stats["personalRecords"]["longestRunMeters"] == 5000


def test_week_boundary_monday() -> None:
    """Run on Sunday should be in the previous week, not current."""
    # March 24, 2026 is Tuesday. Week starts Monday March 23.
    now = datetime(2026, 3, 24, 12, 0, 0, tzinfo=timezone.utc)
    # March 22 is Sunday — belongs to previous week (March 16-22)
    runs = [_make_run("2026-03-22T23:59:00Z", distance=5000, duration=1800)]
    stats = compute_stats(runs, now)

    assert stats["currentWeek"]["runCount"] == 0
    assert stats["previousWeek"]["runCount"] == 1


def test_month_boundary() -> None:
    """Run on last day of previous month should be in previous month."""
    now = datetime(2026, 3, 1, 12, 0, 0, tzinfo=timezone.utc)
    runs = [_make_run("2026-02-28T23:59:00Z", distance=5000, duration=1800)]
    stats = compute_stats(runs, now)

    assert stats["currentMonth"]["runCount"] == 0
    assert stats["previousMonth"]["runCount"] == 1


def test_avg_pace_with_zero_distance() -> None:
    """Avg pace should be 0 when total distance is 0."""
    now = datetime(2026, 3, 24, 12, 0, 0, tzinfo=timezone.utc)
    run = {
        "runId": "ABC",
        "status": "completed",
        "runDate": "2026-03-24T08:00:00Z",
        "distanceMeters": 0,
        "durationSeconds": 1800,
    }
    stats = compute_stats([run], now)
    assert stats["currentWeek"]["avgPaceSecondsPerKm"] == 0.0


def test_run_without_pace_in_personal_records() -> None:
    """Runs without paceSecondsPerKm shouldn't affect fastest pace."""
    now = datetime(2026, 3, 24, 12, 0, 0, tzinfo=timezone.utc)
    runs = [
        _make_run("2026-03-24T08:00:00Z", distance=5000, duration=1800, pace=None),
        _make_run("2026-03-24T09:00:00Z", distance=3000, duration=1200, pace=400.0),
    ]
    stats = compute_stats(runs, now)
    assert stats["personalRecords"]["fastestPaceSecondsPerKm"] == 400.0


# ---------------------------------------------------------------------------
# Data layer test for list_all_runs pagination
# ---------------------------------------------------------------------------


@patch("data.runs.get_table")
def test_list_all_runs_pagination(mock_get_table: object) -> None:
    from data.runs import list_all_runs

    mock_table = type("MockTable", (), {})()

    call_count = 0

    def mock_query(**kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return {
                "Items": [
                    {"userId": "u1", "sk": "RUN#A", "distanceMeters": 5000},
                ],
                "LastEvaluatedKey": {"userId": "u1", "sk": "RUN#A"},
            }
        return {
            "Items": [
                {"userId": "u1", "sk": "RUN#B", "distanceMeters": 3000},
            ],
        }

    mock_table.query = mock_query
    mock_get_table.return_value = mock_table

    result = list_all_runs("u1")
    assert len(result) == 2
    assert result[0]["runId"] == "A"
    assert result[1]["runId"] == "B"
    assert call_count == 2
