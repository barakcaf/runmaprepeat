import { useState, useRef, useCallback, useEffect } from "react";
import {
  LocationClient,
  SearchPlaceIndexForSuggestionsCommand,
  SearchPlaceIndexForTextCommand,
} from "@aws-sdk/client-location";
import { fetchAuthSession } from "@aws-amplify/auth";
import { config } from "../../config";
import styles from "./LocationSearch.module.css";

interface LocationSearchProps {
  onSelect: (lng: number, lat: number, label: string) => void;
  mapBounds?: { west: number; south: number; east: number; north: number };
}

interface Suggestion {
  text: string;
  placeId?: string;
}

const DEBOUNCE_MS = 300;
const ISRAEL_BIAS: [number, number, number, number] = [34.0, 29.5, 36.0, 33.5];

async function getLocationClient(): Promise<LocationClient> {
  const session = await fetchAuthSession();
  const credentials = session.credentials;
  if (!credentials) {
    throw new Error("No AWS credentials available");
  }
  return new LocationClient({
    region: config.location.region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  });
}

export function LocationSearch({ onSelect, mapBounds }: LocationSearchProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  const biasPosition: [number, number] = mapBounds
    ? [(mapBounds.west + mapBounds.east) / 2, (mapBounds.south + mapBounds.north) / 2]
    : [(ISRAEL_BIAS[0] + ISRAEL_BIAS[2]) / 2, (ISRAEL_BIAS[1] + ISRAEL_BIAS[3]) / 2];

  const fetchSuggestions = useCallback(
    async (text: string) => {
      if (text.trim().length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        setSearched(false);
        return;
      }

      try {
        const client = await getLocationClient();
        const command = new SearchPlaceIndexForSuggestionsCommand({
          IndexName: config.location.placeIndexName,
          Text: text,
          BiasPosition: biasPosition,
          MaxResults: 5,
        });
        const response = await client.send(command);
        const results: Suggestion[] =
          response.Results?.map((r) => ({
            text: r.Text ?? "",
            placeId: r.PlaceId,
          })) ?? [];
        setSuggestions(results);
        setShowSuggestions(true);
        setSearched(true);
        setActiveIndex(-1);
      } catch {
        setSuggestions([]);
        setSearched(true);
      }
    },
    [biasPosition[0], biasPosition[1]]
  );

  const handleInputChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        fetchSuggestions(value);
      }, DEBOUNCE_MS);
    },
    [fetchSuggestions]
  );

  const selectSuggestion = useCallback(
    async (suggestion: Suggestion) => {
      setQuery(suggestion.text);
      setShowSuggestions(false);
      setSuggestions([]);

      try {
        const client = await getLocationClient();
        const command = new SearchPlaceIndexForTextCommand({
          IndexName: config.location.placeIndexName,
          Text: suggestion.text,
          BiasPosition: biasPosition,
          MaxResults: 1,
        });
        const response = await client.send(command);
        const place = response.Results?.[0]?.Place;
        if (place?.Geometry?.Point) {
          const [lng, lat] = place.Geometry.Point;
          onSelect(lng, lat, place.Label ?? suggestion.text);
        }
      } catch {
        // Search failed silently — user can retry
      }
    },
    [biasPosition[0], biasPosition[1], onSelect]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showSuggestions || suggestions.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
      } else if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        selectSuggestion(suggestions[activeIndex]);
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
      }
    },
    [showSuggestions, suggestions, activeIndex, selectSuggestion]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
    setSearched(false);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className={styles.container} ref={containerRef} data-testid="location-search">
      <div className={styles.inputWrapper}>
        <input
          className={styles.input}
          type="text"
          placeholder="Search location..."
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
          aria-label="Search location"
          aria-autocomplete="list"
          aria-expanded={showSuggestions}
          role="combobox"
        />
        {query && (
          <button
            className={styles.clearButton}
            onClick={handleClear}
            aria-label="Clear search"
            type="button"
          >
            ✕
          </button>
        )}
      </div>
      {showSuggestions && (
        <ul className={styles.suggestions} role="listbox" data-testid="suggestions-list">
          {suggestions.length > 0
            ? suggestions.map((s, i) => (
                <li
                  key={s.placeId ?? s.text}
                  className={`${styles.suggestion} ${i === activeIndex ? styles.suggestionActive : ""}`}
                  role="option"
                  aria-selected={i === activeIndex}
                  onMouseDown={() => selectSuggestion(s)}
                  onMouseEnter={() => setActiveIndex(i)}
                >
                  {s.text}
                </li>
              ))
            : searched && (
                <li className={styles.noResults}>No results found</li>
              )}
        </ul>
      )}
    </div>
  );
}
