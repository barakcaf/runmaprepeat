import { describe, it, expect } from "vitest";
import { DEFAULT_CENTER, DEFAULT_ZOOM, TILE_STYLE } from "../components/Map/mapConfig";

describe("mapConfig", () => {
  it("defaults to Kiryat Ono coordinates [lng, lat]", () => {
    expect(DEFAULT_CENTER).toEqual([34.8553, 32.0633]);
  });

  it("defaults to zoom level 15", () => {
    expect(DEFAULT_ZOOM).toBe(15);
  });

  it("exports a valid tile style URL", () => {
    expect(TILE_STYLE).toMatch(/^https:\/\//);
  });
});
