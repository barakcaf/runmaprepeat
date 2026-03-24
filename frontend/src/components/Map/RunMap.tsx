import { useRef, useEffect, useCallback, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Coordinate } from "../../types/run";
import { calculateRouteDistance, formatDistance } from "../../utils/distance";
import { DEFAULT_CENTER, DEFAULT_ZOOM, TILE_STYLE } from "./mapConfig";
import { setEnglishLabels } from "../../utils/mapLabels";
import { LocationSearch } from "./LocationSearch";
import styles from "./RunMap.module.css";

const ROUTE_SOURCE_ID = "route-source";
const ROUTE_LAYER_ID = "route-layer";

interface RunMapProps {
  onRouteChange?: (coords: Coordinate[]) => void;
}

export function RunMap({ onRouteChange }: RunMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const coordsRef = useRef<Coordinate[]>([]);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const draggedRef = useRef(false);
  const [distance, setDistance] = useState(0);
  const [pointCount, setPointCount] = useState(0);
  const [mapBounds, setMapBounds] = useState<{
    west: number; south: number; east: number; north: number;
  }>();

  const handleLocationSelect = useCallback((lng: number, lat: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({ center: [lng, lat], zoom: 15 });
  }, []);

  const updateMapBounds = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const bounds = map.getBounds();
    setMapBounds({
      west: bounds.getWest(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      north: bounds.getNorth(),
    });
  }, []);

  const updateRoute = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const coords = coordsRef.current;
    const source = map.getSource(ROUTE_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: coords,
        },
      });
    }

    const meters = calculateRouteDistance(coords);
    setDistance(meters);
    setPointCount(coords.length);
    onRouteChange?.(coords);
  }, [onRouteChange]);

  const createMarkerElement = useCallback((index: number): HTMLDivElement => {
    const el = document.createElement("div");
    el.className = "waypoint-marker";
    el.style.width = "28px";
    el.style.height = "28px";
    el.style.borderRadius = "50%";
    el.style.background = "#3b82f6";
    el.style.border = "3px solid #ffffff";
    el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
    el.style.display = "flex";
    el.style.alignItems = "center";
    el.style.justifyContent = "center";
    el.style.color = "#ffffff";
    el.style.fontSize = "12px";
    el.style.fontWeight = "700";
    el.style.cursor = "pointer";
    el.style.touchAction = "none";
    el.style.transition = "transform 0.15s ease, box-shadow 0.15s ease";
    el.textContent = String(index + 1);

    el.addEventListener("mouseenter", () => {
      el.style.transform = "scale(1.2)";
      el.style.boxShadow = "0 3px 10px rgba(0,0,0,0.4)";
    });
    el.addEventListener("mouseleave", () => {
      el.style.transform = "scale(1)";
      el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
    });

    return el;
  }, []);

  const removeWaypoint = useCallback(
    (index: number) => {
      const map = mapRef.current;
      if (!map) return;

      popupRef.current?.remove();
      popupRef.current = null;

      markersRef.current[index].remove();
      markersRef.current = markersRef.current.filter((_, i) => i !== index);
      coordsRef.current = coordsRef.current.filter((_, i) => i !== index);

      markersRef.current.forEach((m, i) => {
        const el = m.getElement();
        el.textContent = String(i + 1);
      });

      updateRoute();
    },
    [updateRoute]
  );

  const showRemovePopup = useCallback(
    (marker: maplibregl.Marker, index: number) => {
      const map = mapRef.current;
      if (!map) return;

      popupRef.current?.remove();

      const btn = document.createElement("button");
      btn.textContent = "Remove waypoint";
      btn.setAttribute("data-testid", "remove-waypoint-btn");
      btn.style.cssText =
        "padding:6px 12px;border:none;border-radius:6px;background:#ef4444;color:#fff;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;";

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const currentIndex = markersRef.current.indexOf(marker);
        if (currentIndex !== -1) {
          removeWaypoint(currentIndex);
        }
      });

      const popup = new maplibregl.Popup({ offset: 20, closeButton: false })
        .setDOMContent(btn)
        .setLngLat(marker.getLngLat())
        .addTo(map);

      popupRef.current = popup;
    },
    [removeWaypoint]
  );

  const addWaypoint = useCallback(
    (lngLat: maplibregl.LngLat) => {
      const map = mapRef.current;
      if (!map) return;

      const coord: Coordinate = [lngLat.lng, lngLat.lat];
      const index = coordsRef.current.length;
      coordsRef.current = [...coordsRef.current, coord];

      const el = createMarkerElement(index);
      const marker = new maplibregl.Marker({
        element: el,
        draggable: true,
      })
        .setLngLat(lngLat)
        .addTo(map);

      marker.on("dragstart", () => {
        draggedRef.current = true;
      });

      marker.on("dragend", () => {
        const pos = marker.getLngLat();
        const markerIndex = markersRef.current.indexOf(marker);
        if (markerIndex !== -1) {
          coordsRef.current = coordsRef.current.map((c, i) =>
            i === markerIndex ? [pos.lng, pos.lat] as Coordinate : c
          );
          updateRoute();
        }
      });

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (draggedRef.current) {
          draggedRef.current = false;
          return;
        }
        const currentIndex = markersRef.current.indexOf(marker);
        if (currentIndex !== -1) {
          showRemovePopup(marker, currentIndex);
        }
      });

      markersRef.current = [...markersRef.current, marker];
      updateRoute();
    },
    [createMarkerElement, showRemovePopup, updateRoute]
  );

  const handleUndo = useCallback(() => {
    const lastMarker = markersRef.current[markersRef.current.length - 1];
    if (lastMarker) {
      lastMarker.remove();
      markersRef.current = markersRef.current.slice(0, -1);
      coordsRef.current = coordsRef.current.slice(0, -1);
      updateRoute();
    }
  }, [updateRoute]);

  const handleClear = useCallback(() => {
    for (const marker of markersRef.current) {
      marker.remove();
    }
    markersRef.current = [];
    coordsRef.current = [];
    updateRoute();
  }, [updateRoute]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: TILE_STYLE,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    mapRef.current = map;

    map.on("moveend", updateMapBounds);

    map.on("load", () => {
      setEnglishLabels(map);

      map.addSource(ROUTE_SOURCE_ID, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: [] },
        },
      });

      map.addLayer({
        id: ROUTE_LAYER_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#3b82f6",
          "line-width": 4,
        },
      });

      map.on("click", (e: maplibregl.MapMouseEvent) => {
        addWaypoint(e.lngLat);
      });
    });

    return () => {
      map.remove();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={styles.container}>
      <div ref={mapContainerRef} className={styles.map} data-testid="run-map" />
      <LocationSearch onSelect={handleLocationSelect} mapBounds={mapBounds} />
      <div className={styles.overlay}>
        <div>
          <div className={styles.distanceLabel}>Distance</div>
          <div className={styles.distance}>{formatDistance(distance)}</div>
        </div>
        <div className={styles.buttons}>
          <button
            className={styles.undoButton}
            onClick={handleUndo}
            disabled={pointCount === 0}
            aria-label="Undo last point"
          >
            Undo
          </button>
          <button
            className={styles.clearButton}
            onClick={handleClear}
            disabled={pointCount === 0}
            aria-label="Clear route"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
