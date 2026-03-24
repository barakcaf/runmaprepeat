import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Dashboard } from "../pages/Dashboard";
import type { Run } from "../types/run";

const mockListRuns = vi.fn();

beforeAll(() => {
  vi.mock("maplibre-gl", () => {
    const Map = vi.fn().mockImplementation(() => ({
      on: vi.fn((_event: string, cb: () => void) => cb()),
      remove: vi.fn(),
      addSource: vi.fn(),
      addLayer: vi.fn(),
      getSource: vi.fn(),
      fitBounds: vi.fn(),
      getStyle: vi.fn().mockReturnValue({ layers: [] }),
      setLayoutProperty: vi.fn(),
    }));

    const LngLatBounds = vi.fn().mockImplementation(() => ({
      extend: vi.fn().mockReturnThis(),
    }));

    return {
      default: { Map, LngLatBounds },
      Map,
      LngLatBounds,
    };
  });

  vi.mock("../api/client", () => ({
    listRuns: (...args: unknown[]) => mockListRuns(...args),
  }));

  vi.mock("../auth/AuthProvider", () => ({
    useAuth: () => ({
      user: { email: "runner@test.com", userId: "u1" },
      isAuthenticated: true,
      isLoading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
    }),
  }));
});

const runWithRoute: Run = {
  runId: "r1",
  status: "completed",
  runDate: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  title: "Morning jog",
  route: [
    [-0.1278, 51.5074],
    [-0.1372, 51.5155],
  ],
  distanceMeters: 5000,
  durationSeconds: 1800,
};

const runWithoutRoute: Run = {
  runId: "r2",
  status: "completed",
  runDate: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  title: "Quick sprint",
  durationSeconds: 600,
};

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );
}

describe("Dashboard map integration", () => {
  beforeEach(() => {
    mockListRuns.mockReset();
  });

  it("renders RouteMap for runs with route data", async () => {
    mockListRuns.mockResolvedValue([runWithRoute]);
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByTestId("route-map")).toBeInTheDocument();
    });
  });

  it("renders 'No route' placeholder for runs without route", async () => {
    mockListRuns.mockResolvedValue([runWithoutRoute]);
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("No route")).toBeInTheDocument();
    });
  });

  it("RouteMap gets height='120px'", async () => {
    mockListRuns.mockResolvedValue([runWithRoute]);
    renderDashboard();

    await waitFor(() => {
      const mapEl = screen.getByTestId("route-map");
      expect(mapEl.style.height).toBe("120px");
    });
  });
});
