import { useEffect, useState } from "react";
import { getStats } from "../../api/client";
import { formatDuration, formatPace } from "../../utils/format";
import type { Stats, PeriodSummary } from "../../types/stats";
import styles from "./StatsCards.module.css";

function formatDistance(meters: number): string {
  return (meters / 1000).toFixed(1);
}

function formatAvgPace(secondsPerKm: number): string {
  if (secondsPerKm <= 0) return "--";
  return formatPace(secondsPerKm).replace(" /km", "");
}

interface ComparisonResult {
  label: string;
  direction: "up" | "down" | "neutral";
}

function computeComparison(current: number, previous: number): ComparisonResult {
  if (previous === 0 && current === 0) {
    return { label: "--", direction: "neutral" };
  }
  if (previous === 0) {
    return { label: "New", direction: "up" };
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) {
    return { label: "0%", direction: "neutral" };
  }
  if (pct > 0) {
    return { label: `+${pct}%`, direction: "up" };
  }
  return { label: `${pct}%`, direction: "down" };
}

function comparisonClassName(direction: "up" | "down" | "neutral"): string {
  if (direction === "up") return styles.comparisonUp;
  if (direction === "down") return styles.comparisonDown;
  return styles.comparisonNeutral;
}

function comparisonArrow(direction: "up" | "down" | "neutral"): string {
  if (direction === "up") return "\u2191";
  if (direction === "down") return "\u2193";
  return "";
}

interface PeriodCardsProps {
  title: string;
  current: PeriodSummary;
  previous: PeriodSummary;
}

function PeriodCards({ title, current, previous }: PeriodCardsProps) {
  const distComp = computeComparison(current.totalDistanceMeters, previous.totalDistanceMeters);
  const runsComp = computeComparison(current.runCount, previous.runCount);
  const timeComp = computeComparison(current.totalDurationSeconds, previous.totalDurationSeconds);
  // For pace, lower is better, so invert direction
  const paceComp = computeComparison(previous.avgPaceSecondsPerKm, current.avgPaceSecondsPerKm);

  return (
    <>
      <div className={styles.periodTitle} data-testid={`period-title-${title.toLowerCase().replace(/\s/g, "-")}`}>
        {title}
      </div>
      <div className={styles.statsGrid}>
        <div className={styles.card} data-testid="stat-card-distance">
          <div className={styles.cardValue}>{formatDistance(current.totalDistanceMeters)}</div>
          <div className={styles.cardLabel}>km</div>
          <div className={comparisonClassName(distComp.direction)}>
            {comparisonArrow(distComp.direction)} {distComp.label}
          </div>
        </div>
        <div className={styles.card} data-testid="stat-card-runs">
          <div className={styles.cardValue}>{current.runCount}</div>
          <div className={styles.cardLabel}>runs</div>
          <div className={comparisonClassName(runsComp.direction)}>
            {comparisonArrow(runsComp.direction)} {runsComp.label}
          </div>
        </div>
        <div className={styles.card} data-testid="stat-card-time">
          <div className={styles.cardValue}>{formatDuration(current.totalDurationSeconds)}</div>
          <div className={styles.cardLabel}>time</div>
          <div className={comparisonClassName(timeComp.direction)}>
            {comparisonArrow(timeComp.direction)} {timeComp.label}
          </div>
        </div>
        <div className={styles.card} data-testid="stat-card-pace">
          <div className={styles.cardValue}>{formatAvgPace(current.avgPaceSecondsPerKm)}</div>
          <div className={styles.cardLabel}>avg pace /km</div>
          <div className={comparisonClassName(paceComp.direction)}>
            {comparisonArrow(paceComp.direction)} {paceComp.label}
          </div>
        </div>
      </div>
    </>
  );
}

function LoadingSkeleton() {
  return (
    <div className={styles.statsSection} data-testid="stats-loading">
      {[0, 1].map((i) => (
        <div key={i}>
          <div className={styles.skeletonTitle} />
          <div className={styles.statsGrid}>
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className={styles.skeletonCard}>
                <div className={styles.skeletonValue} />
                <div className={styles.skeletonLabel} />
                <div className={styles.skeletonComparison} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className={styles.statsSection} data-testid="stats-empty">
      <div className={styles.emptyState}>
        No stats yet. Complete your first run to see your progress!
      </div>
    </div>
  );
}

export function StatsCards() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getStats()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return null;
  }

  if (!stats || (stats.currentWeek.runCount === 0 && stats.currentMonth.runCount === 0 &&
      stats.previousWeek.runCount === 0 && stats.previousMonth.runCount === 0)) {
    return <EmptyState />;
  }

  return (
    <div className={styles.statsSection} data-testid="stats-cards">
      <PeriodCards title="This Week" current={stats.currentWeek} previous={stats.previousWeek} />
      <PeriodCards title="This Month" current={stats.currentMonth} previous={stats.previousMonth} />
    </div>
  );
}
