import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeAll } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RunDetailPage } from "../pages/RunDetailPage";
import type { Run } from "../types/run";

const mockGetRun = vi.fn();

beforeAll(() => {
  vi.mock("maplibre-gl", () => {
    const Map = vi.fn().mockImplementation(() => ({
      on: vi.fn((_event: string, cb: () => void) => cb()),
      remove: vi.fn(),
      addSource: vi.fn(),
      addLayer: vi.fn(),
      getSource: vi.fn(),
      fitBounds: vi.fn(),
      getStyle: vi.fn().mockReturnValue({ layers: [] }),
      setLayoutProperty: vi.fn(),
    }));

    const LngLatBounds = vi.fn().mockImplementation(() => ({
      extend: vi.fn().mockReturnThis(),
    }));

    return {
      default: { Map, LngLatBounds },
      Map,
      LngLatBounds,
    };
  });

  vi.mock("../api/client", () => ({
    getRun: (...args: unknown[]) => mockGetRun(...args),
    updateRun: vi.fn(),
    deleteRun: vi.fn(),
    completeRun: vi.fn(),
  }));
});

function renderRunDetail(runId = "run-1") {
  return render(
    <MemoryRouter initialEntries={[`/runs/${runId}`]}>
      <Routes>
        <Route path="/runs/:runId" element={<RunDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

const baseRun: Run = {
  runId: "run-1",
  status: "completed",
  runDate: "2026-03-24T07:30:00Z",
  createdAt: "2026-03-24T07:30:00Z",
  updatedAt: "2026-03-24T07:30:00Z",
  title: "Morning Run",
  distanceMeters: 5000,
  durationSeconds: 1800,
};

describe("RunDetailPage audio display", () => {
  it("shows spotify audio with artwork and Open in Spotify link", async () => {
    const run: Run = {
      ...baseRun,
      audio: {
        source: "spotify",
        spotifyId: "track1",
        type: "track",
        name: "Levitating",
        artistName: "Dua Lipa",
        imageUrl: "https://example.com/img.jpg",
        spotifyUrl: "https://open.spotify.com/track/track1",
      },
    };
    mockGetRun.mockResolvedValue(run);

    renderRunDetail();

    await waitFor(() => {
      expect(screen.getByText("Levitating")).toBeInTheDocument();
    });

    expect(screen.getByText("Dua Lipa")).toBeInTheDocument();
    const link = screen.getByText("Open in Spotify");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "https://open.spotify.com/track/track1");
    expect(link).toHaveAttribute("target", "_blank");

    const artwork = screen.getByAltText("Levitating");
    expect(artwork).toHaveAttribute("src", "https://example.com/img.jpg");
  });

  it("shows manual audio as plain text", async () => {
    const run: Run = {
      ...baseRun,
      audio: {
        source: "manual",
        name: "Running Hits",
        artistName: "Various",
      },
    };
    mockGetRun.mockResolvedValue(run);

    renderRunDetail();

    await waitFor(() => {
      expect(screen.getByText("Running Hits - Various")).toBeInTheDocument();
    });

    expect(screen.queryByText("Open in Spotify")).not.toBeInTheDocument();
  });

  it("hides audio section when no audio", async () => {
    mockGetRun.mockResolvedValue(baseRun);

    renderRunDetail();

    await waitFor(() => {
      expect(screen.getByText("Morning Run")).toBeInTheDocument();
    });

    expect(screen.queryByText("Audio")).not.toBeInTheDocument();
  });

  it("shows spotify audio without artwork when imageUrl is null", async () => {
    const run: Run = {
      ...baseRun,
      audio: {
        source: "spotify",
        spotifyId: "artist1",
        type: "artist",
        name: "Dua Lipa",
        imageUrl: null,
        spotifyUrl: "https://open.spotify.com/artist/artist1",
      },
    };
    mockGetRun.mockResolvedValue(run);

    renderRunDetail();

    await waitFor(() => {
      expect(screen.getByText("Dua Lipa")).toBeInTheDocument();
    });

    expect(screen.getByText("Open in Spotify")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
