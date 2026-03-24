import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeAll } from "vitest";
import { RunMap } from "../components/Map/RunMap";

beforeAll(() => {
  vi.mock("maplibre-gl", () => {
    const Map = vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      remove: vi.fn(),
      addSource: vi.fn(),
      addLayer: vi.fn(),
      getSource: vi.fn(),
    }));

    const Marker = vi.fn().mockImplementation(() => {
      const marker = {
        setLngLat: vi.fn().mockReturnThis(),
        addTo: vi.fn().mockReturnThis(),
        on: vi.fn().mockReturnThis(),
        remove: vi.fn(),
        getLngLat: vi.fn().mockReturnValue({ lng: 0, lat: 0 }),
      };
      return marker;
    });

    const LngLatBounds = vi.fn().mockImplementation(() => ({
      extend: vi.fn().mockReturnThis(),
    }));

    return {
      default: { Map, Marker, LngLatBounds },
      Map,
      Marker,
      LngLatBounds,
    };
  });
});

describe("RunMap", () => {
  it("renders without crashing", () => {
    render(<RunMap />);
    expect(screen.getByTestId("run-map")).toBeInTheDocument();
  });

  it("renders distance overlay", () => {
    render(<RunMap />);
    expect(screen.getByText("Distance")).toBeInTheDocument();
    expect(screen.getByText("0.00 km")).toBeInTheDocument();
  });

  it("renders undo and clear buttons", () => {
    render(<RunMap />);
    expect(screen.getByRole("button", { name: /undo/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /clear/i })).toBeInTheDocument();
  });

  it("disables buttons when no waypoints exist", () => {
    render(<RunMap />);
    expect(screen.getByRole("button", { name: /undo/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /clear/i })).toBeDisabled();
  });
});
