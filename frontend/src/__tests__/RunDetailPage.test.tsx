import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RunDetailPage } from "../pages/RunDetailPage";
import type { Run } from "../types/run";

const mockGetRun = vi.fn();
const mockUpdateRun = vi.fn();

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
    updateRun: (...args: unknown[]) => mockUpdateRun(...args),
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
        imageUrl: "https://i.scdn.co/image/img.jpg",
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
    expect(artwork).toHaveAttribute("src", "https://i.scdn.co/image/img.jpg");
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

describe("RunDetailPage edit — date preservation (regression #89)", () => {
  beforeEach(() => {
    mockGetRun.mockReset();
    mockUpdateRun.mockReset();
  });

  it("does not send runDate when date is unchanged", async () => {
    const run: Run = {
      ...baseRun,
      runDate: "2026-03-24T07:30:00Z",
    };
    mockGetRun.mockResolvedValue(run);
    mockUpdateRun.mockResolvedValue(run);

    const user = userEvent.setup();
    renderRunDetail();

    await waitFor(() => {
      expect(screen.getByText("Morning Run")).toBeInTheDocument();
    });

    // Enter edit mode
    await user.click(screen.getByText("Edit"));

    // Change only the title
    const titleInput = screen.getByLabelText("Title");
    await user.clear(titleInput);
    await user.type(titleInput, "Evening Run");

    // Save without changing date
    await user.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(mockUpdateRun).toHaveBeenCalledWith("run-1", {
        title: "Evening Run",
        notes: undefined,
      });
    });

    // Verify runDate was NOT sent (preserves original)
    const callArgs = mockUpdateRun.mock.calls[0][1];
    expect(callArgs).not.toHaveProperty("runDate");
  });

  it("preserves time component when date is changed", async () => {
    const run: Run = {
      ...baseRun,
      runDate: "2026-03-24T07:30:00.000Z",
    };
    mockGetRun.mockResolvedValue(run);
    mockUpdateRun.mockResolvedValue({ ...run, runDate: "2026-03-25T07:30:00.000Z" });

    const user = userEvent.setup();
    renderRunDetail();

    await waitFor(() => {
      expect(screen.getByText("Morning Run")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Edit"));

    // Change the date
    const dateInput = screen.getByLabelText("Date");
    fireEvent.change(dateInput, { target: { value: "2026-03-25" } });

    // Verify the input value actually changed
    expect((dateInput as HTMLInputElement).value).toBe("2026-03-25");

    await user.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(mockUpdateRun).toHaveBeenCalled();
    });

    // The sent runDate should have the new date but preserve the original time
    const callArgs = mockUpdateRun.mock.calls[0][1];
    expect(callArgs).toHaveProperty("runDate");
    const sentDate = new Date(callArgs.runDate);
    expect(sentDate.getUTCHours()).toBe(7);
    expect(sentDate.getUTCMinutes()).toBe(30);
  });
});
