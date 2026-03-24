"""Data access layer for user profiles."""

from __future__ import annotations

import logging
from decimal import Decimal
from typing import Any

from data.table import get_table

logger = logging.getLogger(__name__)

SK_PROFILE = "PROFILE"


def _convert_decimals(obj: Any) -> Any:
    """Convert DynamoDB Decimal types to int/float for JSON serialization."""
    if isinstance(obj, Decimal):
        return int(obj) if obj == int(obj) else float(obj)
    if isinstance(obj, dict):
        return {k: _convert_decimals(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_convert_decimals(i) for i in obj]
    return obj


def get_profile(user_id: str) -> dict[str, Any] | None:
    """Get user profile from DynamoDB."""
    table = get_table()
    response = table.get_item(Key={"userId": user_id, "sk": SK_PROFILE})
    item = response.get("Item")
    if item:
        item.pop("userId", None)
        item.pop("sk", None)
        item = _convert_decimals(item)
    return item


def put_profile(user_id: str, profile_data: dict[str, Any]) -> dict[str, Any]:
    """Create or update user profile in DynamoDB."""
    table = get_table()
    item = {
        "userId": user_id,
        "sk": SK_PROFILE,
        **profile_data,
    }
    table.put_item(Item=item)
    item.pop("userId", None)
    item.pop("sk", None)
    return _convert_decimals(item)
