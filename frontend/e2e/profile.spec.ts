import { test, expect } from "./fixtures/auth";

const MOCK_PROFILE = {
  email: "test@example.com",
  displayName: "Test User",
  weightKg: 75,
  heightCm: 180,
};

function mockProfileApi(page: import("@playwright/test").Page) {
  return page.route("**/profile", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_PROFILE),
      });
    }
    if (route.request().method() === "PUT") {
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

test.describe("Profile page", () => {
  test("defaults to view mode with profile data displayed as text", async ({
    authenticatedPage: page,
  }) => {
    await mockProfileApi(page);
    await page.goto("/profile");

    await expect(page.getByTestId("view-email")).toHaveText("test@example.com");
    await expect(page.getByTestId("view-displayName")).toHaveText("Test User");
    await expect(page.getByTestId("view-heightCm")).toHaveText("180");
    await expect(page.getByTestId("view-weightKg")).toHaveText("75");

    await expect(page.getByRole("button", { name: "Edit" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign Out" })).toBeVisible();
  });

  test("view → edit → save persists changes and returns to view mode", async ({
    authenticatedPage: page,
  }) => {
    await mockProfileApi(page);
    await page.goto("/profile");

    await expect(page.getByTestId("view-displayName")).toHaveText("Test User");

    // Enter edit mode
    await page.getByRole("button", { name: "Edit" }).click();
    await expect(page.locator("#displayName")).toBeVisible();

    // Change display name
    await page.locator("#displayName").clear();
    await page.locator("#displayName").fill("Updated Name");

    // Save
    await page.getByRole("button", { name: "Save" }).click();

    // Should be back in view mode with updated value
    await expect(page.getByTestId("view-displayName")).toHaveText("Updated Name");
    await expect(page.getByText("Profile saved!")).toBeVisible();
    await expect(page.getByRole("button", { name: "Edit" })).toBeVisible();
  });

  test("view → edit → cancel discards changes and returns to view mode", async ({
    authenticatedPage: page,
  }) => {
    await mockProfileApi(page);
    await page.goto("/profile");

    await expect(page.getByTestId("view-displayName")).toHaveText("Test User");

    // Enter edit mode
    await page.getByRole("button", { name: "Edit" }).click();
    await expect(page.locator("#displayName")).toBeVisible();

    // Change display name
    await page.locator("#displayName").clear();
    await page.locator("#displayName").fill("Should Be Discarded");

    // Cancel
    await page.getByRole("button", { name: "Cancel" }).click();

    // Should be back in view mode with original value
    await expect(page.getByTestId("view-displayName")).toHaveText("Test User");
    await expect(page.getByRole("button", { name: "Edit" })).toBeVisible();
  });

  test("Sign Out button is visible in both view and edit modes", async ({
    authenticatedPage: page,
  }) => {
    await mockProfileApi(page);
    await page.goto("/profile");

    // View mode
    await expect(page.getByRole("button", { name: "Sign Out" })).toBeVisible();

    // Edit mode
    await page.getByRole("button", { name: "Edit" }).click();
    await expect(page.getByRole("button", { name: "Sign Out" })).toBeVisible();
  });
});
