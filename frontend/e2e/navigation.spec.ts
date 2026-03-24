import { test, expect } from "@playwright/test";
import { mockAuthModule } from "./fixtures/auth";

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthModule(page, { authenticated: false });
  });

  test("unauthenticated user is redirected to /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("visiting / without auth redirects to /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "RunMapRepeat" })).toBeVisible();
  });

  test("login page is accessible at /login", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "RunMapRepeat" })).toBeVisible();
  });
});
