import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { StatsCards } from "../components/Dashboard/StatsCards";
import type { Stats } from "../types/stats";

const mockGetStats = vi.fn();

beforeAll(() => {
  vi.mock("../api/client", () => ({
    getStats: (...args: unknown[]) => mockGetStats(...args),
  }));
});

const mockStats: Stats = {
  currentWeek: {
    totalDistanceMeters: 15000,
    totalDurationSeconds: 5400,
    runCount: 3,
    avgPaceSecondsPerKm: 360,
  },
  previousWeek: {
    totalDistanceMeters: 10000,
    totalDurationSeconds: 4000,
    runCount: 2,
    avgPaceSecondsPerKm: 400,
  },
  currentMonth: {
    totalDistanceMeters: 50000,
    totalDurationSeconds: 18000,
    runCount: 10,
    avgPaceSecondsPerKm: 360,
  },
  previousMonth: {
    totalDistanceMeters: 40000,
    totalDurationSeconds: 16000,
    runCount: 8,
    avgPaceSecondsPerKm: 400,
  },
  weeklyDistances: [],
  monthlyDistances: [],
  personalRecords: {
    longestRunMeters: 10000,
    fastestPaceSecondsPerKm: 300,
    mostDistanceInWeekMeters: 20000,
    mostRunsInWeek: 5,
  },
  allTime: {
    totalDistanceMeters: 100000,
    totalRuns: 25,
    totalDurationSeconds: 36000,
  },
};

describe("StatsCards", () => {
  beforeEach(() => {
    mockGetStats.mockReset();
  });

  it("shows loading skeleton while fetching stats", () => {
    mockGetStats.mockReturnValue(new Promise(() => {}));
    render(<StatsCards />);
    expect(screen.getByTestId("stats-loading")).toBeInTheDocument();
  });

  it("shows empty state when all periods have zero runs", async () => {
    const emptyStats: Stats = {
      ...mockStats,
      currentWeek: { ...mockStats.currentWeek, runCount: 0, totalDistanceMeters: 0, totalDurationSeconds: 0, avgPaceSecondsPerKm: 0 },
      previousWeek: { ...mockStats.previousWeek, runCount: 0, totalDistanceMeters: 0, totalDurationSeconds: 0, avgPaceSecondsPerKm: 0 },
      currentMonth: { ...mockStats.currentMonth, runCount: 0, totalDistanceMeters: 0, totalDurationSeconds: 0, avgPaceSecondsPerKm: 0 },
      previousMonth: { ...mockStats.previousMonth, runCount: 0, totalDistanceMeters: 0, totalDurationSeconds: 0, avgPaceSecondsPerKm: 0 },
    };
    mockGetStats.mockResolvedValue(emptyStats);
    render(<StatsCards />);

    await waitFor(() => {
      expect(screen.getByTestId("stats-empty")).toBeInTheDocument();
    });
    expect(screen.getByText(/no stats yet/i)).toBeInTheDocument();
  });

  it("renders week and month period titles", async () => {
    mockGetStats.mockResolvedValue(mockStats);
    render(<StatsCards />);

    await waitFor(() => {
      expect(screen.getByTestId("stats-cards")).toBeInTheDocument();
    });
    expect(screen.getByText("This Week")).toBeInTheDocument();
    expect(screen.getByText("This Month")).toBeInTheDocument();
  });

  it("displays correct distance values", async () => {
    mockGetStats.mockResolvedValue(mockStats);
    render(<StatsCards />);

    await waitFor(() => {
      expect(screen.getByTestId("stats-cards")).toBeInTheDocument();
    });

    // 15000m = 15.0km for week, 50000m = 50.0km for month
    const distanceCards = screen.getAllByTestId("stat-card-distance");
    expect(distanceCards[0]).toHaveTextContent("15.0");
    expect(distanceCards[1]).toHaveTextContent("50.0");
  });

  it("displays correct run counts", async () => {
    mockGetStats.mockResolvedValue(mockStats);
    render(<StatsCards />);

    await waitFor(() => {
      expect(screen.getByTestId("stats-cards")).toBeInTheDocument();
    });

    const runCards = screen.getAllByTestId("stat-card-runs");
    expect(runCards[0]).toHaveTextContent("3");
    expect(runCards[1]).toHaveTextContent("10");
  });

  it("displays formatted duration", async () => {
    mockGetStats.mockResolvedValue(mockStats);
    render(<StatsCards />);

    await waitFor(() => {
      expect(screen.getByTestId("stats-cards")).toBeInTheDocument();
    });

    const timeCards = screen.getAllByTestId("stat-card-time");
    // 5400s = 1:30:00
    expect(timeCards[0]).toHaveTextContent("1:30:00");
  });

  it("displays formatted pace", async () => {
    mockGetStats.mockResolvedValue(mockStats);
    render(<StatsCards />);

    await waitFor(() => {
      expect(screen.getByTestId("stats-cards")).toBeInTheDocument();
    });

    const paceCards = screen.getAllByTestId("stat-card-pace");
    // 360 seconds/km = 6:00
    expect(paceCards[0]).toHaveTextContent("6:00");
  });

  it("shows positive comparison with up arrow for increased distance", async () => {
    mockGetStats.mockResolvedValue(mockStats);
    render(<StatsCards />);

    await waitFor(() => {
      expect(screen.getByTestId("stats-cards")).toBeInTheDocument();
    });

    // Week distance: 15000 vs 10000 = +50%
    const distanceCards = screen.getAllByTestId("stat-card-distance");
    expect(distanceCards[0]).toHaveTextContent("+50%");
  });

  it("shows comparison for runs", async () => {
    mockGetStats.mockResolvedValue(mockStats);
    render(<StatsCards />);

    await waitFor(() => {
      expect(screen.getByTestId("stats-cards")).toBeInTheDocument();
    });

    // Week runs: 3 vs 2 = +50%
    const runCards = screen.getAllByTestId("stat-card-runs");
    expect(runCards[0]).toHaveTextContent("+50%");
  });

  it("renders nothing when API returns error", async () => {
    mockGetStats.mockRejectedValue(new Error("Network error"));
    const { container } = render(<StatsCards />);

    await waitFor(() => {
      expect(screen.queryByTestId("stats-loading")).not.toBeInTheDocument();
    });

    // Should render nothing on error
    expect(screen.queryByTestId("stats-cards")).not.toBeInTheDocument();
    expect(screen.queryByTestId("stats-empty")).not.toBeInTheDocument();
  });

  it("shows 'New' when previous period has zero distance but current has data", async () => {
    const statsWithNoPrevious: Stats = {
      ...mockStats,
      previousWeek: { totalDistanceMeters: 0, totalDurationSeconds: 0, runCount: 0, avgPaceSecondsPerKm: 0 },
    };
    mockGetStats.mockResolvedValue(statsWithNoPrevious);
    render(<StatsCards />);

    await waitFor(() => {
      expect(screen.getByTestId("stats-cards")).toBeInTheDocument();
    });

    const distanceCards = screen.getAllByTestId("stat-card-distance");
    expect(distanceCards[0]).toHaveTextContent("New");
  });

  it("shows '--' for pace when avgPaceSecondsPerKm is 0", async () => {
    const statsWithZeroPace: Stats = {
      ...mockStats,
      currentWeek: { ...mockStats.currentWeek, avgPaceSecondsPerKm: 0 },
    };
    mockGetStats.mockResolvedValue(statsWithZeroPace);
    render(<StatsCards />);

    await waitFor(() => {
      expect(screen.getByTestId("stats-cards")).toBeInTheDocument();
    });

    const paceCards = screen.getAllByTestId("stat-card-pace");
    expect(paceCards[0]).toHaveTextContent("--");
  });
});
