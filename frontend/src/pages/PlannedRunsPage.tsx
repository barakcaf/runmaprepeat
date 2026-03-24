import { useEffect, useState, useCallback } from "react";
import { listRuns, completeRun, deleteRun } from "../api/client";
import { formatDate } from "../utils/format";
import type { Run } from "../types/run";
import shared from "../styles/shared.module.css";
import styles from "../styles/PlannedRunsPage.module.css";

export function PlannedRunsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);
  const [durationInput, setDurationInput] = useState("");

  const loadRuns = useCallback(() => {
    setLoading(true);
    listRuns()
      .then((data) => {
        setRuns(
          data
            .filter((r) => r.status === "planned")
            .sort((a, b) => new Date(a.runDate).getTime() - new Date(b.runDate).getTime())
        );
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  function parseDuration(input: string): number | null {
    const parts = input.split(":").map(Number);
    if (parts.some(isNaN)) return null;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return null;
  }

  async function handleComplete() {
    if (!completing) return;
    const seconds = parseDuration(durationInput);
    if (!seconds || seconds <= 0) return;

    try {
      await completeRun(completing, { durationSeconds: seconds });
      setCompleting(null);
      setDurationInput("");
      loadRuns();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to complete run";
      setError(message);
    }
  }

  async function handleDelete(runId: string) {
    if (!window.confirm("Delete this planned run?")) return;
    try {
      await deleteRun(runId);
      loadRuns();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete run";
      setError(message);
    }
  }

  if (loading) {
    return (
      <div className={shared.page}>
        <div className={shared.loadingState}>Loading planned runs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={shared.page}>
        <div className={shared.errorState}>{error}</div>
      </div>
    );
  }

  return (
    <div className={shared.page}>
      <div className={shared.pageHeader}>
        <h1 className={shared.pageTitle}>Planned Runs</h1>
      </div>

      {runs.length === 0 ? (
        <div className={shared.emptyState}>
          No planned runs. Create one from the New Run page!
        </div>
      ) : (
        runs.map((run) => (
          <div key={run.runId} className={shared.card}>
            <div className={shared.mapPlaceholder}>Route map</div>
            <div className={shared.cardTitle}>
              {run.title || "Untitled Run"}
            </div>
            <div className={shared.cardMeta}>{formatDate(run.runDate)}</div>
            {run.distanceMeters !== undefined && (
              <div className={shared.statsRow}>
                <span>{(run.distanceMeters / 1000).toFixed(2)} km</span>
              </div>
            )}
            <div className={styles.actions}>
              <button
                className={shared.buttonPrimary}
                onClick={() => {
                  setCompleting(run.runId);
                  setDurationInput("");
                }}
              >
                Run it!
              </button>
              <button
                className={shared.buttonDanger}
                onClick={() => handleDelete(run.runId)}
              >
                Delete
              </button>
            </div>
          </div>
        ))
      )}

      {completing && (
        <div className={styles.modal} onClick={() => setCompleting(null)}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={styles.modalTitle}>Complete Run</h3>
            <div className={shared.formGroup}>
              <label className={shared.formLabel} htmlFor="duration">
                Duration (HH:MM:SS or MM:SS)
              </label>
              <input
                id="duration"
                className={shared.formInput}
                type="text"
                placeholder="32:15"
                value={durationInput}
                onChange={(e) => setDurationInput(e.target.value)}
              />
            </div>
            <div className={styles.modalActions}>
              <button className={shared.buttonPrimary} onClick={handleComplete}>
                Complete
              </button>
              <button
                className={shared.buttonSecondary}
                onClick={() => setCompleting(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
