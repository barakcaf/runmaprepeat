"""Calorie calculation using MET (Metabolic Equivalent of Task) values."""

import logging

logger = logging.getLogger(__name__)

RUNNING_MET = 9.8


def calculate_calories(weight_kg: float, duration_seconds: int) -> int:
    """Calculate calories burned during a run.

    Formula: calories = weight_kg × MET × duration_hours
    Uses MET=9.8 for running (general).

    Args:
        weight_kg: Runner's weight in kilograms.
        duration_seconds: Duration of the run in seconds.

    Returns:
        Estimated calories burned, rounded to nearest integer.
    """
    if weight_kg <= 0 or duration_seconds <= 0:
        logger.warning(
            "Invalid input for calorie calculation",
            extra={"weight_kg": weight_kg, "duration_seconds": duration_seconds},
        )
        return 0

    duration_hours = duration_seconds / 3600
    calories = weight_kg * RUNNING_MET * duration_hours
    return round(calories)
