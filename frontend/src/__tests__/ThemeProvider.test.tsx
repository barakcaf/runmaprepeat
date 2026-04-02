import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ThemeProvider, useTheme } from "../providers/ThemeProvider";

function ThemeConsumer() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button data-testid="set-dark" onClick={() => setTheme("dark")}>Dark</button>
      <button data-testid="set-light" onClick={() => setTheme("light")}>Light</button>
      <button data-testid="set-system" onClick={() => setTheme("system")}>System</button>
    </div>
  );
}

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

const STORAGE_KEY = "runmaprepeat-theme";

function createLocalStorageMock(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { Object.keys(store).forEach((k) => delete store[k]); }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
}

describe("ThemeProvider", () => {
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

  it("defaults to system theme when no localStorage value", () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme")).toHaveTextContent("system");
    expect(screen.getByTestId("resolved")).toHaveTextContent("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("reads theme from localStorage on mount", () => {
    storageMock.setItem(STORAGE_KEY, "dark");

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("persists theme to localStorage when changed", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    await user.click(screen.getByTestId("set-dark"));

    expect(storageMock.getItem(STORAGE_KEY)).toBe("dark");
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("toggles between light and dark", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    await user.click(screen.getByTestId("set-dark"));
    expect(screen.getByTestId("resolved")).toHaveTextContent("dark");

    await user.click(screen.getByTestId("set-light"));
    expect(screen.getByTestId("resolved")).toHaveTextContent("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("resolves system theme based on media query", () => {
    darkModeMatches = true;
    mockMatchMedia();

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme")).toHaveTextContent("system");
    expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("responds to system preference changes when theme is system", async () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("resolved")).toHaveTextContent("light");

    darkModeMatches = true;
    mockMatchMedia();
    act(() => {
      for (const listener of mediaQueryListeners) {
        listener({ matches: true } as MediaQueryListEvent);
      }
    });

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("ignores invalid localStorage values", () => {
    storageMock.setItem(STORAGE_KEY, "invalid");

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme")).toHaveTextContent("system");
  });

  it("throws when useTheme is used outside ThemeProvider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<ThemeConsumer />)).toThrow(
      "useTheme must be used within a ThemeProvider"
    );
    consoleSpy.mockRestore();
  });

  it("sets data-theme attribute on html element", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    await user.click(screen.getByTestId("set-dark"));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    await user.click(screen.getByTestId("set-light"));
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });
});
