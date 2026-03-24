import { describe, it, expect } from "vitest";
import { buildChartData } from "../components/Dashboard/weeklyDistanceData";
import type { WeeklyDistance } from "../types/stats";

describe("buildChartData", () => {
  const referenceDate = new Date("2026-03-24T12:00:00Z"); // Tuesday

  it("returns 8 bars for the last 8 weeks", () => {
    const result = buildChartData([], referenceDate);
    expect(result).toHaveLength(8);
  });

  it("marks only the last bar as current week", () => {
    const result = buildChartData([], referenceDate);
    const currentWeekBars = result.filter((b) => b.isCurrentWeek);
    expect(currentWeekBars).toHaveLength(1);
    expect(result[7].isCurrentWeek).toBe(true);
    expect(result[0].isCurrentWeek).toBe(false);
  });

  it("fills in zero for weeks with no data", () => {
    const result = buildChartData([], referenceDate);
    for (const bar of result) {
      expect(bar.distanceKm).toBe(0);
    }
  });

  it("converts distance from meters to km", () => {
    const weeklyDistances: WeeklyDistance[] = [
      { weekStart: "2026-03-23", distanceMeters: 5000 },
    ];
    const result = buildChartData(weeklyDistances, referenceDate);
    const currentWeek = result.find((b) => b.isCurrentWeek);
    expect(currentWeek?.distanceKm).toBe(5);
  });

  it("maps data to correct week slots", () => {
    const weeklyDistances: WeeklyDistance[] = [
      { weekStart: "2026-03-16", distanceMeters: 10000 },
      { weekStart: "2026-03-23", distanceMeters: 3000 },
    ];
    const result = buildChartData(weeklyDistances, referenceDate);
    // Current week (Mar 23) = 3 km
    expect(result[7].distanceKm).toBe(3);
    // Previous week (Mar 16) = 10 km
    expect(result[6].distanceKm).toBe(10);
  });

  it("generates week labels in 'Mon D' format", () => {
    const result = buildChartData([], referenceDate);
    // Current week starts Mar 23
    expect(result[7].label).toMatch(/Mar\s+23/);
  });

  it("ignores data outside the 8-week window", () => {
    const weeklyDistances: WeeklyDistance[] = [
      { weekStart: "2025-01-01", distanceMeters: 99000 },
    ];
    const result = buildChartData(weeklyDistances, referenceDate);
    for (const bar of result) {
      expect(bar.distanceKm).toBe(0);
    }
  });

  it("rounds distance to 2 decimal places", () => {
    const weeklyDistances: WeeklyDistance[] = [
      { weekStart: "2026-03-23", distanceMeters: 1234 },
    ];
    const result = buildChartData(weeklyDistances, referenceDate);
    expect(result[7].distanceKm).toBe(1.23);
  });
});
