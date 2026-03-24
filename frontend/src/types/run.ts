export type Coordinate = [number, number]; // [lng, lat] — MapLibre convention

export interface Audio {
  type: "music" | "podcast";
  subtype?: string;
  format?: string;
  name: string;
  detail?: string;
}

export interface Run {
  runId: string;
  status: "planned" | "completed" | "skipped";
  runDate: string;
  createdAt: string;
  updatedAt: string;
  title?: string;
  route?: Coordinate[];
  distanceMeters?: number;
  durationSeconds?: number;
  paceSecondsPerKm?: number;
  caloriesBurned?: number;
  elevationGainMeters?: number;
  notes?: string;
  audio?: Audio;
}

export interface UserProfile {
  weightKg: number;
  heightCm: number;
  birthDate: string;
  displayName?: string;
  updatedAt: string;
}
