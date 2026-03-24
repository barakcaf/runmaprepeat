import type { Audio } from "../types/run";

export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, "0");

  if (hrs > 0) {
    return `${hrs}:${pad(mins)}:${pad(secs)}`;
  }
  return `${mins}:${pad(secs)}`;
}

export function formatPace(secondsPerKm: number): string {
  const mins = Math.floor(secondsPerKm / 60);
  const secs = Math.floor(secondsPerKm % 60);
  return `${mins}:${String(secs).padStart(2, "0")} /km`;
}

export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatCalories(cal: number): string {
  return `${cal.toLocaleString("en-US")} kcal`;
}

export function formatAudio(audio: Audio): string {
  if (audio.type === "podcast") {
    return audio.detail
      ? `${audio.name} - ${audio.detail}`
      : audio.name;
  }
  if (audio.subtype === "playlist") {
    return audio.name;
  }
  // artist
  const label = audio.format === "album" ? "Album" : "Mix";
  if (audio.detail) {
    return `${audio.name} - ${label}: ${audio.detail}`;
  }
  return audio.name;
}
