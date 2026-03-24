import { test as base, type Page } from "@playwright/test";

/**
 * Mock the Amplify auth module so tests work without real Cognito.
 * Call this before navigating to any page.
 */
export async function mockAuthModule(
  page: Page,
  options: { authenticated: boolean; email?: string; userId?: string } = {
    authenticated: false,
  }
) {
  await page.addInitScript(
    ({ authenticated, email, userId }) => {
      // Mock @aws-amplify/auth at the window level so the app picks it up
      (window as Record<string, unknown>).__mockAuth = {
        authenticated,
        email: email ?? "test@example.com",
        userId: userId ?? "test-user-id",
      };
    },
    {
      authenticated: options.authenticated,
      email: options.email,
      userId: options.userId,
    }
  );

  // Intercept the Amplify auth module imports by mocking the network requests
  // and overriding module behavior via page.route for any Cognito API calls
  await page.route("**/cognito-idp.*", (route) => {
    const mockAuth = options.authenticated
      ? {
          AuthenticationResult: {
            AccessToken: "mock-access-token",
            IdToken: "mock-id-token",
            RefreshToken: "mock-refresh-token",
          },
        }
      : null;

    if (mockAuth) {
      return route.fulfill({
        status: 200,
        contentType: "application/x-amz-json-1.1",
        body: JSON.stringify(mockAuth),
      });
    }
    return route.fulfill({
      status: 400,
      contentType: "application/x-amz-json-1.1",
      body: JSON.stringify({
        __type: "NotAuthorizedException",
        message: "Incorrect username or password.",
      }),
    });
  });
}

/**
 * Setup an authenticated session by mocking Amplify's internal storage.
 * This makes getCurrentUser() and fetchUserAttributes() resolve with mock data.
 */
export async function setupAuthenticatedSession(
  page: Page,
  options: { email?: string; userId?: string } = {}
) {
  const email = options.email ?? "test@example.com";
  const userId = options.userId ?? "test-user-id";

  await page.addInitScript(
    ({ email, userId }) => {
      // Mock Amplify's localStorage-based auth state
      const storageKey = "CognitoIdentityServiceProvider";
      const clientId = "mock-client-id";
      const lastAuthUser = `${storageKey}.${clientId}.LastAuthUser`;
      const idTokenKey = `${storageKey}.${clientId}.${email}.idToken`;
      const accessTokenKey = `${storageKey}.${clientId}.${email}.accessToken`;

      // Create a minimal JWT-like token with user claims
      const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
      const payload = btoa(
        JSON.stringify({
          sub: userId,
          email: email,
          email_verified: true,
          token_use: "id",
        })
      );
      const mockToken = `${header}.${payload}.mock-signature`;

      localStorage.setItem(lastAuthUser, email);
      localStorage.setItem(idTokenKey, mockToken);
      localStorage.setItem(accessTokenKey, mockToken);
    },
    { email, userId }
  );

  await mockAuthModule(page, { authenticated: true, email, userId });
}

/** Extended test fixture with authenticated page helper */
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    await setupAuthenticatedSession(page);
    await use(page);
  },
});

export { expect } from "@playwright/test";
