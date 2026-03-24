import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import type { WeeklyDistance } from "../../types/stats";
import { buildChartData } from "./weeklyDistanceData";
import styles from "./WeeklyDistanceChart.module.css";

interface Props {
  weeklyDistances: WeeklyDistance[];
}

const CURRENT_WEEK_COLOR = "#ff6b35";
const PAST_WEEK_COLOR = "#ffb899";

export function WeeklyDistanceChart({ weeklyDistances }: Props) {
  const data = useMemo(() => buildChartData(weeklyDistances), [weeklyDistances]);

  return (
    <div className={styles.chartSection} data-testid="weekly-distance-chart">
      <h3 className={styles.chartTitle}>Weekly Distance</h3>
      <div className={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#666" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#666" }}
              tickLine={false}
              axisLine={false}
              unit=" km"
              width={56}
            />
            <Tooltip
              formatter={(value) => [`${value} km`, "Distance"]}
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
            />
            <Bar dataKey="distanceKm" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.isCurrentWeek ? CURRENT_WEEK_COLOR : PAST_WEEK_COLOR}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
