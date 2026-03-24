import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { listRuns } from "../api/client";
import { formatDuration, formatPace, formatDate, formatDateTime, formatCalories, formatAudio } from "../utils/format";
import type { Run } from "../types/run";
import shared from "../styles/shared.module.css";
import styles from "../styles/Dashboard.module.css";

function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - diff);
  return monday;
}

interface WeeklyStats {
  runCount: number;
  totalDistanceKm: number;
  totalCalories: number;
  avgPaceSecondsPerKm: number | null;
}

function computeWeeklyStats(runs: Run[]): WeeklyStats {
  const weekStart = getWeekStart();
  const weekRuns = runs.filter(
    (r) => r.status === "completed" && new Date(r.runDate) >= weekStart
  );
  const totalDistanceKm = weekRuns.reduce(
    (sum, r) => sum + (r.distanceMeters ?? 0) / 1000,
    0
  );
  const totalCalories = weekRuns.reduce(
    (sum, r) => sum + (r.caloriesBurned ?? 0),
    0
  );
  const paces = weekRuns
    .map((r) => r.paceSecondsPerKm)
    .filter((p): p is number => p !== undefined && p > 0);
  const avgPace = paces.length > 0
    ? paces.reduce((a, b) => a + b, 0) / paces.length
    : null;

  return {
    runCount: weekRuns.length,
    totalDistanceKm,
    totalCalories,
    avgPaceSecondsPerKm: avgPace,
  };
}

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listRuns()
      .then((data) => {
        if (!cancelled) setRuns(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const completedRuns = useMemo(
    () =>
      runs
        .filter((r) => r.status === "completed")
        .sort((a, b) => new Date(b.runDate).getTime() - new Date(a.runDate).getTime()),
    [runs]
  );

  const weekly = useMemo(() => computeWeeklyStats(runs), [runs]);

  if (loading) {
    return (
      <div className={shared.page}>
        <div className={shared.loadingState}>Loading runs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={shared.page}>
        <div className={shared.errorState}>Failed to load runs: {error}</div>
      </div>
    );
  }

  return (
    <div className={shared.page}>
      <div className={shared.pageHeader}>
        <h1 className={shared.pageTitle}>
          Hi, {user?.email?.split("@")[0] ?? "Runner"}
        </h1>
      </div>

      <div className={styles.weeklyStats}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>🏃</div>
          <div className={styles.statValue}>{weekly.runCount}</div>
          <div className={styles.statLabel}>Runs this week</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>📏</div>
          <div className={styles.statValue}>{weekly.totalDistanceKm.toFixed(1)}</div>
          <div className={styles.statLabel}>km this week</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>🔥</div>
          <div className={styles.statValue}>{Math.round(weekly.totalCalories)}</div>
          <div className={styles.statLabel}>kcal burned</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>⚡</div>
          <div className={styles.statValue}>
            {weekly.avgPaceSecondsPerKm
              ? formatPace(weekly.avgPaceSecondsPerKm).replace(" /km", "")
              : "--"}
          </div>
          <div className={styles.statLabel}>avg pace /km</div>
        </div>
      </div>

      <h2 className={styles.sectionTitle}>Recent Runs</h2>

      {completedRuns.length === 0 ? (
        <div className={shared.emptyState}>
          No completed runs yet. Lace up and go!
        </div>
      ) : (
        completedRuns.map((run) => (
          <div
            key={run.runId}
            className={`${shared.card} ${styles.runCard}`}
            onClick={() => navigate(`/runs/${run.runId}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter") navigate(`/runs/${run.runId}`);
            }}
          >
            <div className={shared.mapPlaceholder}>Route map</div>
            <div className={shared.cardTitle}>
              {run.title || "Untitled Run"}
            </div>
            <div className={shared.cardMeta}>
              {formatDateTime(run.runDate)}
            </div>
            <div className={shared.statsRow}>
              {run.distanceMeters !== undefined && (
                <span>{(run.distanceMeters / 1000).toFixed(2)} km</span>
              )}
              {run.durationSeconds !== undefined && (
                <span>{formatDuration(run.durationSeconds)}</span>
              )}
              {run.paceSecondsPerKm !== undefined && (
                <span>{formatPace(run.paceSecondsPerKm)}</span>
              )}
              {run.caloriesBurned !== undefined && (
                <span>{formatCalories(run.caloriesBurned)}</span>
              )}
            </div>
            {run.audio && (
              <div className={shared.audioLine}>
                {run.audio.type === "music" ? "🎵" : "🎙️"}{" "}
                {formatAudio(run.audio)}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
