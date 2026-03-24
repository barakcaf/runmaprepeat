"""Data access layer for user profiles."""

from __future__ import annotations

import logging
from typing import Any

from boto3.dynamodb.conditions import Key

from data.table import get_table

logger = logging.getLogger(__name__)

SK_PROFILE = "PROFILE"


def get_profile(user_id: str) -> dict[str, Any] | None:
    """Get user profile from DynamoDB."""
    table = get_table()
    response = table.get_item(Key={"userId": user_id, "sk": SK_PROFILE})
    item = response.get("Item")
    if item:
        item.pop("userId", None)
        item.pop("sk", None)
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
    return item
