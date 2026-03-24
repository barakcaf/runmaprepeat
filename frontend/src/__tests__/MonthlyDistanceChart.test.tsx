import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeAll } from "vitest";
import { createElement, type ReactNode } from "react";
import { toChartData, MonthlyDistanceChart } from "../components/Dashboard/MonthlyDistanceChart";
import type { MonthlyDistance } from "../types/stats";

// Mock recharts to avoid rendering SVG in jsdom
beforeAll(() => {
  vi.mock("recharts", () => ({
    ResponsiveContainer: ({ children }: { children: ReactNode }) =>
      createElement("div", { "data-testid": "responsive-container" }, children),
    BarChart: ({ children, data }: { children: ReactNode; data: unknown[] }) =>
      createElement("div", { "data-testid": "bar-chart", "data-count": data.length }, children),
    Bar: ({ children }: { children: ReactNode }) =>
      createElement("div", { "data-testid": "bar" }, children),
    XAxis: () => createElement("div", { "data-testid": "x-axis" }),
    YAxis: () => createElement("div", { "data-testid": "y-axis" }),
    Tooltip: () => createElement("div", { "data-testid": "tooltip" }),
    Cell: ({ fill }: { fill: string }) =>
      createElement("div", { "data-testid": "cell", "data-fill": fill }),
  }));
});

describe("toChartData", () => {
  it("converts monthly distances to chart data points", () => {
    const input: MonthlyDistance[] = [
      { month: "2026-01", distanceMeters: 42195 },
      { month: "2026-02", distanceMeters: 21000 },
      { month: "2026-03", distanceMeters: 10500 },
    ];

    const result = toChartData(input);

    expect(result).toEqual([
      { label: "Jan", month: "2026-01", distanceKm: 42.2 },
      { label: "Feb", month: "2026-02", distanceKm: 21 },
      { label: "Mar", month: "2026-03", distanceKm: 10.5 },
    ]);
  });

  it("returns empty array for empty input", () => {
    expect(toChartData([])).toEqual([]);
  });

  it("handles zero distance", () => {
    const input: MonthlyDistance[] = [{ month: "2026-06", distanceMeters: 0 }];
    const result = toChartData(input);
    expect(result[0].distanceKm).toBe(0);
    expect(result[0].label).toBe("Jun");
  });

  it("converts all 12 months correctly", () => {
    const input: MonthlyDistance[] = Array.from({ length: 12 }, (_, i) => ({
      month: `2025-${String(i + 1).padStart(2, "0")}`,
      distanceMeters: 1000,
    }));
    const result = toChartData(input);
    const labels = result.map((d) => d.label);
    expect(labels).toEqual([
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ]);
  });
});

describe("MonthlyDistanceChart component", () => {
  it("renders empty state when no data", () => {
    render(<MonthlyDistanceChart monthlyDistances={[]} />);
    expect(screen.getByTestId("monthly-chart-empty")).toHaveTextContent("No monthly data yet");
  });

  it("renders chart when data is provided", () => {
    const data: MonthlyDistance[] = [
      { month: "2026-01", distanceMeters: 5000 },
      { month: "2026-02", distanceMeters: 8000 },
    ];
    render(<MonthlyDistanceChart monthlyDistances={data} />);
    expect(screen.getByTestId("monthly-distance-chart")).toBeInTheDocument();
    expect(screen.getByTestId("bar-chart")).toHaveAttribute("data-count", "2");
  });

  it("highlights current month with different color", () => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prevMonth = now.getMonth() === 0
      ? `${now.getFullYear() - 1}-12`
      : `${now.getFullYear()}-${String(now.getMonth()).padStart(2, "0")}`;

    const data: MonthlyDistance[] = [
      { month: prevMonth, distanceMeters: 5000 },
      { month: currentMonth, distanceMeters: 8000 },
    ];
    render(<MonthlyDistanceChart monthlyDistances={data} />);

    const cells = screen.getAllByTestId("cell");
    expect(cells).toHaveLength(2);
    // Current month should have a different fill than non-current
    const fills = cells.map((c) => c.getAttribute("data-fill"));
    expect(fills[0]).not.toBe(fills[1]);
  });
});
