import { describe, it, expect, vi } from "vitest";
import { setEnglishLabels } from "../utils/mapLabels";
import type { Map as MaplibreMap } from "maplibre-gl";

function createMockMap(layers: Record<string, unknown>[]): MaplibreMap {
  return {
    getStyle: vi.fn().mockReturnValue({ layers }),
    setLayoutProperty: vi.fn(),
  } as unknown as MaplibreMap;
}

describe("setEnglishLabels", () => {
  it("sets text-field to coalesce name:en and name for symbol layers", () => {
    const map = createMockMap([
      { id: "place-city", type: "symbol", layout: { "text-field": "{name}" } },
      { id: "road-label", type: "symbol", layout: { "text-field": ["get", "name"] } },
    ]);

    setEnglishLabels(map);

    expect(map.setLayoutProperty).toHaveBeenCalledTimes(2);
    expect(map.setLayoutProperty).toHaveBeenCalledWith("place-city", "text-field", [
      "coalesce",
      ["get", "name:en"],
      ["get", "name"],
    ]);
    expect(map.setLayoutProperty).toHaveBeenCalledWith("road-label", "text-field", [
      "coalesce",
      ["get", "name:en"],
      ["get", "name"],
    ]);
  });

  it("skips non-symbol layers", () => {
    const map = createMockMap([
      { id: "road-fill", type: "fill", layout: {} },
      { id: "road-line", type: "line", layout: {} },
    ]);

    setEnglishLabels(map);

    expect(map.setLayoutProperty).not.toHaveBeenCalled();
  });

  it("skips symbol layers without text-field", () => {
    const map = createMockMap([
      { id: "icon-only", type: "symbol", layout: { "icon-image": "marker" } },
    ]);

    setEnglishLabels(map);

    expect(map.setLayoutProperty).not.toHaveBeenCalled();
  });

  it("handles missing style gracefully", () => {
    const map = {
      getStyle: vi.fn().mockReturnValue(undefined),
      setLayoutProperty: vi.fn(),
    } as unknown as MaplibreMap;

    expect(() => setEnglishLabels(map)).not.toThrow();
    expect(map.setLayoutProperty).not.toHaveBeenCalled();
  });

  it("handles style with no layers gracefully", () => {
    const map = createMockMap([]);

    expect(() => setEnglishLabels(map)).not.toThrow();
    expect(map.setLayoutProperty).not.toHaveBeenCalled();
  });
});
