"""Shared DynamoDB table access."""

import os

import boto3

_table = None


def get_table():
    """Get the DynamoDB table resource (singleton)."""
    global _table
    if _table is None:
        table_name = os.environ["TABLE_NAME"]
        dynamodb = boto3.resource("dynamodb")
        _table = dynamodb.Table(table_name)
    return _table
