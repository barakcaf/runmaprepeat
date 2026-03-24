import { test, expect } from "./fixtures/auth";

const mockStatsResponse = {
  currentWeek: {
    totalDistanceMeters: 15000,
    totalDurationSeconds: 5400,
    runCount: 3,
    avgPaceSecondsPerKm: 360,
  },
  previousWeek: {
    totalDistanceMeters: 10000,
    totalDurationSeconds: 4000,
    runCount: 2,
    avgPaceSecondsPerKm: 400,
  },
  currentMonth: {
    totalDistanceMeters: 50000,
    totalDurationSeconds: 18000,
    runCount: 10,
    avgPaceSecondsPerKm: 360,
  },
  previousMonth: {
    totalDistanceMeters: 40000,
    totalDurationSeconds: 16000,
    runCount: 8,
    avgPaceSecondsPerKm: 400,
  },
  weeklyDistances: [],
  monthlyDistances: [],
  personalRecords: {
    longestRunMeters: 10000,
    fastestPaceSecondsPerKm: 300,
    mostDistanceInWeekMeters: 20000,
    mostRunsInWeek: 5,
  },
  allTime: {
    totalDistanceMeters: 100000,
    totalRuns: 25,
    totalDurationSeconds: 36000,
  },
};

const emptyStatsResponse = {
  ...mockStatsResponse,
  currentWeek: { totalDistanceMeters: 0, totalDurationSeconds: 0, runCount: 0, avgPaceSecondsPerKm: 0 },
  previousWeek: { totalDistanceMeters: 0, totalDurationSeconds: 0, runCount: 0, avgPaceSecondsPerKm: 0 },
  currentMonth: { totalDistanceMeters: 0, totalDurationSeconds: 0, runCount: 0, avgPaceSecondsPerKm: 0 },
  previousMonth: { totalDistanceMeters: 0, totalDurationSeconds: 0, runCount: 0, avgPaceSecondsPerKm: 0 },
};

test.describe("Stats Cards", () => {
  test("displays stats cards with week and month data", async ({ authenticatedPage }) => {
    await authenticatedPage.route("**/stats", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockStatsResponse),
      })
    );
    await authenticatedPage.route("**/runs", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      })
    );

    await authenticatedPage.goto("/");
    const statsCards = authenticatedPage.getByTestId("stats-cards");
    await expect(statsCards).toBeVisible();
    await expect(authenticatedPage.getByText("This Week")).toBeVisible();
    await expect(authenticatedPage.getByText("This Month")).toBeVisible();
  });

  test("shows loading skeleton before stats load", async ({ authenticatedPage }) => {
    await authenticatedPage.route("**/stats", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockStatsResponse),
      });
    });
    await authenticatedPage.route("**/runs", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      })
    );

    await authenticatedPage.goto("/");
    await expect(authenticatedPage.getByTestId("stats-loading")).toBeVisible();
  });

  test("shows empty state for new user with no runs", async ({ authenticatedPage }) => {
    await authenticatedPage.route("**/stats", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(emptyStatsResponse),
      })
    );
    await authenticatedPage.route("**/runs", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      })
    );

    await authenticatedPage.goto("/");
    await expect(authenticatedPage.getByTestId("stats-empty")).toBeVisible();
    await expect(authenticatedPage.getByText(/no stats yet/i)).toBeVisible();
  });

  test("displays comparison percentages", async ({ authenticatedPage }) => {
    await authenticatedPage.route("**/stats", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockStatsResponse),
      })
    );
    await authenticatedPage.route("**/runs", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      })
    );

    await authenticatedPage.goto("/");
    await expect(authenticatedPage.getByTestId("stats-cards")).toBeVisible();
    // Week distance: 15000 vs 10000 = +50%
    const distanceCards = authenticatedPage.getByTestId("stat-card-distance").first();
    await expect(distanceCards).toContainText("+50%");
  });
});
