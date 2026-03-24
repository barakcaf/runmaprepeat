export type Coordinate = [number, number]; // [lng, lat] — MapLibre convention

export interface MusicAudio {
  type: "music";
  subtype: "artist" | "playlist";
  name: string;
  detail?: string;
  format?: "album" | "mix";
}

export interface PodcastAudio {
  type: "podcast";
  name: string;
  detail?: string;
}

export type Audio = MusicAudio | PodcastAudio;

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
  audio?: Audio;
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
  audio?: Audio;
}

export interface UpdateRunPayload {
  title?: string;
  runDate?: string;
  notes?: string;
  route?: Coordinate[];
  distanceMeters?: number;
  durationSeconds?: number;
  elevationGainMeters?: number;
  audio?: Audio;
}

export interface CompleteRunPayload {
  durationSeconds: number;
}
