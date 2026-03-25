import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { listRuns, getStats } from "../api/client";
import { RouteMap } from "../components/Map/RouteMap";
import { StatsCards } from "../components/Dashboard/StatsCards";
import { WeeklyDistanceChart } from "../components/Dashboard/WeeklyDistanceChart";
import { MonthlyDistanceChart } from "../components/Dashboard/MonthlyDistanceChart";
import { formatDuration, formatPace, formatDate, formatDateTime, formatCalories, formatAudio } from "../utils/format";
import type { Run } from "../types/run";
import { normalizeAudio } from "../types/audio";
import type { WeeklyDistance, MonthlyDistance } from "../types/stats";
import shared from "../styles/shared.module.css";
import styles from "../styles/Dashboard.module.css";

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [runs, setRuns] = useState<Run[]>([]);
  const [weeklyDistances, setWeeklyDistances] = useState<WeeklyDistance[]>([]);
  const [monthlyDistances, setMonthlyDistances] = useState<MonthlyDistance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([listRuns(), getStats()])
      .then(([runsData, statsData]) => {
        if (!cancelled) {
          setRuns(runsData);
          setWeeklyDistances(statsData.weeklyDistances);
          setMonthlyDistances(statsData.monthlyDistances);
        }
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

      <StatsCards />

      <WeeklyDistanceChart weeklyDistances={weeklyDistances} />

      <h2 className={styles.sectionTitle}>Monthly Distance</h2>
      <div className={`${shared.card}`} style={{ padding: "0.75rem" }}>
        <MonthlyDistanceChart monthlyDistances={monthlyDistances} />
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
            {run.route && run.route.length >= 2 ? (
              <RouteMap route={run.route} height="120px" />
            ) : (
              <div className={shared.mapPlaceholder}>No route</div>
            )}
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
            {normalizeAudio(run.audio).length > 0 && (
              <div className={shared.audioLine}>
                {"🎵"}{" "}
                {formatAudio(normalizeAudio(run.audio)[0])}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
