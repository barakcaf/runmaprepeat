import type { AudioRef } from "./audio";

export type Coordinate = [number, number]; // [lng, lat] — MapLibre convention

export interface Run {
  runId: string;
  status: "planned" | "completed";
  runDate: string;
  createdAt: string;
  updatedAt: string;
  title?: string;
  route?: Coordinate[];
  distanceMeters?: number;
  durationSeconds?: number;
  elevationGainMeters?: number;
  notes?: string;
  audio?: AudioRef;
  paceSecondsPerKm?: number;
  caloriesBurned?: number;
}

export interface CreateRunPayload {
  status: "planned" | "completed";
  runDate: string;
  title?: string;
  route?: Coordinate[];
  distanceMeters?: number;
  durationSeconds?: number;
  elevationGainMeters?: number;
  notes?: string;
  audio?: AudioRef;
}

export interface UpdateRunPayload {
  title?: string;
  runDate?: string;
  notes?: string;
  route?: Coordinate[];
  distanceMeters?: number;
  durationSeconds?: number;
  elevationGainMeters?: number;
  audio?: AudioRef | null;
}

export interface CompleteRunPayload {
  durationSeconds: number;
}
