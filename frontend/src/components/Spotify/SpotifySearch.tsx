import { useState, useEffect, useRef, useCallback } from "react";
import { searchSpotify } from "../../api/client";
import type { SpotifySearchResult } from "../../api/client";
import type { AudioRef, SpotifyRef } from "../../types/audio";
import styles from "./SpotifySearch.module.css";

const DEBOUNCE_MS = 300;
const isValidSpotifyImage = (url: string) => url.startsWith("https://i.scdn.co/");

interface SpotifySearchProps {
  value: AudioRef | undefined;
  onChange: (audio: AudioRef | undefined) => void;
}

export function SpotifySearch({ value, onChange }: SpotifySearchProps) {
  const [mode, setMode] = useState<"spotify" | "manual">(
    value?.source === "manual" ? "manual" : "spotify"
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyRef[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searched, setSearched] = useState(false);

  const [manualName, setManualName] = useState(
    value?.source === "manual" ? value.name : ""
  );
  const [manualArtist, setManualArtist] = useState(
    value?.source === "manual" ? (value.artistName ?? "") : ""
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flattenResults = useCallback((data: SpotifySearchResult): SpotifyRef[] => {
    const flat: SpotifyRef[] = [];
    if (data.artists) flat.push(...data.artists.slice(0, 5));
    if (data.albums) flat.push(...data.albums.slice(0, 5));
    if (data.tracks) flat.push(...data.tracks.slice(0, 5));
    return flat;
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      setSearched(false);
      return;
    }
    const abortController = new AbortController();
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      setSearched(false);
      searchSpotify(query)
        .then((data) => {
          if (abortController.signal.aborted) return;
          const flat = flattenResults(data);
          setResults(flat);
          setShowDropdown(true);
          setActiveIndex(-1);
          setSearched(true);
        })
        .catch(() => {
          if (abortController.signal.aborted) return;
          setResults([]);
          setShowDropdown(false);
          setSearched(true);
          // Silent fallback — switch to manual on API error
          setMode("manual");
        })
        .finally(() => {
          if (!abortController.signal.aborted) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortController.abort();
    };
  }, [query, flattenResults]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(item: SpotifyRef) {
    onChange({ ...item, source: "spotify" });
    setQuery("");
    setShowDropdown(false);
    setResults([]);
  }

  function handleRemove() {
    onChange(undefined);
    setQuery("");
    setManualName("");
    setManualArtist("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(results[activeIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  }

  function handleManualNameChange(name: string) {
    setManualName(name);
    if (name.trim()) {
      onChange({
        source: "manual",
        name: name.trim(),
        ...(manualArtist.trim() ? { artistName: manualArtist.trim() } : {}),
      });
    } else {
      onChange(undefined);
    }
  }

  function handleManualArtistChange(artist: string) {
    setManualArtist(artist);
    if (manualName.trim()) {
      onChange({
        source: "manual",
        name: manualName.trim(),
        ...(artist.trim() ? { artistName: artist.trim() } : {}),
      });
    }
  }

  // If a spotify value is selected, show chip
  if (value && value.source === "spotify" && mode === "spotify") {
    return (
      <div className={styles.container}>
        <div className={styles.chip} data-testid="spotify-chip">
          {value.imageUrl && isValidSpotifyImage(value.imageUrl) && (
            <img
              className={styles.chipImage}
              src={value.imageUrl}
              alt={value.name}
            />
          )}
          <div className={styles.chipInfo}>
            <div className={styles.chipName}>{value.name}</div>
            {value.artistName && (
              <div className={styles.chipSubtext}>{value.artistName}</div>
            )}
          </div>
          <button
            type="button"
            className={styles.chipRemove}
            onClick={handleRemove}
            aria-label="Remove audio"
          >
            x
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.tabToggle}>
        <button
          type="button"
          className={mode === "spotify" ? styles.tabButtonActive : styles.tabButton}
          onClick={() => { setMode("spotify"); onChange(undefined); setManualName(""); setManualArtist(""); }}
        >
          Search Spotify
        </button>
        <button
          type="button"
          className={mode === "manual" ? styles.tabButtonActive : styles.tabButton}
          onClick={() => { setMode("manual"); onChange(undefined); setQuery(""); setResults([]); setShowDropdown(false); }}
        >
          Enter manually
        </button>
      </div>

      {mode === "spotify" ? (
        <div>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search for artists, albums, or tracks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
            aria-label="Search Spotify"
          />
          {showDropdown && (
            <div className={styles.dropdown} role="listbox" data-testid="spotify-dropdown">
              {loading && <div className={styles.loading}>Searching...</div>}
              {!loading && searched && results.length === 0 && (
                <div className={styles.noResults}>No results found</div>
              )}
              {results.map((item, index) => (
                <button
                  key={`${item.spotifyId}-${item.type}`}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  className={index === activeIndex ? styles.resultItemActive : styles.resultItem}
                  onClick={() => handleSelect(item)}
                >
                  {item.imageUrl && isValidSpotifyImage(item.imageUrl) ? (
                    <img className={styles.thumbnail} src={item.imageUrl} alt="" />
                  ) : (
                    <div className={styles.thumbnailPlaceholder}>&#9835;</div>
                  )}
                  <div className={styles.resultInfo}>
                    <div className={styles.resultName}>{item.name}</div>
                    {item.artistName && (
                      <div className={styles.resultSubtext}>{item.artistName}</div>
                    )}
                  </div>
                  <span className={styles.typeBadge}>{item.type}</span>
                </button>
              ))}
              <div className={styles.attribution}>Powered by Spotify</div>
            </div>
          )}
        </div>
      ) : (
        <div className={styles.manualFields}>
          <input
            className={styles.manualInput}
            type="text"
            placeholder="Name (e.g. song, album, podcast)"
            value={manualName}
            onChange={(e) => handleManualNameChange(e.target.value)}
            aria-label="Audio name"
          />
          <input
            className={styles.manualInput}
            type="text"
            placeholder="Artist (optional)"
            value={manualArtist}
            onChange={(e) => handleManualArtistChange(e.target.value)}
            aria-label="Artist name"
          />
        </div>
      )}
    </div>
  );
}
