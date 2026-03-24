import { test, expect } from "./fixtures/auth";
import type { Page } from "@playwright/test";

/**
 * Mock the profile API endpoint.
 * When hasProfile=false, GET /profile returns 404.
 * When hasProfile=true, GET /profile returns a valid profile.
 * PUT /profile always succeeds and "creates" the profile.
 */
async function mockProfileApi(page: Page, options: { hasProfile: boolean }) {
  let profileCreated = options.hasProfile;

  await page.route("**/profile", (route) => {
    const method = route.request().method();

    if (method === "GET") {
      if (profileCreated) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            email: "test@example.com",
            displayName: "Test User",
            heightCm: 180,
            weightKg: 75,
          }),
        });
      }
      return route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ message: "Profile not found" }),
      });
    }

    if (method === "PUT") {
      profileCreated = true;
      const body = route.request().postDataJSON();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    }

    return route.continue();
  });
}

test.describe("Profile setup - first login flow", () => {
  test("redirects new user to /setup when no profile exists", async ({
    authenticatedPage,
  }) => {
    await mockProfileApi(authenticatedPage, { hasProfile: false });
    await authenticatedPage.goto("/");
    await expect(authenticatedPage).toHaveURL(/\/setup/);
    await expect(
      authenticatedPage.getByRole("heading", { name: /set up your profile/i })
    ).toBeVisible();
  });

  test("does not show bottom navigation on setup page", async ({
    authenticatedPage,
  }) => {
    await mockProfileApi(authenticatedPage, { hasProfile: false });
    await authenticatedPage.goto("/");
    await expect(authenticatedPage).toHaveURL(/\/setup/);
    await expect(
      authenticatedPage.getByTestId("bottom-nav")
    ).not.toBeVisible();
  });

  test("shows all required form fields on setup page", async ({
    authenticatedPage,
  }) => {
    await mockProfileApi(authenticatedPage, { hasProfile: false });
    await authenticatedPage.goto("/setup");
    await expect(
      authenticatedPage.getByLabel("Email *")
    ).toBeVisible();
    await expect(
      authenticatedPage.getByLabel("Display Name *")
    ).toBeVisible();
    await expect(
      authenticatedPage.getByLabel("Height (cm) *")
    ).toBeVisible();
    await expect(
      authenticatedPage.getByLabel("Weight (kg) *")
    ).toBeVisible();
  });

  test("redirects to dashboard after completing profile setup", async ({
    authenticatedPage,
  }) => {
    await mockProfileApi(authenticatedPage, { hasProfile: false });
    await authenticatedPage.goto("/setup");

    await authenticatedPage.getByLabel("Display Name *").fill("Test User");
    await authenticatedPage.getByLabel("Height (cm) *").fill("180");
    await authenticatedPage.getByLabel("Weight (kg) *").fill("75");

    await authenticatedPage.getByRole("button", { name: /complete setup/i }).click();

    await expect(authenticatedPage).toHaveURL("/");
  });

  test("prevents navigating to other routes without profile", async ({
    authenticatedPage,
  }) => {
    await mockProfileApi(authenticatedPage, { hasProfile: false });
    await authenticatedPage.goto("/runs/new");
    await expect(authenticatedPage).toHaveURL(/\/setup/);
  });
});

test.describe("Profile setup - returning user flow", () => {
  test("returning user with profile goes straight to dashboard", async ({
    authenticatedPage,
  }) => {
    await mockProfileApi(authenticatedPage, { hasProfile: true });
    await authenticatedPage.goto("/");
    await expect(authenticatedPage).not.toHaveURL(/\/setup/);
  });

  test("returning user redirected away from /setup", async ({
    authenticatedPage,
  }) => {
    await mockProfileApi(authenticatedPage, { hasProfile: true });
    await authenticatedPage.goto("/setup");
    await expect(authenticatedPage).not.toHaveURL(/\/setup/);
  });
});
