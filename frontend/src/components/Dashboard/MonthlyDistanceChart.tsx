import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { MonthlyDistance } from "../../types/stats";

interface ChartDataPoint {
  label: string;
  month: string;
  distanceKm: number;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const BAR_COLOR = "#ff6b35";
const CURRENT_MONTH_COLOR = "#e85d2c";

export function toChartData(monthlyDistances: MonthlyDistance[]): ChartDataPoint[] {
  return monthlyDistances.map((md) => {
    const [, monthStr] = md.month.split("-");
    const monthIndex = parseInt(monthStr, 10) - 1;
    return {
      label: MONTH_NAMES[monthIndex] ?? md.month,
      month: md.month,
      distanceKm: parseFloat((md.distanceMeters / 1000).toFixed(2)),
    };
  });
}

function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

interface MonthlyDistanceChartProps {
  monthlyDistances: MonthlyDistance[];
}

export function MonthlyDistanceChart({ monthlyDistances }: MonthlyDistanceChartProps) {
  const data = useMemo(() => toChartData(monthlyDistances), [monthlyDistances]);
  const currentMonth = getCurrentMonth();

  if (data.length === 0) {
    return <div data-testid="monthly-chart-empty">No monthly data yet</div>;
  }

  return (
    <div data-testid="monthly-distance-chart" style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            unit=" km"
            width={60}
          />
          <Tooltip
            formatter={(value) => [`${value} km`, "Distance"]}
            contentStyle={{ borderRadius: 8, fontSize: 13 }}
          />
          <Bar dataKey="distanceKm" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.month}
                fill={entry.month === currentMonth ? CURRENT_MONTH_COLOR : BAR_COLOR}
                opacity={entry.month === currentMonth ? 1 : 0.7}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
