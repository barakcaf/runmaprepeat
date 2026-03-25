/**
 * Simple expression calculator for pace/distance calculations.
 */
export function evaluateExpression(input: string): number {
  // SECURITY FIX: Validate input contains only safe arithmetic characters before evaluation
  // to prevent XSS/code injection. Only allow digits, decimal points, and basic math operators.
  const sanitized = input.replace(/\s/g, "");
  if (!/^[\d+\-*/().]+$/.test(sanitized)) {
    throw new Error("Invalid expression");
  }
  // Safe to use Function constructor after validation - input is arithmetic-only
  const result = new Function(`"use strict"; return (${sanitized});`)() as number;
  if (typeof result !== "number" || !Number.isFinite(result)) {
    throw new Error("Expression did not produce a finite number");
  }
  return result;
}

export function calculatePaceFromInput(distanceKm: string, durationMinutes: string): string {
  try {
    const dist = evaluateExpression(distanceKm);
    const dur = evaluateExpression(durationMinutes);
    if (!Number.isFinite(dist) || !Number.isFinite(dur) || dist <= 0 || dur <= 0) return "--:--";
    const paceMin = dur / dist;
    const mins = Math.floor(paceMin);
    let secs = Math.round((paceMin - mins) * 60);
    // Handle edge case where seconds round to 60
    if (secs === 60) {
      return `${mins + 1}:00`;
    }
    return `${mins}:${String(secs).padStart(2, "0")}`;
  } catch {
    return "--:--";
  }
}
