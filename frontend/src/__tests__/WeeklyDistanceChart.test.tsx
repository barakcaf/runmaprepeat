import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeAll } from "vitest";
import { WeeklyDistanceChart } from "../components/Dashboard/WeeklyDistanceChart";
import type { WeeklyDistance } from "../types/stats";

beforeAll(() => {
  vi.mock("recharts", async () => {
    const React = await import("react");
    return {
      ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
        React.createElement("div", { "data-testid": "responsive-container" }, children),
      BarChart: ({ children, data }: { children: React.ReactNode; data: unknown[] }) =>
        React.createElement("div", { "data-testid": "bar-chart", "data-bar-count": String(data.length) }, children),
      Bar: () => React.createElement("div"),
      XAxis: () => React.createElement("div"),
      YAxis: () => React.createElement("div"),
      Tooltip: () => React.createElement("div"),
      Cell: () => React.createElement("div"),
    };
  });
});

describe("WeeklyDistanceChart", () => {
  it("renders the chart section with title", () => {
    render(<WeeklyDistanceChart weeklyDistances={[]} />);
    expect(screen.getByTestId("weekly-distance-chart")).toBeInTheDocument();
    expect(screen.getByText("Weekly Distance")).toBeInTheDocument();
  });

  it("renders a responsive container and bar chart", () => {
    render(<WeeklyDistanceChart weeklyDistances={[]} />);
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
  });

  it("passes 8 bars to the chart", () => {
    render(<WeeklyDistanceChart weeklyDistances={[]} />);
    const chart = screen.getByTestId("bar-chart");
    expect(chart.getAttribute("data-bar-count")).toBe("8");
  });

  it("handles provided weekly distances", () => {
    const distances: WeeklyDistance[] = [
      { weekStart: "2026-03-23", distanceMeters: 5000 },
      { weekStart: "2026-03-16", distanceMeters: 8000 },
    ];
    render(<WeeklyDistanceChart weeklyDistances={distances} />);
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
  });
});
