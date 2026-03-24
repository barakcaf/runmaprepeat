import { useRef, useEffect } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Coordinate } from "../../types/run";
import { TILE_STYLE } from "./mapConfig";
const ROUTE_SOURCE_ID = "route-source";
const ROUTE_LAYER_ID = "route-layer";

interface RouteMapProps {
  route: Coordinate[];
  height?: string;
}

export function RouteMap({ route, height = "200px" }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || route.length === 0) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: TILE_STYLE,
      center: route[0],
      zoom: 13,
      interactive: false,
      attributionControl: false,
    });

    mapRef.current = map;

    map.on("load", () => {
      map.addSource(ROUTE_SOURCE_ID, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: route },
        },
      });

      map.addLayer({
        id: ROUTE_LAYER_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#3b82f6", "line-width": 3 },
      });

      const bounds = new maplibregl.LngLatBounds();
      for (const coord of route) {
        bounds.extend(coord);
      }
      map.fitBounds(bounds, { padding: 40 });
    });

    return () => {
      map.remove();
    };
  }, [route]);

  if (route.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      data-testid="route-map"
      style={{ width: "100%", height, borderRadius: "8px", overflow: "hidden" }}
    />
  );
}
