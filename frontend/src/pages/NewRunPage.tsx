import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createRun } from "../api/client";
import { RunMap } from "../components/Map/RunMap";
import { SpotifySearch } from "../components/Spotify/SpotifySearch";
import { calculateRouteDistance, formatDistance } from "../utils/distance";
import type { AudioRef } from "../types/audio";
import type { Coordinate, CreateRunPayload } from "../types/run";
import shared from "../styles/shared.module.css";
import styles from "../styles/NewRunPage.module.css";

function toISOLocal(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString();
}

function nowDate(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function NewRunPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(nowDate);
  const [time, setTime] = useState(nowTime);
  const [status, setStatus] = useState<"completed" | "planned">("completed");
  const [durationInput, setDurationInput] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [route, setRoute] = useState<Coordinate[]>([]);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [mapExpanded, setMapExpanded] = useState(true);

  const handleRouteChange = useCallback((coords: Coordinate[]) => {
    setRoute(coords);
    setDistanceMeters(calculateRouteDistance(coords));
  }, []);

  const [audio, setAudio] = useState<AudioRef | undefined>(undefined);

  function parseDuration(input: string): number | null {
    if (!input.trim()) return null;
    const parts = input.split(":").map(Number);
    if (parts.some(isNaN)) return null;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const durationSeconds = parseDuration(durationInput);
    if (status === "completed" && (durationSeconds === null || durationSeconds <= 0)) {
      setError("Please enter a valid duration");
      setSaving(false);
      return;
    }

    const payload: CreateRunPayload = {
      status,
      runDate: toISOLocal(date, time),
      ...(title.trim() ? { title: title.trim() } : {}),
      ...(route.length >= 2 ? { route, distanceMeters } : {}),
      ...(status === "completed" && durationSeconds ? { durationSeconds } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      ...(audio ? { audio } : {}),
    };

    try {
      const run = await createRun(payload);
      navigate(`/runs/${run.runId}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create run";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={shared.page}>
      <div className={styles.mapSection}>
        <button
          type="button"
          className={styles.mapToggle}
          onClick={() => setMapExpanded((prev) => !prev)}
        >
          {mapExpanded ? "Hide Map" : "Show Map"}
          {distanceMeters > 0 && ` — ${formatDistance(distanceMeters)}`}
        </button>
        {mapExpanded && (
          <div className={styles.mapArea}>
            <RunMap onRouteChange={handleRouteChange} />
          </div>
        )}
      </div>
      <form className={styles.form} onSubmit={handleSubmit}>
        <h2 className={styles.formTitle}>New Run</h2>

        {error && <div className={shared.errorState}>{error}</div>}

        <div className={shared.formGroup}>
          <label className={shared.formLabel} htmlFor="title">Title</label>
          <input
            id="title"
            className={shared.formInput}
            type="text"
            placeholder="Morning run"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className={shared.formGroup}>
          <label className={shared.formLabel} htmlFor="date">Date</label>
          <input
            id="date"
            className={shared.formInput}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className={shared.formGroup}>
          <label className={shared.formLabel} htmlFor="time">Time</label>
          <input
            id="time"
            className={shared.formInput}
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>

        <div className={shared.formGroup}>
          <label className={shared.formLabel}>Status</label>
          <div className={shared.toggleGroup}>
            <button
              type="button"
              className={status === "completed" ? shared.toggleOptionActive : shared.toggleOption}
              onClick={() => setStatus("completed")}
            >
              Completed
            </button>
            <button
              type="button"
              className={status === "planned" ? shared.toggleOptionActive : shared.toggleOption}
              onClick={() => setStatus("planned")}
            >
              Planned
            </button>
          </div>
        </div>

        {status === "completed" && (
          <div className={shared.formGroup}>
            <label className={shared.formLabel} htmlFor="duration">
              Duration (HH:MM:SS)
            </label>
            <input
              id="duration"
              className={shared.formInput}
              type="text"
              placeholder="0:32:15"
              value={durationInput}
              onChange={(e) => setDurationInput(e.target.value)}
            />
          </div>
        )}

        <div className={styles.audioSection}>
          <div className={styles.audioSectionTitle}>Audio</div>
          <SpotifySearch value={audio} onChange={setAudio} />
        </div>

        <div className={shared.formGroup}>
          <label className={shared.formLabel} htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            className={shared.formTextarea}
            placeholder="How did it go?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className={shared.buttonPrimary}
          disabled={saving}
          style={{ width: "100%" }}
        >
          {saving ? "Saving..." : "Save Run"}
        </button>
      </form>
    </div>
  );
}
