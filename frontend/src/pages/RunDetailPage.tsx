import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getRun, updateRun, deleteRun, completeRun } from "../api/client";
import { RouteMap } from "../components/Map/RouteMap";
import { formatDuration, formatPace, formatDate, formatCalories, formatAudio } from "../utils/format";
import type { Run } from "../types/run";
import shared from "../styles/shared.module.css";
import styles from "../styles/RunDetailPage.module.css";

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
  const [saving, setSaving] = useState(false);

  const [completing, setCompleting] = useState(false);
  const [durationInput, setDurationInput] = useState("");

  useEffect(() => {
    if (!runId) return;
    setLoading(true);
    getRun(runId)
      .then((data) => {
        setRun(data);
        setEditTitle(data.title ?? "");
        setEditNotes(data.notes ?? "");
        setEditDate(data.runDate.slice(0, 10));
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [runId]);

  async function handleSaveEdit() {
    if (!runId) return;
    setSaving(true);
    try {
      const updated = await updateRun(runId, {
        title: editTitle.trim() || undefined,
        notes: editNotes.trim() || undefined,
        runDate: editDate ? new Date(editDate).toISOString() : undefined,
      });
      setRun(updated);
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

  function parseDuration(input: string): number | null {
    const parts = input.split(":").map(Number);
    if (parts.some(isNaN)) return null;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return null;
  }

  async function handleComplete() {
    if (!runId) return;
    const seconds = parseDuration(durationInput);
    if (!seconds || seconds <= 0) return;
    setSaving(true);
    try {
      const updated = await completeRun(runId, { durationSeconds: seconds });
      setRun(updated);
      setCompleting(false);
      setDurationInput("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to complete run";
      setError(message);
    } finally {
      setSaving(false);
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
              <label className={shared.formLabel} htmlFor="editNotes">Notes</label>
              <textarea
                id="editNotes"
                className={shared.formTextarea}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </div>
            <div className={styles.actions}>
              <button className={shared.buttonPrimary} onClick={handleSaveEdit} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
              <button className={shared.buttonSecondary} onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <h1 className={styles.runTitle}>{run.title || "Untitled Run"}</h1>
            <div className={styles.runDate}>{formatDate(run.runDate)}</div>

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
                <div className={styles.sectionLabel}>Audio</div>
                <div className={styles.audioDisplay}>
                  {run.audio.imageUrl?.startsWith("https://i.scdn.co/") && (
                    <img
                      className={styles.audioArtwork}
                      src={run.audio.imageUrl}
                      alt={run.audio.name}
                      width={200}
                      height={200}
                    />
                  )}
                  <div>
                    <div className={styles.sectionValue}>{run.audio.name}</div>
                    {run.audio.artistName && (
                      <div className={styles.audioArtist}>{run.audio.artistName}</div>
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
                <div className={styles.sectionLabel}>Audio</div>
                <div className={styles.sectionValue}>
                  {formatAudio(run.audio)}
                </div>
              </div>
            )}

            {run.notes && (
              <div className={styles.section}>
                <div className={styles.sectionLabel}>Notes</div>
                <div className={styles.sectionValue}>{run.notes}</div>
              </div>
            )}

            <div className={styles.actions}>
              <button className={shared.buttonSecondary} onClick={() => setEditing(true)}>
                Edit
              </button>
              {run.status === "planned" && !completing && (
                <button className={shared.buttonPrimary} onClick={() => setCompleting(true)}>
                  Complete Run
                </button>
              )}
              <button className={shared.buttonDanger} onClick={handleDelete}>
                Delete
              </button>
            </div>

            {completing && (
              <div className={styles.editForm}>
                <div className={shared.formGroup}>
                  <label className={shared.formLabel} htmlFor="completeDuration">
                    Duration (HH:MM:SS or MM:SS)
                  </label>
                  <input
                    id="completeDuration"
                    className={shared.formInput}
                    type="text"
                    placeholder="32:15"
                    value={durationInput}
                    onChange={(e) => setDurationInput(e.target.value)}
                  />
                </div>
                <div className={styles.actions}>
                  <button className={shared.buttonPrimary} onClick={handleComplete} disabled={saving}>
                    {saving ? "Completing..." : "Submit"}
                  </button>
                  <button className={shared.buttonSecondary} onClick={() => setCompleting(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
