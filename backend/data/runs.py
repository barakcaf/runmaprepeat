"""Data access layer for run records."""

from __future__ import annotations

import logging
from decimal import Decimal
from typing import Any

from boto3.dynamodb.conditions import Key

from data.table import get_table

logger = logging.getLogger(__name__)

SK_PREFIX = "RUN#"


def _convert_decimals(obj: Any) -> Any:
    """Convert DynamoDB Decimal types to int/float for JSON serialization."""
    if isinstance(obj, Decimal):
        return int(obj) if obj == int(obj) else float(obj)
    if isinstance(obj, dict):
        return {k: _convert_decimals(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_convert_decimals(i) for i in obj]
    return obj


def _convert_floats_to_decimal(obj: Any) -> Any:
    """Convert Python floats to Decimal for DynamoDB put_item compatibility."""
    if isinstance(obj, float):
        return Decimal(str(obj))
    if isinstance(obj, dict):
        return {k: _convert_floats_to_decimal(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_convert_floats_to_decimal(i) for i in obj]
    return obj


def _strip_keys(item: dict[str, Any]) -> dict[str, Any]:
    """Remove DynamoDB key attributes and extract runId from sk."""
    item = _convert_decimals(item)
    sk = item.pop("sk", "")
    item.pop("userId", None)
    item["runId"] = sk.replace(SK_PREFIX, "")
    return item


def create_run(user_id: str, run_id: str, run_data: dict[str, Any]) -> dict[str, Any]:
    """Create a new run record in DynamoDB."""
    table = get_table()
    item = {
        "userId": user_id,
        "sk": f"{SK_PREFIX}{run_id}",
        **run_data,
    }
    item = _convert_floats_to_decimal(item)
    table.put_item(Item=item)
    return _strip_keys(dict(item))


def get_run(user_id: str, run_id: str) -> dict[str, Any] | None:
    """Get a single run record from DynamoDB."""
    table = get_table()
    response = table.get_item(Key={"userId": user_id, "sk": f"{SK_PREFIX}{run_id}"})
    item = response.get("Item")
    if item is None:
        return None
    return _strip_keys(dict(item))


def list_runs(user_id: str) -> list[dict[str, Any]]:
    """List all runs for a user, sorted by sk descending (newest first)."""
    table = get_table()
    response = table.query(
        KeyConditionExpression=Key("userId").eq(user_id) & Key("sk").begins_with(SK_PREFIX),
        ScanIndexForward=False,
    )
    return [_strip_keys(dict(item)) for item in response.get("Items", [])]


def list_all_runs(user_id: str) -> list[dict[str, Any]]:
    """List all runs for a user with full pagination. Returns all items."""
    table = get_table()
    items: list[dict[str, Any]] = []
    kwargs: dict[str, Any] = {
        "KeyConditionExpression": Key("userId").eq(user_id) & Key("sk").begins_with(SK_PREFIX),
    }
    while True:
        response = table.query(**kwargs)
        items.extend(response.get("Items", []))
        last_key = response.get("LastEvaluatedKey")
        if not last_key:
            break
        kwargs["ExclusiveStartKey"] = last_key
    return [_strip_keys(dict(item)) for item in items]


def update_run(user_id: str, run_id: str, update_data: dict[str, Any]) -> dict[str, Any] | None:
    """Update an existing run record. Returns updated item or None if not found."""
    table = get_table()
    key = {"userId": user_id, "sk": f"{SK_PREFIX}{run_id}"}

    existing = table.get_item(Key=key).get("Item")
    if existing is None:
        return None

    existing.update(update_data)
    existing = _convert_floats_to_decimal(existing)
    table.put_item(Item=existing)
    return _strip_keys(dict(existing))


def delete_run(user_id: str, run_id: str) -> bool:
    """Delete a run record. Returns True if item existed."""
    table = get_table()
    key = {"userId": user_id, "sk": f"{SK_PREFIX}{run_id}"}

    existing = table.get_item(Key=key).get("Item")
    if existing is None:
        return False

    table.delete_item(Key=key)
    return True
