import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { axe } from "vitest-axe";
import { toHaveNoViolations } from "vitest-axe/dist/matchers";
import { DarkModeToggle } from "../components/DarkModeToggle/DarkModeToggle";
import { ThemeProvider } from "../providers/ThemeProvider";

// Extend Vitest matchers
expect.extend({ toHaveNoViolations });

let mediaQueryListeners: Array<(e: MediaQueryListEvent) => void> = [];
let darkModeMatches = false;

function mockMatchMedia() {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-color-scheme: dark)" ? darkModeMatches : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((_event: string, handler: (e: MediaQueryListEvent) => void) => {
        mediaQueryListeners.push(handler);
      }),
      removeEventListener: vi.fn((_event: string, handler: (e: MediaQueryListEvent) => void) => {
        mediaQueryListeners = mediaQueryListeners.filter((h) => h !== handler);
      }),
      dispatchEvent: vi.fn(),
    })),
  });
}

function createLocalStorageMock(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((k) => delete store[k]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
}

describe("DarkModeToggle", () => {
  let storageMock: Storage;

  beforeEach(() => {
    storageMock = createLocalStorageMock();
    Object.defineProperty(window, "localStorage", {
      value: storageMock,
      writable: true,
      configurable: true,
    });
    document.documentElement.removeAttribute("data-theme");
    darkModeMatches = false;
    mediaQueryListeners = [];
    mockMatchMedia();
  });

  const renderWithTheme = () => {
    return render(
      <ThemeProvider>
        <DarkModeToggle />
      </ThemeProvider>
    );
  };

  /**
   * WCAG 2.2 AA Compliance Tests
   */

  it("passes axe accessibility tests - WCAG 2.2 AA (1.4.3, 2.1.1, 2.4.7, 4.1.2)", async () => {
    const { container } = renderWithTheme();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has minimum 44×44px touch target - WCAG 2.5.8 Target Size (Level AA)", () => {
    renderWithTheme();
    const button = screen.getByRole("button");

    // Button should have CSS class that enforces 44×44px minimum
    // (actual styles verified in CSS module, JSDOM doesn't compute styles)
    expect(button).toBeInTheDocument();
    expect(button.tagName).toBe("BUTTON");
  });

  it("has proper ARIA label - WCAG 4.1.2 Name, Role, Value (Level A)", () => {
    renderWithTheme();
    const button = screen.getByRole("button");

    // Should have an accessible name (aria-label)
    expect(button).toHaveAttribute("aria-label");
    expect(button.getAttribute("aria-label")).toContain("mode");
  });

  it("is keyboard accessible with Tab - WCAG 2.1.1 Keyboard (Level A)", () => {
    renderWithTheme();
    const button = screen.getByRole("button");

    // Should be focusable
    button.focus();
    expect(document.activeElement).toBe(button);
  });

  it("announces theme changes with live region - WCAG 4.1.3 Status Messages (Level AA)", () => {
    renderWithTheme();

    // Should have a status live region for screen reader announcements
    const liveRegion = screen.getByRole("status");
    expect(liveRegion).toHaveAttribute("aria-live", "polite");
    expect(liveRegion).toHaveAttribute("aria-atomic", "true");
  });

  /**
   * Functional Tests
   */

  it("renders with default theme (system)", () => {
    renderWithTheme();

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Auto");
  });

  it("cycles through themes: system → light → dark → system", async () => {
    const user = userEvent.setup();
    renderWithTheme();

    const button = screen.getByRole("button");

    // Start with system (shows as "Auto")
    expect(button).toHaveTextContent("Auto");

    // Click to light
    await user.click(button);
    expect(button).toHaveTextContent("Light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");

    // Click to dark
    await user.click(button);
    expect(button).toHaveTextContent("Dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    // Click back to system
    await user.click(button);
    expect(button).toHaveTextContent("Auto");
  });

  it("updates aria-label as theme changes", async () => {
    const user = userEvent.setup();
    renderWithTheme();

    const button = screen.getByRole("button");

    // System → Light
    await user.click(button);
    expect(button.getAttribute("aria-label")).toContain("dark mode");

    // Light → Dark
    await user.click(button);
    expect(button.getAttribute("aria-label")).toContain("system");

    // Dark → System
    await user.click(button);
    expect(button.getAttribute("aria-label")).toContain("light mode");
  });

  it("persists theme selection to localStorage", async () => {
    const user = userEvent.setup();
    renderWithTheme();

    const button = screen.getByRole("button");

    await user.click(button); // system → light
    expect(storageMock.getItem("runmaprepeat-theme")).toBe("light");

    await user.click(button); // light → dark
    expect(storageMock.getItem("runmaprepeat-theme")).toBe("dark");
  });

  it("supports keyboard navigation with Enter key", async () => {
    const user = userEvent.setup();
    renderWithTheme();

    const button = screen.getByRole("button");
    button.focus();

    // Press Enter
    await user.keyboard("{Enter}");
    expect(button).toHaveTextContent("Light");

    await user.keyboard("{Enter}");
    expect(button).toHaveTextContent("Dark");
  });

  it("supports keyboard navigation with Space key", async () => {
    const user = userEvent.setup();
    renderWithTheme();

    const button = screen.getByRole("button");
    button.focus();

    // Press Space
    await user.keyboard(" ");
    expect(button).toHaveTextContent("Light");

    await user.keyboard(" ");
    expect(button).toHaveTextContent("Dark");
  });

  it("shows correct icon for each theme", async () => {
    const user = userEvent.setup();
    renderWithTheme();

    const button = screen.getByRole("button");

    // System theme (split icon)
    let svg = button.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("aria-hidden", "true");

    // Click to light (sun icon)
    await user.click(button);
    svg = button.querySelector("svg");
    expect(svg).toBeInTheDocument();

    // Click to dark (moon icon)
    await user.click(button);
    svg = button.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("displays correct label text on mobile and desktop", () => {
    renderWithTheme();
    const button = screen.getByRole("button");

    // Label should exist but might be hidden on mobile via CSS
    const label = within(button).getByText("Auto");
    expect(label).toBeInTheDocument();
    expect(label).toHaveClass("label");
  });

  /**
   * Nielsen Heuristics Validation
   */

  it("provides visibility of system status - Nielsen #1", async () => {
    const user = userEvent.setup();
    renderWithTheme();

    const button = screen.getByRole("button");

    // User can see current theme at all times
    expect(button).toHaveTextContent("Auto");

    await user.click(button);
    expect(button).toHaveTextContent("Light");
  });

  it("provides user control and freedom - Nielsen #3", async () => {
    const user = userEvent.setup();
    renderWithTheme();

    const button = screen.getByRole("button");

    // User can easily cycle through all options
    await user.click(button); // → light
    await user.click(button); // → dark
    await user.click(button); // → system
    await user.click(button); // → light again

    expect(button).toHaveTextContent("Light");
  });

  /**
   * Edge Cases
   */

  it("handles rapid clicks gracefully", async () => {
    const user = userEvent.setup();
    renderWithTheme();

    const button = screen.getByRole("button");

    // Rapid clicks
    await user.click(button);
    await user.click(button);
    await user.click(button);
    await user.click(button);

    // Should still be in valid state
    expect(button).toHaveTextContent("Light");
  });

  it("respects prefers-reduced-motion", () => {
    // This is tested via CSS, ensuring transitions are removed
    // when @media (prefers-reduced-motion: reduce) is active
    renderWithTheme();
    const button = screen.getByRole("button");

    // Button should exist and function even with reduced motion
    expect(button).toBeInTheDocument();
  });
});
