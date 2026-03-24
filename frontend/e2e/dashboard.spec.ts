import { test, expect } from "./fixtures/auth";
import { setupAuthenticatedSession } from "./fixtures/auth";

test.describe("Dashboard (authenticated)", () => {
  test("shows welcome message when authenticated", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/");
    await expect(
      authenticatedPage.getByText(/welcome to runmaprepeat/i)
    ).toBeVisible();
  });

  test("shows sign out button when authenticated", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/");
    await expect(
      authenticatedPage.getByRole("button", { name: /sign out/i })
    ).toBeVisible();
  });

  test("shows placeholder text about runs", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/");
    await expect(
      authenticatedPage.getByText(/your runs will appear here/i)
    ).toBeVisible();
  });
});
