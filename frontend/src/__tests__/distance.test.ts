import { describe, it, expect } from "vitest";
import { calculateRouteDistance, formatDistance } from "../utils/distance";

describe("calculateRouteDistance", () => {
  it("returns 0 for empty array", () => {
    expect(calculateRouteDistance([])).toBe(0);
  });

  it("returns 0 for a single point", () => {
    expect(calculateRouteDistance([[34.7818, 32.0853]])).toBe(0);
  });

  it("calculates distance between two known points", () => {
    // Tel Aviv to Jerusalem is approximately 54 km
    const telAviv: [number, number] = [34.7818, 32.0853];
    const jerusalem: [number, number] = [35.2137, 31.7683];
    const distance = calculateRouteDistance([telAviv, jerusalem]);

    expect(distance).toBeGreaterThan(50_000);
    expect(distance).toBeLessThan(60_000);
  });

  it("sums distances for multiple segments", () => {
    const pointA: [number, number] = [34.7818, 32.0853];
    const pointB: [number, number] = [34.7900, 32.0900];
    const pointC: [number, number] = [34.8000, 32.0950];

    const ab = calculateRouteDistance([pointA, pointB]);
    const bc = calculateRouteDistance([pointB, pointC]);
    const abc = calculateRouteDistance([pointA, pointB, pointC]);

    expect(abc).toBeCloseTo(ab + bc, 5);
  });

  it("handles identical consecutive points", () => {
    const point: [number, number] = [34.7818, 32.0853];
    expect(calculateRouteDistance([point, point])).toBe(0);
  });
});

describe("formatDistance", () => {
  it("formats meters as km with 2 decimal places", () => {
    expect(formatDistance(0)).toBe("0.00 km");
    expect(formatDistance(1000)).toBe("1.00 km");
    expect(formatDistance(1500)).toBe("1.50 km");
    expect(formatDistance(12345)).toBe("12.35 km");
  });

  it("formats small distances", () => {
    expect(formatDistance(50)).toBe("0.05 km");
    expect(formatDistance(1)).toBe("0.00 km");
  });
});
