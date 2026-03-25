import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getRun, updateRun, deleteRun } from "../api/client";
import { RouteMap } from "../components/Map/RouteMap";
import { SpotifySearch } from "../components/Spotify/SpotifySearch";
import { formatDuration, formatPace, formatDateTime, formatCalories, formatAudio } from "../utils/format";
import type { Run, UpdateRunPayload } from "../types/run";
import type { AudioRef } from "../types/audio";
import shared from "../styles/shared.module.css";
import styles from "../styles/RunDetailPage.module.css";

function parseDuration(input: string): number | null {
  const parts = input.split(":").map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

function formatDurationInput(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
}

export function RunDetailPage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const [run, setRun] = useState<Run | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editDate, setEditDate] = useState("");
  const [originalRunDate, setOriginalRunDate] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [editDistance, setEditDistance] = useState("");
  const [editElevation, setEditElevation] = useState("");
  const [editAudio, setEditAudio] = useState<AudioRef | undefined>(undefined);
  const [audioRemoved, setAudioRemoved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!runId) return;
    setLoading(true);
    getRun(runId)
      .then((data) => {
        setRun(data);
        populateEditFields(data);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [runId]);

  function populateEditFields(data: Run) {
    setEditTitle(data.title ?? "");
    setEditNotes(data.notes ?? "");
    setOriginalRunDate(data.runDate);
    setEditDate(new Date(data.runDate).toLocaleDateString("sv-SE"));
    setEditDuration(data.durationSeconds ? formatDurationInput(data.durationSeconds) : "");
    setEditDistance(data.distanceMeters ? (data.distanceMeters / 1000).toFixed(2) : "");
    setEditElevation(data.elevationGainMeters !== undefined ? String(data.elevationGainMeters) : "");
    setEditAudio(data.audio);
    setAudioRemoved(false);
  }

  function startEditing() {
    if (run) populateEditFields(run);
    setEditing(true);
  }

  function cancelEditing() {
    if (run) populateEditFields(run);
    setEditing(false);
  }

  function handleAudioChange(audio: AudioRef | undefined) {
    setEditAudio(audio);
    setAudioRemoved(!audio);
  }

  async function handleSaveEdit() {
    if (!runId) return;
    setSaving(true);
    setError(null);
    try {
      // Only send runDate if the user actually changed the date
      let runDate: string | undefined;
      const originalDateStr = new Date(originalRunDate).toLocaleDateString("sv-SE");
      if (editDate && editDate !== originalDateStr) {
        // User changed the date — preserve the original time component
        const orig = new Date(originalRunDate);
        const [year, month, day] = editDate.split("-").map(Number);
        const updated = new Date(orig);
        updated.setFullYear(year, month - 1, day);
        runDate = updated.toISOString();
      }

      const payload: UpdateRunPayload = {
        title: editTitle.trim() || undefined,
        notes: editNotes.trim() || undefined,
        ...(runDate !== undefined ? { runDate } : {}),
      };

      if (editDuration.trim()) {
        const seconds = parseDuration(editDuration);
        if (seconds === null || seconds <= 0) {
          setError("Invalid duration format. Use HH:MM:SS or MM:SS.");
          setSaving(false);
          return;
        }
        payload.durationSeconds = seconds;
      }

      if (editDistance.trim()) {
        const km = parseFloat(editDistance);
        if (isNaN(km) || km < 0) {
          setError("Invalid distance.");
          setSaving(false);
          return;
        }
        payload.distanceMeters = Math.round(km * 1000);
      }

      if (editElevation.trim()) {
        const elev = parseFloat(editElevation);
        if (isNaN(elev) || elev < 0) {
          setError("Invalid elevation.");
          setSaving(false);
          return;
        }
        payload.elevationGainMeters = Math.round(elev);
      }

      if (audioRemoved) {
        payload.audio = null;
      } else if (editAudio) {
        payload.audio = editAudio;
      }

      const updated = await updateRun(runId, payload);
      setRun(updated);
      setOriginalRunDate(updated.runDate);
      setEditing(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!runId || !window.confirm("Delete this run? This cannot be undone.")) return;
    try {
      await deleteRun(runId);
      navigate("/");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete";
      setError(message);
    }
  }

  if (loading) {
    return (
      <div className={shared.page}>
        <div className={shared.loadingState}>Loading run...</div>
      </div>
    );
  }

  if (error && !run) {
    return (
      <div className={shared.page}>
        <div className={shared.errorState}>{error}</div>
      </div>
    );
  }

  if (!run) return null;

  return (
    <div className={shared.page}>
      {run.route && run.route.length >= 2 ? (
        <div className={styles.mapArea}>
          <RouteMap route={run.route} height="100%" />
        </div>
      ) : (
        <div className={styles.mapPlaceholder}>No route recorded</div>
      )}
      <div className={styles.detailCard}>
        {error && <div className={shared.errorState}>{error}</div>}

        {editing ? (
          <div className={styles.editForm}>
            <div className={shared.formGroup}>
              <label className={shared.formLabel} htmlFor="editTitle">Title</label>
              <input
                id="editTitle"
                className={shared.formInput}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className={shared.formGroup}>
              <label className={shared.formLabel} htmlFor="editDate">Date</label>
              <input
                id="editDate"
                className={shared.formInput}
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>
            <div className={shared.formGroup}>
              <label className={shared.formLabel} htmlFor="editDuration">Duration (HH:MM:SS)</label>
              <input
                id="editDuration"
                className={shared.formInput}
                type="text"
                placeholder="00:32:15"
                value={editDuration}
                onChange={(e) => setEditDuration(e.target.value)}
              />
            </div>
            <div className={shared.formGroup}>
              <label className={shared.formLabel} htmlFor="editDistance">Distance (km)</label>
              <input
                id="editDistance"
                className={shared.formInput}
                type="number"
                step="0.01"
                min="0"
                placeholder="5.00"
                value={editDistance}
                onChange={(e) => setEditDistance(e.target.value)}
              />
            </div>
            <div className={shared.formGroup}>
              <label className={shared.formLabel} htmlFor="editElevation">Elevation gain (m)</label>
              <input
                id="editElevation"
                className={shared.formInput}
                type="number"
                step="1"
                min="0"
                placeholder="120"
                value={editElevation}
                onChange={(e) => setEditElevation(e.target.value)}
              />
            </div>
            <div className={shared.formGroup}>
              <label className={shared.formLabel} htmlFor="editNotes">Notes</label>
              <textarea
                id="editNotes"
                className={shared.formTextarea}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </div>

            <div className={styles.audioSection}>
              <label className={shared.formLabel}>Music</label>
              <SpotifySearch value={editAudio} onChange={handleAudioChange} />
            </div>

            <div className={styles.actions}>
              <button className={shared.buttonPrimary} onClick={handleSaveEdit} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
              <button className={shared.buttonSecondary} onClick={cancelEditing}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <h1 className={styles.runTitle}>{run.title || "Untitled Run"}</h1>
            <div className={styles.runDate}>{formatDateTime(run.runDate)}</div>

            <div className={styles.statsGrid}>
              {run.distanceMeters !== undefined && (
                <div className={styles.statItem}>
                  <div className={styles.statItemLabel}>Distance</div>
                  <div className={styles.statItemValue}>
                    {(run.distanceMeters / 1000).toFixed(2)} km
                  </div>
                </div>
              )}
              {run.durationSeconds !== undefined && (
                <div className={styles.statItem}>
                  <div className={styles.statItemLabel}>Duration</div>
                  <div className={styles.statItemValue}>
                    {formatDuration(run.durationSeconds)}
                  </div>
                </div>
              )}
              {run.paceSecondsPerKm !== undefined && (
                <div className={styles.statItem}>
                  <div className={styles.statItemLabel}>Pace</div>
                  <div className={styles.statItemValue}>
                    {formatPace(run.paceSecondsPerKm)}
                  </div>
                </div>
              )}
              {run.caloriesBurned !== undefined && (
                <div className={styles.statItem}>
                  <div className={styles.statItemLabel}>Calories</div>
                  <div className={styles.statItemValue}>
                    {formatCalories(run.caloriesBurned)}
                  </div>
                </div>
              )}
              {run.elevationGainMeters !== undefined && (
                <div className={styles.statItem}>
                  <div className={styles.statItemLabel}>Elevation</div>
                  <div className={styles.statItemValue}>
                    {run.elevationGainMeters} m
                  </div>
                </div>
              )}
            </div>

            {run.audio && run.audio.source === "spotify" && (
              <div className={styles.section}>
                <div className={styles.sectionLabel}>Music</div>
                <div className={styles.spotifyCard}>
                  {run.audio.imageUrl?.startsWith("https://i.scdn.co/") && (
                    <img
                      className={styles.spotifyArt}
                      src={run.audio.imageUrl}
                      alt={run.audio.name}
                    />
                  )}
                  <div className={styles.spotifyInfo}>
                    <div className={styles.spotifyTrack}>{run.audio.name}</div>
                    {run.audio.artistName && (
                      <div className={styles.spotifyArtist}>{run.audio.artistName}</div>
                    )}
                    {run.audio.albumName && (
                      <div className={styles.spotifyAlbum}>{run.audio.albumName}</div>
                    )}
                    {run.audio.spotifyUrl?.startsWith("https://open.spotify.com/") && (
                      <a
                        href={run.audio.spotifyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.spotifyLink}
                      >
                        Open in Spotify
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {run.audio && run.audio.source === "manual" && (
              <div className={styles.section}>
                <div className={styles.sectionLabel}>Music</div>
                <div className={styles.sectionValue}>
                  {formatAudio(run.audio)}
                </div>
              </div>
            )}

            {run.notes && (
              <div className={styles.section}>
                <div className={styles.sectionLabel}>Notes</div>
                <div className={styles.notesText}>{run.notes}</div>
              </div>
            )}

            <div className={styles.actions}>
              <button className={shared.buttonSecondary} onClick={startEditing}>
                Edit
              </button>
              <button className={shared.buttonDanger} onClick={handleDelete}>
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
