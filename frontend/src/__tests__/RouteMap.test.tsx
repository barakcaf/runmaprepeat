import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeAll } from "vitest";
import { RouteMap } from "../components/Map/RouteMap";
import type { Coordinate } from "../types/run";

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
});

const validRoute: Coordinate[] = [
  [-0.1278, 51.5074],
  [-0.1372, 51.5155],
];

describe("RouteMap", () => {
  it("renders route-map container when given valid route (>=2 coords)", () => {
    render(<RouteMap route={validRoute} />);
    expect(screen.getByTestId("route-map")).toBeInTheDocument();
  });

  it("returns null when route is empty", () => {
    const { container } = render(<RouteMap route={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("passes height prop to container style", () => {
    render(<RouteMap route={validRoute} height="300px" />);
    const el = screen.getByTestId("route-map");
    expect(el.style.height).toBe("300px");
  });

  it("uses default 200px height when no height prop", () => {
    render(<RouteMap route={validRoute} />);
    const el = screen.getByTestId("route-map");
    expect(el.style.height).toBe("200px");
  });
});
