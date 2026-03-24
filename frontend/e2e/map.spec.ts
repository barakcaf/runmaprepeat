import { test, expect } from "@playwright/test";

test.describe("Map component", () => {
  test.beforeEach(async ({ page }) => {
    // Mock Cognito auth so we land on the dashboard
    await page.addInitScript(() => {
      window.localStorage.setItem("__mock_auth__", "true");
    });
  });

  test("new run page renders map placeholder or map container", async ({ page }) => {
    await page.goto("/runs/new");
    // Either the map container or a loading placeholder should be visible
    const mapOrPlaceholder = page.locator('[data-testid="run-map"], [data-testid="map-placeholder"]');
    await expect(mapOrPlaceholder.first()).toBeVisible({ timeout: 10000 });
  });

  test("new run page has distance display", async ({ page }) => {
    await page.goto("/runs/new");
    // Distance overlay should be present
    const distanceEl = page.getByText(/km/i).first();
    await expect(distanceEl).toBeVisible({ timeout: 10000 });
  });

  test("new run page has undo and clear buttons", async ({ page }) => {
    await page.goto("/runs/new");
    await expect(page.getByRole("button", { name: /undo/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /clear/i })).toBeVisible({ timeout: 10000 });
  });
});
