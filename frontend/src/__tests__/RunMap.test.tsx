import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { RunMap } from "../components/Map/RunMap";

type MapEventHandler = (e: unknown) => void;
type MarkerEventHandler = () => void;

const mockCalculateRoute = vi.fn();

vi.mock("../api/client", () => ({
  calculateRoute: (...args: unknown[]) => mockCalculateRoute(...args),
}));

let mapClickHandler: MapEventHandler | null = null;
let mapLoadHandler: MapEventHandler | null = null;
const createdMarkers: Array<{
  element: HTMLDivElement;
  marker: ReturnType<typeof createMockMarker>;
  dragStartHandler?: MarkerEventHandler;
  dragEndHandler?: MarkerEventHandler;
}> = [];
const createdPopups: Array<{
  popup: ReturnType<typeof createMockPopup>;
  content?: HTMLElement;
  lngLat?: { lng: number; lat: number };
}> = [];

function createMockMarker(element?: HTMLDivElement) {
  const el = element ?? document.createElement("div");
  const lngLat = { lng: 0, lat: 0 };
  const eventHandlers: Record<string, MarkerEventHandler> = {};

  const marker = {
    setLngLat: vi.fn().mockImplementation((ll: { lng: number; lat: number } | [number, number]) => {
      if (Array.isArray(ll)) {
        lngLat.lng = ll[0];
        lngLat.lat = ll[1];
      } else {
        lngLat.lng = ll.lng;
        lngLat.lat = ll.lat;
      }
      return marker;
    }),
    addTo: vi.fn().mockReturnThis(),
    on: vi.fn().mockImplementation((event: string, handler: MarkerEventHandler) => {
      eventHandlers[event] = handler;
      return marker;
    }),
    remove: vi.fn(),
    getLngLat: vi.fn().mockImplementation(() => ({ ...lngLat })),
    getElement: vi.fn().mockReturnValue(el),
    _eventHandlers: eventHandlers,
    _element: el,
  };
  return marker;
}

function createMockPopup() {
  const popup = {
    setDOMContent: vi.fn().mockImplementation((content: HTMLElement) => {
      const entry = createdPopups.find((p) => p.popup === popup);
      if (entry) entry.content = content;
      return popup;
    }),
    setLngLat: vi.fn().mockImplementation((ll: { lng: number; lat: number }) => {
      const entry = createdPopups.find((p) => p.popup === popup);
      if (entry) entry.lngLat = ll;
      return popup;
    }),
    addTo: vi.fn().mockReturnThis(),
    remove: vi.fn(),
  };
  createdPopups.push({ popup });
  return popup;
}

beforeAll(() => {
  vi.mock("maplibre-gl", () => {
    const Map = vi.fn().mockImplementation(() => ({
      on: vi.fn().mockImplementation((event: string, handler: MapEventHandler) => {
        if (event === "click") mapClickHandler = handler;
        if (event === "load") {
          mapLoadHandler = handler;
        }
      }),
      remove: vi.fn(),
      addSource: vi.fn(),
      addLayer: vi.fn(),
      getSource: vi.fn().mockReturnValue({
        setData: vi.fn(),
      }),
      getStyle: vi.fn().mockReturnValue({ layers: [] }),
      setLayoutProperty: vi.fn(),
    }));

    const Marker = vi.fn().mockImplementation(({ element }: { element?: HTMLDivElement } = {}) => {
      const marker = createMockMarker(element);
      createdMarkers.push({ element: element ?? document.createElement("div"), marker });
      return marker;
    });

    const Popup = vi.fn().mockImplementation(() => {
      return createMockPopup();
    });

    const LngLatBounds = vi.fn().mockImplementation(() => ({
      extend: vi.fn().mockReturnThis(),
    }));

    return {
      default: { Map, Marker, Popup, LngLatBounds },
      Map,
      Marker,
      Popup,
      LngLatBounds,
    };
  });
});

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  mapClickHandler = null;
  mapLoadHandler = null;
  createdMarkers.length = 0;
  createdPopups.length = 0;
  mockCalculateRoute.mockReset();
  mockCalculateRoute.mockRejectedValue(new Error("not mocked"));
});

afterEach(() => {
  vi.useRealTimers();
});

function triggerMapLoad() {
  if (mapLoadHandler) {
    act(() => {
      (mapLoadHandler as MapEventHandler)({});
    });
  }
}

function addWaypointAt(lng: number, lat: number) {
  act(() => {
    (mapClickHandler as MapEventHandler)({ lngLat: { lng, lat } });
  });
}

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

  it("creates marker elements with pointer cursor and hover class", () => {
    render(<RunMap />);
    triggerMapLoad();
    addWaypointAt(34.78, 32.08);

    const markerEl = createdMarkers[0].element;
    expect(markerEl.style.cursor).toBe("pointer");
    expect(markerEl.className).toBe("waypoint-marker");
    expect(markerEl.style.transition).toContain("transform");
  });

  it("scales marker on hover", () => {
    render(<RunMap />);
    triggerMapLoad();
    addWaypointAt(34.78, 32.08);

    const markerEl = createdMarkers[0].element;
    fireEvent.mouseEnter(markerEl);
    expect(markerEl.style.transform).toBe("scale(1.2)");

    fireEvent.mouseLeave(markerEl);
    expect(markerEl.style.transform).toBe("scale(1)");
  });

  it("shows remove popup when marker is clicked", () => {
    render(<RunMap />);
    triggerMapLoad();
    addWaypointAt(34.78, 32.08);

    const markerEl = createdMarkers[0].element;
    fireEvent.click(markerEl);

    expect(createdPopups.length).toBe(1);
    expect(createdPopups[0].popup.addTo).toHaveBeenCalled();
    expect(createdPopups[0].content?.textContent).toBe("Remove waypoint");
  });

  it("does not show popup after drag", () => {
    render(<RunMap />);
    triggerMapLoad();
    addWaypointAt(34.78, 32.08);

    const markerMock = createdMarkers[0].marker;
    // Simulate drag
    const dragStartHandler = markerMock._eventHandlers["dragstart"];
    act(() => dragStartHandler());

    // Click after drag should be suppressed
    const markerEl = createdMarkers[0].element;
    fireEvent.click(markerEl);

    expect(createdPopups.length).toBe(0);
  });

  it("removes waypoint when remove button is clicked", () => {
    const onRouteChange = vi.fn();
    render(<RunMap onRouteChange={onRouteChange} />);
    triggerMapLoad();

    addWaypointAt(34.78, 32.08);
    addWaypointAt(34.79, 32.09);
    addWaypointAt(34.80, 32.10);

    expect(createdMarkers.length).toBe(3);

    // Click the second marker to show popup
    const markerEl = createdMarkers[1].element;
    fireEvent.click(markerEl);

    // Click the remove button in the popup
    const removeBtn = createdPopups[0].content as HTMLButtonElement;
    fireEvent.click(removeBtn);

    // Second marker should be removed
    expect(createdMarkers[1].marker.remove).toHaveBeenCalled();
    // onRouteChange called with remaining coords
    const lastCall = onRouteChange.mock.calls[onRouteChange.mock.calls.length - 1];
    expect(lastCall[0]).toHaveLength(2);
  });

  it("renumbers markers after removal", () => {
    render(<RunMap />);
    triggerMapLoad();

    addWaypointAt(34.78, 32.08);
    addWaypointAt(34.79, 32.09);
    addWaypointAt(34.80, 32.10);

    expect(createdMarkers[0].element.textContent).toBe("1");
    expect(createdMarkers[1].element.textContent).toBe("2");
    expect(createdMarkers[2].element.textContent).toBe("3");

    // Remove the first waypoint
    fireEvent.click(createdMarkers[0].element);
    const removeBtn = createdPopups[0].content as HTMLButtonElement;
    fireEvent.click(removeBtn);

    // Remaining markers should be renumbered
    expect(createdMarkers[1].element.textContent).toBe("1");
    expect(createdMarkers[2].element.textContent).toBe("2");
  });

  it("removes any waypoint not just the last one", () => {
    render(<RunMap />);
    triggerMapLoad();

    addWaypointAt(34.78, 32.08);
    addWaypointAt(34.79, 32.09);
    addWaypointAt(34.80, 32.10);

    // Remove middle waypoint
    fireEvent.click(createdMarkers[1].element);
    const removeBtn = createdPopups[0].content as HTMLButtonElement;
    fireEvent.click(removeBtn);

    expect(createdMarkers[1].marker.remove).toHaveBeenCalled();
    // First and third markers should remain
    expect(createdMarkers[0].marker.remove).not.toHaveBeenCalled();
    expect(createdMarkers[2].marker.remove).not.toHaveBeenCalled();
  });

  it("closes previous popup when opening a new one", () => {
    render(<RunMap />);
    triggerMapLoad();

    addWaypointAt(34.78, 32.08);
    addWaypointAt(34.79, 32.09);

    // Click first marker
    fireEvent.click(createdMarkers[0].element);
    expect(createdPopups.length).toBe(1);

    // Click second marker
    fireEvent.click(createdMarkers[1].element);
    expect(createdPopups.length).toBe(2);
    // First popup should have been removed
    expect(createdPopups[0].popup.remove).toHaveBeenCalled();
  });

  it("calls calculateRoute API after adding 2 waypoints", async () => {
    mockCalculateRoute.mockResolvedValue({
      geometry: [[34.78, 32.08], [34.785, 32.085], [34.79, 32.09]],
      distanceMeters: 1500,
    });

    render(<RunMap />);
    triggerMapLoad();

    addWaypointAt(34.78, 32.08);
    addWaypointAt(34.79, 32.09);

    // Advance past debounce
    act(() => { vi.advanceTimersByTime(350); });

    await waitFor(() => {
      expect(mockCalculateRoute).toHaveBeenCalledWith([
        [34.78, 32.08],
        [34.79, 32.09],
      ]);
    });
  });

  it("does not call calculateRoute with fewer than 2 waypoints", () => {
    render(<RunMap />);
    triggerMapLoad();

    addWaypointAt(34.78, 32.08);

    act(() => { vi.advanceTimersByTime(350); });

    expect(mockCalculateRoute).not.toHaveBeenCalled();
  });

  it("shows snapping indicator while route is calculating", async () => {
    let resolveRoute: (v: unknown) => void;
    mockCalculateRoute.mockReturnValue(new Promise((r) => { resolveRoute = r; }));

    render(<RunMap />);
    triggerMapLoad();

    addWaypointAt(34.78, 32.08);
    addWaypointAt(34.79, 32.09);

    act(() => { vi.advanceTimersByTime(350); });

    await waitFor(() => {
      expect(screen.getByTestId("route-snapping-indicator")).toBeInTheDocument();
    });

    await act(async () => {
      resolveRoute!({
        geometry: [[34.78, 32.08], [34.79, 32.09]],
        distanceMeters: 1500,
      });
    });

    await waitFor(() => {
      expect(screen.queryByTestId("route-snapping-indicator")).not.toBeInTheDocument();
    });
  });

  it("falls back to haversine on API failure", async () => {
    mockCalculateRoute.mockRejectedValue(new Error("API down"));

    render(<RunMap />);
    triggerMapLoad();

    addWaypointAt(34.78, 32.08);
    addWaypointAt(34.79, 32.09);

    act(() => { vi.advanceTimersByTime(350); });

    await waitFor(() => {
      expect(mockCalculateRoute).toHaveBeenCalled();
    });

    // Should still show distance (haversine fallback) and no snapping indicator
    await waitFor(() => {
      expect(screen.queryByTestId("route-snapping-indicator")).not.toBeInTheDocument();
    });
  });

  it("debounces rapid waypoint additions", () => {
    mockCalculateRoute.mockResolvedValue({
      geometry: [[1, 1], [2, 2], [3, 3]],
      distanceMeters: 3000,
    });

    render(<RunMap />);
    triggerMapLoad();

    addWaypointAt(34.78, 32.08);
    addWaypointAt(34.79, 32.09);

    // Advance only 100ms, then add another point
    act(() => { vi.advanceTimersByTime(100); });
    addWaypointAt(34.80, 32.10);

    // Advance past debounce from last addition
    act(() => { vi.advanceTimersByTime(350); });

    // Should have been called only once (with 3 points), not twice
    expect(mockCalculateRoute).toHaveBeenCalledTimes(1);
    expect(mockCalculateRoute).toHaveBeenCalledWith([
      [34.78, 32.08],
      [34.79, 32.09],
      [34.80, 32.10],
    ]);
  });

  it("updates distance from snapped route response", async () => {
    mockCalculateRoute.mockResolvedValue({
      geometry: [[34.78, 32.08], [34.785, 32.085], [34.79, 32.09]],
      distanceMeters: 1500,
    });

    render(<RunMap />);
    triggerMapLoad();

    addWaypointAt(34.78, 32.08);
    addWaypointAt(34.79, 32.09);

    act(() => { vi.advanceTimersByTime(350); });

    await waitFor(() => {
      expect(screen.getByText("1.50 km")).toBeInTheDocument();
    });
  });
});
