"""Shared CORS header helper.

Reads ALLOWED_ORIGIN at call time (not import time) so tests can set
the environment variable after importing handler modules.
"""

from __future__ import annotations

import os


def cors_headers() -> dict[str, str]:
    """Return standard CORS response headers."""
    return {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": os.environ.get("ALLOWED_ORIGIN", "*"),
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    }
