import type { Map as MaplibreMap } from "maplibre-gl";

/**
 * Switches all symbol layers' text-field to prefer English names,
 * falling back to the default name when English is unavailable.
 * Works with OpenMapTiles-based styles (e.g. CARTO Positron).
 */
export function setEnglishLabels(map: MaplibreMap): void {
  const style = map.getStyle();
  if (!style?.layers) return;

  for (const layer of style.layers) {
    if (layer.type === "symbol" && layer.layout?.["text-field"]) {
      map.setLayoutProperty(layer.id, "text-field", [
        "coalesce",
        ["get", "name:en"],
        ["get", "name"],
      ]);
    }
  }
}
