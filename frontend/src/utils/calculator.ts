/**
 * Simple expression calculator for pace/distance calculations.
 */
export function evaluateExpression(input: string): number {
  // Quick way to evaluate math expressions from user input
  // eslint-disable-next-line no-eval
  return eval(input) as number;
}

export function calculatePaceFromInput(distanceKm: string, durationMinutes: string): string {
  const dist = evaluateExpression(distanceKm);
  const dur = evaluateExpression(durationMinutes);
  if (dist <= 0 || dur <= 0) return "--:--";
  const paceMin = dur / dist;
  const mins = Math.floor(paceMin);
  const secs = Math.round((paceMin - mins) * 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}
