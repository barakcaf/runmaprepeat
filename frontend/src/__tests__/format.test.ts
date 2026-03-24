import { describe, it, expect } from "vitest";
import {
  formatDuration,
  formatPace,
  formatDate,
  formatDateTime,
  formatCalories,
  formatAudio,
} from "../utils/format";
import type { MusicAudio, PodcastAudio } from "../types/run";

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
  it("formats podcast with episode", () => {
    const audio: PodcastAudio = {
      type: "podcast",
      name: "Huberman Lab",
      detail: "Ep. 234",
    };
    expect(formatAudio(audio)).toBe("Huberman Lab - Ep. 234");
  });

  it("formats podcast without episode", () => {
    const audio: PodcastAudio = { type: "podcast", name: "Huberman Lab" };
    expect(formatAudio(audio)).toBe("Huberman Lab");
  });

  it("formats music artist with album", () => {
    const audio: MusicAudio = {
      type: "music",
      subtype: "artist",
      format: "album",
      name: "Dua Lipa",
      detail: "Future Nostalgia",
    };
    expect(formatAudio(audio)).toBe("Dua Lipa - Album: Future Nostalgia");
  });

  it("formats music artist with mix", () => {
    const audio: MusicAudio = {
      type: "music",
      subtype: "artist",
      format: "mix",
      name: "Dua Lipa",
      detail: "Club Mix",
    };
    expect(formatAudio(audio)).toBe("Dua Lipa - Mix: Club Mix");
  });

  it("formats music artist without detail", () => {
    const audio: MusicAudio = {
      type: "music",
      subtype: "artist",
      format: "album",
      name: "Dua Lipa",
    };
    expect(formatAudio(audio)).toBe("Dua Lipa");
  });

  it("formats playlist", () => {
    const audio: MusicAudio = {
      type: "music",
      subtype: "playlist",
      name: "Running Hits",
    };
    expect(formatAudio(audio)).toBe("Running Hits");
  });
});
