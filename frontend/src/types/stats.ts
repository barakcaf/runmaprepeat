export interface PeriodSummary {
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  runCount: number;
  avgPaceSecondsPerKm: number;
}

export interface WeeklyDistance {
  weekStart: string;
  distanceMeters: number;
}

export interface MonthlyDistance {
  month: string;
  distanceMeters: number;
}

export interface PersonalRecords {
  longestRunMeters: number;
  fastestPaceSecondsPerKm: number;
  mostDistanceInWeekMeters: number;
  mostRunsInWeek: number;
}

export interface AllTime {
  totalDistanceMeters: number;
  totalRuns: number;
  totalDurationSeconds: number;
}

export interface Stats {
  currentWeek: PeriodSummary;
  currentMonth: PeriodSummary;
  previousWeek: PeriodSummary;
  previousMonth: PeriodSummary;
  weeklyDistances: WeeklyDistance[];
  monthlyDistances: MonthlyDistance[];
  personalRecords: PersonalRecords;
  allTime: AllTime;
}
