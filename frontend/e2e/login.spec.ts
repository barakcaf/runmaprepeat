import { test, expect } from "@playwright/test";
import { mockAuthModule } from "./fixtures/auth";

test.describe("Login Page", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthModule(page, { authenticated: false });
  });

  test("page loads and shows RunMapRepeat title", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "RunMapRepeat" })).toBeVisible();
  });

  test("shows email and password input fields", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });

  test("shows sign in button", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("sign in button is disabled while submitting", async ({ page }) => {
    // Mock Cognito to delay the response so we can observe the disabled state
    await page.route("**/cognito-idp.*", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 400,
        contentType: "application/x-amz-json-1.1",
        body: JSON.stringify({
          __type: "NotAuthorizedException",
          message: "Incorrect username or password.",
        }),
      });
    });

    await page.goto("/login");
    await page.getByLabel("Email").fill("user@example.com");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("button", { name: "Signing in..." })).toBeDisabled();
  });

  test("shows error message on invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("user@example.com");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText(/incorrect|invalid|error/i)).toBeVisible();
  });

  test("empty form submission shows validation (required fields)", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Sign in" }).click();

    // HTML5 required attribute prevents submission — check fields are invalid
    const emailInput = page.getByLabel("Email");
    const passwordInput = page.getByLabel("Password");

    await expect(emailInput).toHaveAttribute("required", "");
    await expect(passwordInput).toHaveAttribute("required", "");
  });
});
