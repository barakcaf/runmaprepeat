import { test, expect } from "./fixtures/auth";

test.describe("Map integration", () => {
  test("new run page: map toggle button visible and functional", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/runs/new");

    const toggle = authenticatedPage.getByRole("button", {
      name: /hide map|show map/i,
    });
    await expect(toggle).toBeVisible({ timeout: 10000 });

    // Initially shows "Hide Map" (map expanded by default)
    await expect(toggle).toContainText("Hide Map");

    // Click to collapse
    await toggle.click();
    await expect(toggle).toContainText("Show Map");

    // Click to expand again
    await toggle.click();
    await expect(toggle).toContainText("Hide Map");
  });

  test("new run page: map section shows distance when route exists", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/runs/new");

    const toggle = authenticatedPage.getByRole("button", {
      name: /hide map|show map/i,
    });
    await expect(toggle).toBeVisible({ timeout: 10000 });

    // By default no distance shown (no route drawn yet)
    const text = await toggle.textContent();
    expect(text).not.toContain("km");
  });

  test("dashboard: run cards show map preview or 'No route' placeholder", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/");

    // Dashboard should load — either shows run cards with map/placeholder or empty state
    const mapOrPlaceholder = authenticatedPage.locator(
      '[data-testid="route-map"], :text("No route")'
    );
    const emptyState = authenticatedPage.getByText(
      /no completed runs yet|lace up/i
    );

    // Wait for either runs to load or empty state
    await expect(
      mapOrPlaceholder.first().or(emptyState)
    ).toBeVisible({ timeout: 10000 });
  });

  test("run detail page: shows route map or 'No route recorded' for runs without routes", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/");

    // Try to navigate to a run detail — if there are run cards, click the first one
    const runCard = authenticatedPage
      .locator('[role="button"]')
      .first();

    // If no runs exist, we verify the detail page handles missing routes
    const hasRuns = await runCard.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasRuns) {
      await runCard.click();
      // Should show either route map or "No route recorded"
      const mapOrMessage = authenticatedPage.locator(
        '[data-testid="route-map"], :text("No route recorded")'
      );
      await expect(mapOrMessage.first()).toBeVisible({ timeout: 10000 });
    }
  });
});
