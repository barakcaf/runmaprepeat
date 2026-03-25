import { useState, useEffect, useRef, useCallback } from "react";
import { searchSpotify } from "../../api/client";
import type { SpotifySearchResult } from "../../api/client";
import type { AudioRef, SpotifyRef } from "../../types/audio";
import { MAX_AUDIO_SELECTIONS } from "../../types/audio";
import styles from "./SpotifySearch.module.css";

const DEBOUNCE_MS = 300;
const isValidSpotifyImage = (url: string) => url.startsWith("https://i.scdn.co/");

const TYPE_ORDER: Array<SpotifyRef["type"]> = ["artist", "album", "track"];
const TYPE_LABELS: Record<SpotifyRef["type"], string> = {
  artist: "Artists",
  album: "Albums",
  track: "Tracks",
};

interface SpotifySearchProps {
  value: AudioRef[];
  onChange: (audio: AudioRef[]) => void;
}

export function SpotifySearch({ value, onChange }: SpotifySearchProps) {
  const [mode, setMode] = useState<"spotify" | "manual">(
    value.length === 1 && value[0].source === "manual" ? "manual" : "spotify"
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyRef[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searched, setSearched] = useState(false);

  const manualItem = value.length === 1 && value[0].source === "manual" ? value[0] : undefined;
  const [manualName, setManualName] = useState(manualItem?.name ?? "");
  const [manualArtist, setManualArtist] = useState(manualItem?.artistName ?? "");

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const spotifyItems = value.filter((v): v is SpotifyRef => v.source === "spotify");
  const atMax = spotifyItems.length >= MAX_AUDIO_SELECTIONS;

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

  function isAlreadySelected(item: SpotifyRef): boolean {
    return spotifyItems.some(
      (s) => s.spotifyId === item.spotifyId && s.type === item.type
    );
  }

  function handleSelect(item: SpotifyRef) {
    if (isAlreadySelected(item) || atMax) return;
    onChange([...value, { ...item, source: "spotify" }]);
  }

  function handleRemove(index: number) {
    const next = value.filter((_, i) => i !== index);
    onChange(next);
  }

  function handleRemoveAll() {
    onChange([]);
    setQuery("");
    setManualName("");
    setManualArtist("");
  }

  function handleClearAll() {
    onChange([]);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown || results.length === 0) return;
    const selectableResults = results.filter((r) => !isAlreadySelected(r));
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
      onChange([{
        source: "manual",
        name: name.trim(),
        ...(manualArtist.trim() ? { artistName: manualArtist.trim() } : {}),
      }]);
    } else {
      onChange([]);
    }
  }

  function handleManualArtistChange(artist: string) {
    setManualArtist(artist);
    if (manualName.trim()) {
      onChange([{
        source: "manual",
        name: manualName.trim(),
        ...(artist.trim() ? { artistName: artist.trim() } : {}),
      }]);
    }
  }

  function groupedResults(): Array<{ type: SpotifyRef["type"]; label: string; items: SpotifyRef[] }> {
    const groups: Array<{ type: SpotifyRef["type"]; label: string; items: SpotifyRef[] }> = [];
    for (const t of TYPE_ORDER) {
      const items = results.filter((r) => r.type === t);
      if (items.length > 0) {
        groups.push({ type: t, label: TYPE_LABELS[t], items });
      }
    }
    return groups;
  }

  function getFlatIndex(type: SpotifyRef["type"], indexInGroup: number): number {
    let offset = 0;
    for (const t of TYPE_ORDER) {
      if (t === type) return offset + indexInGroup;
      offset += results.filter((r) => r.type === t).length;
    }
    return offset + indexInGroup;
  }

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.tabToggle}>
        <button
          type="button"
          className={mode === "spotify" ? styles.tabButtonActive : styles.tabButton}
          onClick={() => { setMode("spotify"); handleRemoveAll(); }}
        >
          Search Spotify
        </button>
        <button
          type="button"
          className={mode === "manual" ? styles.tabButtonActive : styles.tabButton}
          onClick={() => { setMode("manual"); handleRemoveAll(); setResults([]); setShowDropdown(false); }}
        >
          Enter manually
        </button>
      </div>

      {mode === "spotify" ? (
        <div>
          {spotifyItems.length > 0 && (
            <div className={styles.chipTray} data-testid="spotify-chip-list">
              {spotifyItems.map((item) => {
                const originalIndex = value.indexOf(item);
                return (
                  <div key={`${item.spotifyId}-${item.type}`} className={styles.chip} data-testid="spotify-chip">
                    {item.imageUrl && isValidSpotifyImage(item.imageUrl) && (
                      <img
                        className={styles.chipImage}
                        src={item.imageUrl}
                        alt={item.name}
                      />
                    )}
                    <div className={styles.chipText}>
                      <span className={styles.chipName}>{item.name}</span>
                      {item.artistName && (
                        <span className={styles.chipArtist}>{item.artistName}</span>
                      )}
                    </div>
                    <span className={styles.chipTypeBadge}>{item.type}</span>
                    <button
                      type="button"
                      className={styles.chipRemove}
                      onClick={() => handleRemove(originalIndex)}
                      aria-label={`Remove ${item.name}`}
                    >
                      &times;
                    </button>
                  </div>
                );
              })}
              {spotifyItems.length >= 2 && (
                <button
                  type="button"
                  className={styles.clearAll}
                  onClick={handleClearAll}
                  data-testid="clear-all"
                >
                  Clear all
                </button>
              )}
            </div>
          )}

          <div className={styles.searchRow}>
            <input
              className={styles.searchInput}
              type="text"
              placeholder={atMax
                ? `Maximum ${MAX_AUDIO_SELECTIONS} selections`
                : spotifyItems.length > 0
                  ? "Add another..."
                  : "Search for artists, albums, or tracks..."}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
              disabled={atMax}
              aria-label="Search Spotify"
            />
            {spotifyItems.length > 0 && (
              <span className={styles.selectionCounter} data-testid="selection-counter">
                {spotifyItems.length}/{MAX_AUDIO_SELECTIONS}
              </span>
            )}
          </div>

          {showDropdown && (
            <div className={styles.dropdown} role="listbox" data-testid="spotify-dropdown">
              {loading && <div className={styles.loading}>Searching...</div>}
              {!loading && searched && results.length === 0 && (
                <div className={styles.noResults}>No results found</div>
              )}
              {!loading && groupedResults().map((group) => (
                <div key={group.type} className={styles.resultGroup}>
                  <div className={styles.groupHeader}>{group.label}</div>
                  {group.items.map((item, indexInGroup) => {
                    const flatIdx = getFlatIndex(group.type, indexInGroup);
                    const selected = isAlreadySelected(item);
                    return (
                      <button
                        key={`${item.spotifyId}-${item.type}`}
                        type="button"
                        role="option"
                        aria-selected={flatIdx === activeIndex}
                        className={`${selected ? styles.resultItemSelected : flatIdx === activeIndex ? styles.resultItemActive : styles.resultItem}`}
                        onClick={() => handleSelect(item)}
                        disabled={selected}
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
                        {selected && <span className={styles.checkmark}>&#10003;</span>}
                        <span className={styles.typeBadge}>{item.type}</span>
                      </button>
                    );
                  })}
                </div>
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
