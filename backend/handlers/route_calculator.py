"""Lambda handler for route calculation via AWS Location Service."""

from __future__ import annotations

import json
import logging
import os
from typing import Any

import boto3

from handlers.utils.validation import get_user_id

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": os.environ["ALLOWED_ORIGIN"],
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
}

MIN_WAYPOINTS = 2
MAX_WAYPOINTS = 25
MIN_LNG = -180.0
MAX_LNG = 180.0
MIN_LAT = -90.0
MAX_LAT = 90.0

location_client = boto3.client("location")


def _validate_waypoints(body: dict[str, Any]) -> list[str]:
    """Validate the waypoints field from the request body."""
    errors: list[str] = []
    waypoints = body.get("waypoints")

    if not isinstance(waypoints, list):
        return ["waypoints must be an array"]

    if len(waypoints) < MIN_WAYPOINTS:
        return [f"At least {MIN_WAYPOINTS} waypoints are required"]
    if len(waypoints) > MAX_WAYPOINTS:
        return [f"At most {MAX_WAYPOINTS} waypoints are allowed"]

    for i, wp in enumerate(waypoints):
        if not isinstance(wp, list) or len(wp) != 2:
            errors.append(f"waypoints[{i}] must be [lng, lat]")
            continue
        lng, lat = wp
        if not isinstance(lng, (int, float)) or not isinstance(lat, (int, float)):
            errors.append(f"waypoints[{i}] must contain numbers")
            continue
        if lng < MIN_LNG or lng > MAX_LNG:
            errors.append(f"waypoints[{i}] lng must be between {MIN_LNG} and {MAX_LNG}")
        if lat < MIN_LAT or lat > MAX_LAT:
            errors.append(f"waypoints[{i}] lat must be between {MIN_LAT} and {MAX_LAT}")

    return errors


def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """Handle POST /routes/calculate requests."""
    http_method = event.get("httpMethod", "")

    if http_method == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    user_id = get_user_id(event)
    if not user_id:
        return _error(401, "Unauthorized")

    if http_method != "POST":
        return _error(405, "Method not allowed")

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return _error(400, "Invalid JSON body")

    errors = _validate_waypoints(body)
    if errors:
        return _error(400, "; ".join(errors))

    waypoints = body["waypoints"]

    try:
        result = location_client.calculate_route(
            CalculatorName=os.environ["ROUTE_CALCULATOR_NAME"],
            DeparturePosition=waypoints[0],
            DestinationPosition=waypoints[-1],
            WaypointPositions=waypoints[1:-1] if len(waypoints) > 2 else [],
            TravelMode="Walking",
        )

        geometry: list[list[float]] = []
        for leg in result.get("Legs", []):
            leg_geometry = leg.get("Geometry", {}).get("LineString", [])
            if geometry and leg_geometry:
                leg_geometry = leg_geometry[1:]
            geometry.extend(leg_geometry)

        distance_meters = result["Summary"]["Distance"] * 1000

        return _success({
            "geometry": geometry,
            "distanceMeters": round(distance_meters, 1),
        })
    except Exception:
        logger.exception("Route calculation failed")
        return _error(500, "Route calculation failed")


def _success(data: Any, status_code: int = 200) -> dict[str, Any]:
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": json.dumps(data),
    }


def _error(status_code: int, message: str) -> dict[str, Any]:
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": json.dumps({"error": message}),
    }
