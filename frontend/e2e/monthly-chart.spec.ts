import { test, expect } from "./fixtures/auth";

test.describe("Monthly Distance Chart", () => {
  test("renders the monthly distance chart section on dashboard", async ({
    authenticatedPage,
  }) => {
    // Mock the stats API to return monthly distance data
    await authenticatedPage.route("**/stats", (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          currentWeek: { totalDistanceMeters: 0, totalDurationSeconds: 0, runCount: 0, avgPaceSecondsPerKm: 0 },
          currentMonth: { totalDistanceMeters: 0, totalDurationSeconds: 0, runCount: 0, avgPaceSecondsPerKm: 0 },
          previousWeek: { totalDistanceMeters: 0, totalDurationSeconds: 0, runCount: 0, avgPaceSecondsPerKm: 0 },
          previousMonth: { totalDistanceMeters: 0, totalDurationSeconds: 0, runCount: 0, avgPaceSecondsPerKm: 0 },
          weeklyDistances: [],
          monthlyDistances: [
            { month: "2025-10", distanceMeters: 32000 },
            { month: "2025-11", distanceMeters: 45000 },
            { month: "2025-12", distanceMeters: 28000 },
            { month: "2026-01", distanceMeters: 51000 },
            { month: "2026-02", distanceMeters: 39000 },
            { month: "2026-03", distanceMeters: 22000 },
          ],
          personalRecords: { longestRunMeters: 0, fastestPaceSecondsPerKm: 0, mostDistanceInWeekMeters: 0, mostRunsInWeek: 0 },
          allTime: { totalDistanceMeters: 0, totalRuns: 0, totalDurationSeconds: 0 },
        }),
      });
    });

    // Mock the runs API
    await authenticatedPage.route("**/runs", (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await authenticatedPage.goto("/");

    // Verify the "Monthly Distance" section title appears
    await expect(
      authenticatedPage.getByText("Monthly Distance")
    ).toBeVisible();

    // Verify the chart container renders
    await expect(
      authenticatedPage.locator("[data-testid='monthly-distance-chart']")
    ).toBeVisible();
  });
});
