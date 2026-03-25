import { describe, it, expect } from "vitest";
import {
  formatDuration,
  formatPace,
  formatDate,
  formatDateTime,
  formatCalories,
  formatAudio,
} from "../utils/format";
import type { SpotifyRef, ManualAudioRef } from "../types/audio";

describe("formatDuration", () => {
  it("formats seconds under an hour as MM:SS", () => {
    expect(formatDuration(1935)).toBe("32:15");
  });

  it("formats seconds over an hour as H:MM:SS", () => {
    expect(formatDuration(3735)).toBe("1:02:15");
  });

  it("pads seconds correctly", () => {
    expect(formatDuration(61)).toBe("1:01");
  });

  it("handles zero", () => {
    expect(formatDuration(0)).toBe("0:00");
  });
});

describe("formatPace", () => {
  it("formats pace as M:SS /km", () => {
    expect(formatPace(332)).toBe("5:32 /km");
  });

  it("pads seconds", () => {
    expect(formatPace(305)).toBe("5:05 /km");
  });
});

describe("formatDate", () => {
  it("formats ISO string as readable date", () => {
    const result = formatDate("2026-03-24T07:30:00Z");
    expect(result).toContain("Mar");
    expect(result).toContain("24");
    expect(result).toContain("2026");
  });
});

describe("formatDateTime", () => {
  it("formats ISO string as date and time", () => {
    const result = formatDateTime("2026-03-24T07:30:00Z");
    expect(result).toContain("Mar");
    expect(result).toContain("24");
  });
});

describe("formatCalories", () => {
  it("formats calories with comma separator and kcal", () => {
    expect(formatCalories(1840)).toBe("1,840 kcal");
  });

  it("formats small numbers without comma", () => {
    expect(formatCalories(500)).toBe("500 kcal");
  });
});

describe("formatAudio", () => {
  it("formats spotify ref with artist name", () => {
    const audio: SpotifyRef = {
      source: "spotify",
      spotifyId: "abc123",
      type: "track",
      name: "Levitating",
      artistName: "Dua Lipa",
      imageUrl: "https://example.com/img.jpg",
      spotifyUrl: "https://open.spotify.com/track/abc123",
    };
    expect(formatAudio(audio)).toBe("Levitating - Dua Lipa");
  });

  it("formats spotify ref without artist name", () => {
    const audio: SpotifyRef = {
      source: "spotify",
      spotifyId: "abc123",
      type: "artist",
      name: "Dua Lipa",
      imageUrl: null,
      spotifyUrl: "https://open.spotify.com/artist/abc123",
    };
    expect(formatAudio(audio)).toBe("Dua Lipa");
  });

  it("formats manual ref with artist name", () => {
    const audio: ManualAudioRef = {
      source: "manual",
      name: "Future Nostalgia",
      artistName: "Dua Lipa",
    };
    expect(formatAudio(audio)).toBe("Future Nostalgia - Dua Lipa");
  });

  it("formats manual ref without artist name", () => {
    const audio: ManualAudioRef = {
      source: "manual",
      name: "Running Hits",
    };
    expect(formatAudio(audio)).toBe("Running Hits");
  });
});
