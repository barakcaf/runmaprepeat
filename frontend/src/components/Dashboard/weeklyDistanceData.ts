import type { WeeklyDistance } from "../../types/stats";

export interface ChartBar {
  label: string;
  distanceKm: number;
  isCurrentWeek: boolean;
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function buildChartData(
  weeklyDistances: WeeklyDistance[],
  now: Date = new Date()
): ChartBar[] {
  const currentMonday = getMonday(now);

  const weekMap = new Map<string, number>();
  for (const wd of weeklyDistances) {
    weekMap.set(wd.weekStart, wd.distanceMeters);
  }

  const bars: ChartBar[] = [];
  for (let i = 7; i >= 0; i--) {
    const monday = new Date(currentMonday);
    monday.setDate(monday.getDate() - i * 7);
    const key = monday.toISOString().slice(0, 10);
    const distanceMeters = weekMap.get(key) ?? 0;
    bars.push({
      label: formatWeekLabel(key),
      distanceKm: Math.round((distanceMeters / 1000) * 100) / 100,
      isCurrentWeek: i === 0,
    });
  }

  return bars;
}
