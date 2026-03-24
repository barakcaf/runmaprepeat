import { test, expect } from "./fixtures/auth";

test.describe("Weekly Distance Chart", () => {
  test("renders the weekly distance chart on dashboard", async ({
    authenticatedPage,
  }) => {
    // Mock the API responses so the dashboard loads successfully
    await authenticatedPage.route("**/runs", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      })
    );

    await authenticatedPage.route("**/stats", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          currentWeek: { totalDistanceMeters: 0, totalDurationSeconds: 0, runCount: 0, avgPaceSecondsPerKm: 0 },
          currentMonth: { totalDistanceMeters: 0, totalDurationSeconds: 0, runCount: 0, avgPaceSecondsPerKm: 0 },
          previousWeek: { totalDistanceMeters: 0, totalDurationSeconds: 0, runCount: 0, avgPaceSecondsPerKm: 0 },
          previousMonth: { totalDistanceMeters: 0, totalDurationSeconds: 0, runCount: 0, avgPaceSecondsPerKm: 0 },
          weeklyDistances: [
            { weekStart: "2026-03-23", distanceMeters: 5000 },
            { weekStart: "2026-03-16", distanceMeters: 8200 },
          ],
          monthlyDistances: [],
          personalRecords: { longestRunMeters: 0, fastestPaceSecondsPerKm: 0, mostDistanceInWeekMeters: 0, mostRunsInWeek: 0 },
          allTime: { totalDistanceMeters: 0, totalRuns: 0, totalDurationSeconds: 0 },
        }),
      })
    );

    await authenticatedPage.goto("/");

    // Chart section should be visible
    const chart = authenticatedPage.locator('[data-testid="weekly-distance-chart"]');
    await expect(chart).toBeVisible({ timeout: 10000 });

    // Chart title should be visible
    await expect(authenticatedPage.getByText("Weekly Distance")).toBeVisible();
  });
});
