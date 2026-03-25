import { fetchAuthSession } from "@aws-amplify/auth";
import type { Run, CreateRunPayload, UpdateRunPayload, CompleteRunPayload } from "../types/run";
import type { SpotifyRef } from "../types/audio";
import type { Profile } from "../types/profile";
import type { Stats } from "../types/stats";

const BASE_URL = import.meta.env.VITE_API_URL as string;

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function getAuthToken(): Promise<string> {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();
  if (!token) {
    throw new ApiError(401, "No valid session");
  }
  return token;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAuthToken();
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new ApiError(response.status, body || response.statusText);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function getProfile(): Promise<Profile> {
  return request<Profile>("/profile");
}

export function updateProfile(data: Profile): Promise<Profile> {
  return request<Profile>("/profile", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function createRun(data: CreateRunPayload): Promise<Run> {
  return request<Run>("/runs", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function listRuns(): Promise<Run[]> {
  return request<Run[]>("/runs");
}

export function getRun(id: string): Promise<Run> {
  return request<Run>(`/runs/${id}`);
}

export function updateRun(id: string, data: UpdateRunPayload): Promise<Run> {
  return request<Run>(`/runs/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteRun(id: string): Promise<void> {
  return request<void>(`/runs/${id}`, {
    method: "DELETE",
  });
}

export function completeRun(id: string, data: CompleteRunPayload): Promise<Run> {
  return request<Run>(`/runs/${id}/complete`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getStats(): Promise<Stats> {
  return request<Stats>("/stats");
}

export interface CalculateRouteResponse {
  geometry: [number, number][];
  distanceMeters: number;
}

export function calculateRoute(waypoints: [number, number][]): Promise<CalculateRouteResponse> {
  return request<CalculateRouteResponse>("/routes/calculate", {
    method: "POST",
    body: JSON.stringify({ waypoints }),
  });
}

export interface SpotifySearchResult {
  artists?: SpotifyRef[];
  albums?: SpotifyRef[];
  tracks?: SpotifyRef[];
}

export function searchSpotify(query: string, types?: string[]): Promise<SpotifySearchResult> {
  const params = new URLSearchParams({ q: query });
  if (types?.length) params.append('type', types.join(','));
  return request<SpotifySearchResult>(`/spotify/search?${params}`);
}
