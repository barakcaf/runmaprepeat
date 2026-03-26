"""Lambda handler for aggregated run statistics."""

from __future__ import annotations

import os

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from data.runs import list_all_runs
from handlers.utils.validation import get_user_id

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": os.environ["ALLOWED_ORIGIN"],
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
}


def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """Handle GET /stats requests."""
    http_method = event.get("httpMethod", "")

    if http_method == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    if http_method != "GET":
        return _error(405, "Method not allowed")

    user_id = get_user_id(event)
    if not user_id:
        return _error(401, "Unauthorized")

    runs = list_all_runs(user_id)
    now = datetime.now(timezone.utc)
    stats = compute_stats(runs, now)
    return _success(stats)


def compute_stats(runs: list[dict[str, Any]], now: datetime) -> dict[str, Any]:
    """Compute aggregated statistics from a list of runs."""
    completed = [r for r in runs if r.get("status") == "completed"]

    current_week_start = _week_start(now)
    current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    prev_week_start = current_week_start - timedelta(weeks=1)
    prev_month_start = _prev_month_start(current_month_start)

    current_week_end = current_week_start + timedelta(weeks=1)
    current_month_end = _next_month_start(current_month_start)
    prev_week_end = current_week_start
    prev_month_end = current_month_start

    return {
        "currentWeek": _period_summary(completed, current_week_start, current_week_end),
        "currentMonth": _period_summary(completed, current_month_start, current_month_end),
        "previousWeek": _period_summary(completed, prev_week_start, prev_week_end),
        "previousMonth": _period_summary(completed, prev_month_start, prev_month_end),
        "weeklyDistances": _weekly_distances(completed, now, weeks=8),
        "monthlyDistances": _monthly_distances(completed, now, months=6),
        "personalRecords": _personal_records(completed),
        "allTime": _all_time(completed),
    }


def _parse_run_date(run: dict[str, Any]) -> datetime | None:
    """Parse runDate from a run dict. Returns None on failure."""
    raw = run.get("runDate")
    if not raw:
        return None
    try:
        dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except (ValueError, TypeError):
        return None


def _week_start(dt: datetime) -> datetime:
    """Return Monday 00:00 UTC for the week containing dt."""
    monday = dt - timedelta(days=dt.weekday())
    return monday.replace(hour=0, minute=0, second=0, microsecond=0)


def _prev_month_start(month_start: datetime) -> datetime:
    """Return first day of the previous month."""
    prev = month_start - timedelta(days=1)
    return prev.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _next_month_start(month_start: datetime) -> datetime:
    """Return first day of the next month."""
    if month_start.month == 12:
        return month_start.replace(year=month_start.year + 1, month=1)
    return month_start.replace(month=month_start.month + 1)


def _runs_in_period(
    runs: list[dict[str, Any]], start: datetime, end: datetime
) -> list[dict[str, Any]]:
    """Filter runs whose runDate falls within [start, end)."""
    result = []
    for run in runs:
        dt = _parse_run_date(run)
        if dt is not None and start <= dt < end:
            result.append(run)
    return result


def _period_summary(
    runs: list[dict[str, Any]], start: datetime, end: datetime
) -> dict[str, Any]:
    """Compute summary metrics for runs in a given time period."""
    period_runs = _runs_in_period(runs, start, end)
    total_distance = sum(r.get("distanceMeters", 0) for r in period_runs)
    total_duration = sum(r.get("durationSeconds", 0) for r in period_runs)
    run_count = len(period_runs)

    avg_pace = 0.0
    if total_distance > 0 and total_duration > 0:
        avg_pace = round(total_duration / (total_distance / 1000), 1)

    return {
        "totalDistanceMeters": total_distance,
        "totalDurationSeconds": total_duration,
        "runCount": run_count,
        "avgPaceSecondsPerKm": avg_pace,
    }


def _weekly_distances(
    runs: list[dict[str, Any]], now: datetime, weeks: int = 8
) -> list[dict[str, str | float]]:
    """Return distance totals for the last N weeks."""
    result = []
    current_ws = _week_start(now)
    for i in range(weeks):
        ws = current_ws - timedelta(weeks=i)
        we = ws + timedelta(weeks=1)
        period_runs = _runs_in_period(runs, ws, we)
        total = sum(r.get("distanceMeters", 0) for r in period_runs)
        result.append({
            "weekStart": ws.strftime("%Y-%m-%d"),
            "distanceMeters": total,
        })
    result.reverse()
    return result


def _monthly_distances(
    runs: list[dict[str, Any]], now: datetime, months: int = 6
) -> list[dict[str, str | float]]:
    """Return distance totals for the last N months."""
    result = []
    ms = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    for i in range(months):
        me = _next_month_start(ms)
        period_runs = _runs_in_period(runs, ms, me)
        total = sum(r.get("distanceMeters", 0) for r in period_runs)
        result.append({
            "month": ms.strftime("%Y-%m"),
            "distanceMeters": total,
        })
        ms = _prev_month_start(ms)
    result.reverse()
    return result


def _personal_records(runs: list[dict[str, Any]]) -> dict[str, Any]:
    """Compute personal records from all completed runs."""
    longest_run = 0.0
    fastest_pace = 0.0
    most_distance_in_week: float = 0.0
    most_runs_in_week = 0

    # Per-run records
    for run in runs:
        dist = run.get("distanceMeters", 0)
        if dist > longest_run:
            longest_run = dist

        pace = run.get("paceSecondsPerKm")
        if pace and pace > 0:
            if fastest_pace == 0 or pace < fastest_pace:
                fastest_pace = pace

    # Weekly aggregates
    week_distances: dict[str, float] = {}
    week_counts: dict[str, int] = {}
    for run in runs:
        dt = _parse_run_date(run)
        if dt is None:
            continue
        ws = _week_start(dt).strftime("%Y-%m-%d")
        week_distances[ws] = week_distances.get(ws, 0) + run.get("distanceMeters", 0)
        week_counts[ws] = week_counts.get(ws, 0) + 1

    if week_distances:
        most_distance_in_week = max(week_distances.values())
    if week_counts:
        most_runs_in_week = max(week_counts.values())

    return {
        "longestRunMeters": longest_run,
        "fastestPaceSecondsPerKm": fastest_pace,
        "mostDistanceInWeekMeters": most_distance_in_week,
        "mostRunsInWeek": most_runs_in_week,
    }


def _all_time(runs: list[dict[str, Any]]) -> dict[str, Any]:
    """Compute all-time totals."""
    total_distance = sum(r.get("distanceMeters", 0) for r in runs)
    total_duration = sum(r.get("durationSeconds", 0) for r in runs)
    return {
        "totalDistanceMeters": total_distance,
        "totalRuns": len(runs),
        "totalDurationSeconds": total_duration,
    }


def _success(data: Any) -> dict[str, Any]:
    return {
        "statusCode": 200,
        "headers": CORS_HEADERS,
        "body": json.dumps(data),
    }


def _error(status_code: int, message: str) -> dict[str, Any]:
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": json.dumps({"error": message}),
    }
