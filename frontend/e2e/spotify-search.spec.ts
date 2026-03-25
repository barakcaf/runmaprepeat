import { test, expect } from "./fixtures/auth";

test.describe("Spotify search selection", () => {
  test("selecting a Spotify result displays the chip", async ({
    authenticatedPage,
  }) => {
    // Mock the Spotify search API response
    await authenticatedPage.route("**/api/spotify/search?*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          artists: [
            {
              spotifyId: "artist-123",
              name: "Daft Punk",
              imageUrl: "https://i.scdn.co/image/test.jpg",
              spotifyUrl: "https://open.spotify.com/artist/artist-123",
              type: "artist",
              source: "spotify",
            },
          ],
          albums: [],
          tracks: [],
        }),
      });
    });

    await authenticatedPage.goto("/runs/new");

    // Wait for page to load
    await expect(
      authenticatedPage.getByRole("heading", { name: /new run/i })
    ).toBeVisible({ timeout: 10000 });

    // Find the Spotify search input
    const searchInput = authenticatedPage.getByPlaceholder(
      /search for artists, albums, or tracks/i
    );
    await expect(searchInput).toBeVisible();

    // Type a search query
    await searchInput.fill("Daft Punk");

    // Wait for dropdown to appear
    const dropdown = authenticatedPage.getByTestId("spotify-dropdown");
    await expect(dropdown).toBeVisible({ timeout: 5000 });

    // Click the first result
    const firstResult = dropdown.getByRole("option").first();
    await expect(firstResult).toBeVisible();
    await firstResult.click();

    // Verify the chip is displayed with the selected item
    const chip = authenticatedPage.getByTestId("spotify-chip");
    await expect(chip).toBeVisible();
    await expect(chip).toContainText("Daft Punk");
  });

  test("selecting a track result displays chip with artist name", async ({
    authenticatedPage,
  }) => {
    // Mock the Spotify search API response with a track
    await authenticatedPage.route("**/api/spotify/search?*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          artists: [],
          albums: [],
          tracks: [
            {
              spotifyId: "track-456",
              name: "Around the World",
              artistName: "Daft Punk",
              albumName: "Homework",
              imageUrl: "https://i.scdn.co/image/track.jpg",
              spotifyUrl: "https://open.spotify.com/track/track-456",
              type: "track",
              source: "spotify",
            },
          ],
        }),
      });
    });

    await authenticatedPage.goto("/runs/new");

    // Wait for page to load
    await expect(
      authenticatedPage.getByRole("heading", { name: /new run/i })
    ).toBeVisible({ timeout: 10000 });

    // Find the Spotify search input
    const searchInput = authenticatedPage.getByPlaceholder(
      /search for artists, albums, or tracks/i
    );
    await expect(searchInput).toBeVisible();

    // Type a search query
    await searchInput.fill("Around the World");

    // Wait for dropdown to appear
    const dropdown = authenticatedPage.getByTestId("spotify-dropdown");
    await expect(dropdown).toBeVisible({ timeout: 5000 });

    // Click the result
    const result = dropdown.getByRole("option").first();
    await expect(result).toBeVisible();
    await result.click();

    // Verify the chip displays both track name and artist
    const chip = authenticatedPage.getByTestId("spotify-chip");
    await expect(chip).toBeVisible();
    await expect(chip).toContainText("Around the World");
    await expect(chip).toContainText("Daft Punk");
  });

  test("chip can be removed", async ({ authenticatedPage }) => {
    // Mock the Spotify search API response
    await authenticatedPage.route("**/api/spotify/search?*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          artists: [
            {
              spotifyId: "artist-123",
              name: "Test Artist",
              imageUrl: "https://i.scdn.co/image/test.jpg",
              spotifyUrl: "https://open.spotify.com/artist/artist-123",
              type: "artist",
              source: "spotify",
            },
          ],
          albums: [],
          tracks: [],
        }),
      });
    });

    await authenticatedPage.goto("/runs/new");

    // Wait for page to load
    await expect(
      authenticatedPage.getByRole("heading", { name: /new run/i })
    ).toBeVisible({ timeout: 10000 });

    // Search and select
    const searchInput = authenticatedPage.getByPlaceholder(
      /search for artists, albums, or tracks/i
    );
    await searchInput.fill("Test Artist");

    const dropdown = authenticatedPage.getByTestId("spotify-dropdown");
    await expect(dropdown).toBeVisible({ timeout: 5000 });

    await dropdown.getByRole("option").first().click();

    // Verify chip is visible
    const chip = authenticatedPage.getByTestId("spotify-chip");
    await expect(chip).toBeVisible();

    // Click remove button
    const removeButton = chip.getByRole("button", { name: /remove audio/i });
    await removeButton.click();

    // Verify chip is no longer visible and search input is back
    await expect(chip).not.toBeVisible();
    await expect(searchInput).toBeVisible();
  });
});
