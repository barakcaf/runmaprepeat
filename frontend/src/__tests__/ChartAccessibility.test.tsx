import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import axe from "axe-core";
import { ChartAccessibility } from "../components/ui/ChartAccessibility";

describe("ChartAccessibility", () => {
  const columns = ["Week", "Distance (km)", "Runs"];
  const data: (string | number)[][] = [
    ["Week 1", 15.2, 3],
    ["Week 2", 20.5, 4],
    ["Week 3", 18.0, 3],
  ];

  it("renders children (the chart)", () => {
    render(
      <ChartAccessibility label="Weekly distance" columns={columns} data={data}>
        <div data-testid="chart">Chart content</div>
      </ChartAccessibility>
    );
    expect(screen.getByTestId("chart")).toBeInTheDocument();
  });

  it("renders a hidden data table", () => {
    render(
      <ChartAccessibility label="Weekly distance" columns={columns} data={data}>
        <div>Chart</div>
      </ChartAccessibility>
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("renders table caption from label prop", () => {
    render(
      <ChartAccessibility label="Weekly distance" columns={columns} data={data}>
        <div>Chart</div>
      </ChartAccessibility>
    );
    expect(screen.getByText("Weekly distance")).toBeInTheDocument();
  });

  it("renders column headers", () => {
    render(
      <ChartAccessibility label="Stats" columns={columns} data={data}>
        <div>Chart</div>
      </ChartAccessibility>
    );
    expect(screen.getByText("Week")).toBeInTheDocument();
    expect(screen.getByText("Distance (km)")).toBeInTheDocument();
    expect(screen.getByText("Runs")).toBeInTheDocument();
  });

  it("renders data rows", () => {
    render(
      <ChartAccessibility label="Stats" columns={columns} data={data}>
        <div>Chart</div>
      </ChartAccessibility>
    );
    expect(screen.getByText("Week 1")).toBeInTheDocument();
    expect(screen.getByText("15.2")).toBeInTheDocument();
    expect(screen.getByText("Week 3")).toBeInTheDocument();
  });

  it("renders correct number of rows", () => {
    render(
      <ChartAccessibility label="Stats" columns={columns} data={data}>
        <div>Chart</div>
      </ChartAccessibility>
    );
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(4);
  });

  it("wraps table in VisuallyHidden", () => {
    render(
      <ChartAccessibility label="Stats" columns={columns} data={data}>
        <div>Chart</div>
      </ChartAccessibility>
    );
    const table = screen.getByRole("table");
    const wrapper = table.closest(".visuallyHidden");
    expect(wrapper).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <ChartAccessibility label="Weekly distance" columns={columns} data={data}>
        <div>Chart</div>
      </ChartAccessibility>
    );
    const results = await axe.run(container);
    expect(results.violations).toHaveLength(0);
  });
});
