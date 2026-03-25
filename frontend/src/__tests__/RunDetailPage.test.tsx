import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RunDetailPage } from "../pages/RunDetailPage";
import type { Run } from "../types/run";

const mockGetRun = vi.fn();
const mockUpdateRun = vi.fn();
const mockDeleteRun = vi.fn();
const mockSearchSpotify = vi.fn();

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
    deleteRun: (...args: unknown[]) => mockDeleteRun(...args),
    searchSpotify: (...args: unknown[]) => mockSearchSpotify(...args),
  }));
});

beforeEach(() => {
  vi.clearAllMocks();
});

function renderRunDetail(runId = "run-1") {
  return render(
    <MemoryRouter initialEntries={[`/runs/${runId}`]}>
      <Routes>
        <Route path="/runs/:runId" element={<RunDetailPage />} />
        <Route path="/" element={<div>Home</div>} />
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

describe("RunDetailPage view mode", () => {
  it("shows title, date, and stats", async () => {
    const run: Run = {
      ...baseRun,
      paceSecondsPerKm: 360,
      caloriesBurned: 420,
      elevationGainMeters: 85,
    };
    mockGetRun.mockResolvedValue(run);

    renderRunDetail();

    await waitFor(() => {
      expect(screen.getByText("Morning Run")).toBeInTheDocument();
    });

    expect(screen.getByText("5.00 km")).toBeInTheDocument();
    expect(screen.getByText("30:00")).toBeInTheDocument();
    expect(screen.getByText("6:00 /km")).toBeInTheDocument();
    expect(screen.getByText("420 kcal")).toBeInTheDocument();
    expect(screen.getByText("85 m")).toBeInTheDocument();
  });

  it("shows Untitled Run when title is missing", async () => {
    mockGetRun.mockResolvedValue({ ...baseRun, title: undefined });

    renderRunDetail();

    await waitFor(() => {
      expect(screen.getByText("Untitled Run")).toBeInTheDocument();
    });
  });

  it("shows notes section", async () => {
    mockGetRun.mockResolvedValue({ ...baseRun, notes: "Felt great today!" });

    renderRunDetail();

    await waitFor(() => {
      expect(screen.getByText("Felt great today!")).toBeInTheDocument();
    });
  });

  it("hides notes section when no notes", async () => {
    mockGetRun.mockResolvedValue(baseRun);

    renderRunDetail();

    await waitFor(() => {
      expect(screen.getByText("Morning Run")).toBeInTheDocument();
    });

    expect(screen.queryByText("Notes")).not.toBeInTheDocument();
  });

  it("shows no route recorded placeholder", async () => {
    mockGetRun.mockResolvedValue(baseRun);

    renderRunDetail();

    await waitFor(() => {
      expect(screen.getByText("No route recorded")).toBeInTheDocument();
    });
  });
});

describe("RunDetailPage audio display", () => {
  it("shows spotify audio with artwork and Open in Spotify link (legacy single)", async () => {
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

  it("shows multiple spotify audio items (array format)", async () => {
    const run: Run = {
      ...baseRun,
      audio: [
        {
          source: "spotify",
          spotifyId: "artist1",
          type: "artist",
          name: "Dua Lipa",
          imageUrl: "https://i.scdn.co/image/dua.jpg",
          spotifyUrl: "https://open.spotify.com/artist/artist1",
        },
        {
          source: "spotify",
          spotifyId: "album1",
          type: "album",
          name: "Future Nostalgia",
          artistName: "Dua Lipa",
          imageUrl: "https://i.scdn.co/image/fn.jpg",
          spotifyUrl: "https://open.spotify.com/album/album1",
        },
      ],
    };
    mockGetRun.mockResolvedValue(run);

    renderRunDetail();

    await waitFor(() => {
      expect(screen.getByText("Future Nostalgia")).toBeInTheDocument();
    });

    const links = screen.getAllByText("Open in Spotify");
    expect(links).toHaveLength(2);
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

    expect(screen.queryByText("Music")).not.toBeInTheDocument();
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

describe("RunDetailPage edit mode", () => {
  it("enters edit mode and shows all fields", async () => {
    const run: Run = {
      ...baseRun,
      notes: "Good run",
      elevationGainMeters: 50,
    };
    mockGetRun.mockResolvedValue(run);

    renderRunDetail();

    await waitFor(() => {
      expect(screen.getByText("Morning Run")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Edit"));

    expect(screen.getByLabelText("Title")).toHaveValue("Morning Run");
    expect(screen.getByLabelText("Date")).toBeInTheDocument();
    expect(screen.getByLabelText("Duration (HH:MM:SS)")).toHaveValue("00:30:00");
    expect(screen.getByLabelText("Distance (km)")).toHaveValue(5);
    expect(screen.getByLabelText("Elevation gain (m)")).toHaveValue(50);
    expect(screen.getByLabelText("Notes")).toHaveValue("Good run");
  });

  it("saves edited duration and distance", async () => {
    mockGetRun.mockResolvedValue(baseRun);
    mockUpdateRun.mockResolvedValue({
      ...baseRun,
      durationSeconds: 2400,
      distanceMeters: 8000,
    });

    const user = userEvent.setup();
    renderRunDetail();

    await waitFor(() => {
      expect(screen.getByText("Morning Run")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Edit"));

    const durationInput = screen.getByLabelText("Duration (HH:MM:SS)");
    await user.clear(durationInput);
    await user.type(durationInput, "00:40:00");

    const distanceInput = screen.getByLabelText("Distance (km)");
    await user.clear(distanceInput);
    await user.type(distanceInput, "8.00");

    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(mockUpdateRun).toHaveBeenCalledWith("run-1", expect.objectContaining({
        durationSeconds: 2400,
        distanceMeters: 8000,
      }));
    });
  });

  it("shows validation error for invalid duration", async () => {
    mockGetRun.mockResolvedValue(baseRun);

    const user = userEvent.setup();
    renderRunDetail();

    await waitFor(() => {
      expect(screen.getByText("Morning Run")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Edit"));

    const durationInput = screen.getByLabelText("Duration (HH:MM:SS)");
    await user.clear(durationInput);
    await user.type(durationInput, "abc");

    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(screen.getByText("Invalid duration format. Use HH:MM:SS or MM:SS.")).toBeInTheDocument();
    });

    expect(mockUpdateRun).not.toHaveBeenCalled();
  });

  it("cancels edit mode and restores original values", async () => {
    mockGetRun.mockResolvedValue(baseRun);

    const user = userEvent.setup();
    renderRunDetail();

    await waitFor(() => {
      expect(screen.getByText("Morning Run")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Edit"));

    const titleInput = screen.getByLabelText("Title");
    await user.clear(titleInput);
    await user.type(titleInput, "Changed Title");

    fireEvent.click(screen.getByText("Cancel"));

    expect(screen.getByText("Morning Run")).toBeInTheDocument();
    expect(screen.queryByLabelText("Title")).not.toBeInTheDocument();
  });
});

describe("RunDetailPage spotify editing", () => {
  it("shows SpotifySearch in edit mode", async () => {
    mockGetRun.mockResolvedValue(baseRun);

    renderRunDetail();

    await waitFor(() => {
      expect(screen.getByText("Morning Run")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Edit"));

    expect(screen.getByText("Search Spotify")).toBeInTheDocument();
    expect(screen.getByText("Enter manually")).toBeInTheDocument();
  });

  it("shows current spotify audio with remove button in edit mode", async () => {
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

    fireEvent.click(screen.getByText("Edit"));

    // SpotifySearch chip shows the current audio with remove button
    expect(screen.getByTestId("spotify-chip")).toBeInTheDocument();
    expect(screen.getByText("Dua Lipa")).toBeInTheDocument();
    expect(screen.getByLabelText("Remove Levitating")).toBeInTheDocument();
  });

  it("removes audio when Remove is clicked and saves with null", async () => {
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
    mockUpdateRun.mockResolvedValue({ ...baseRun, audio: undefined });

    renderRunDetail();

    await waitFor(() => {
      expect(screen.getByText("Levitating")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Edit"));
    fireEvent.click(screen.getByLabelText("Remove Levitating"));
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(mockUpdateRun).toHaveBeenCalledWith("run-1", expect.objectContaining({
        audio: null,
      }));
    });
  });
});

describe("RunDetailPage delete", () => {
  it("deletes run after confirmation and navigates home", async () => {
    mockGetRun.mockResolvedValue(baseRun);
    mockDeleteRun.mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    renderRunDetail();

    await waitFor(() => {
      expect(screen.getByText("Morning Run")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Delete"));

    await waitFor(() => {
      expect(mockDeleteRun).toHaveBeenCalledWith("run-1");
    });

    await waitFor(() => {
      expect(screen.getByText("Home")).toBeInTheDocument();
    });
  });

  it("does not delete when confirmation is cancelled", async () => {
    mockGetRun.mockResolvedValue(baseRun);
    vi.spyOn(window, "confirm").mockReturnValue(false);

    renderRunDetail();

    await waitFor(() => {
      expect(screen.getByText("Morning Run")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Delete"));

    expect(mockDeleteRun).not.toHaveBeenCalled();
  });
});

describe("RunDetailPage edit — date preservation (regression #89)", () => {
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
      expect(mockUpdateRun).toHaveBeenCalled();
    });

    // Verify runDate was NOT sent (preserves original)
    const callArgs = mockUpdateRun.mock.calls[0][1];
    expect(callArgs).not.toHaveProperty("runDate");
  });

  it("sends runDate when date is changed", async () => {
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

    await user.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(mockUpdateRun).toHaveBeenCalled();
    });

    const callArgs = mockUpdateRun.mock.calls[0][1];
    expect(callArgs).toHaveProperty("runDate");
  });
});

describe("RunDetailPage — time display and editing (#101)", () => {
  it("shows time in view mode", async () => {
    const run: Run = {
      ...baseRun,
      runDate: "2026-03-24T07:30:00Z",
    };
    mockGetRun.mockResolvedValue(run);

    renderRunDetail();

    await waitFor(() => {
      expect(screen.getByText("Morning Run")).toBeInTheDocument();
    });

    // The view-mode date should contain "at" with time
    const dateEl = screen.getByText(/at \d{2}:\d{2}/);
    expect(dateEl).toBeInTheDocument();
  });

  it("shows time input in edit mode with correct pre-populated value", async () => {
    const run: Run = {
      ...baseRun,
      runDate: "2026-03-24T07:30:00Z",
    };
    mockGetRun.mockResolvedValue(run);

    renderRunDetail();

    await waitFor(() => {
      expect(screen.getByText("Morning Run")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Edit"));

    const timeInput = screen.getByLabelText("Time");
    expect(timeInput).toBeInTheDocument();
    // In UTC test env, local hours = 07:30
    const d = new Date("2026-03-24T07:30:00Z");
    const expectedTime =
      String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    expect(timeInput).toHaveValue(expectedTime);
  });

  it("sends runDate when only time is changed", async () => {
    const run: Run = {
      ...baseRun,
      runDate: "2026-03-24T07:30:00Z",
    };
    mockGetRun.mockResolvedValue(run);
    mockUpdateRun.mockResolvedValue({ ...run, runDate: "2026-03-24T08:00:00.000Z" });

    const user = userEvent.setup();
    renderRunDetail();

    await waitFor(() => {
      expect(screen.getByText("Morning Run")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Edit"));

    // Change only the time
    const timeInput = screen.getByLabelText("Time");
    fireEvent.change(timeInput, { target: { value: "08:00" } });

    await user.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(mockUpdateRun).toHaveBeenCalled();
    });

    const callArgs = mockUpdateRun.mock.calls[0][1];
    expect(callArgs).toHaveProperty("runDate");
  });

  it("does not send runDate when neither date nor time changed", async () => {
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

    await user.click(screen.getByText("Edit"));

    // Change only title, leave date and time untouched
    const titleInput = screen.getByLabelText("Title");
    await user.clear(titleInput);
    await user.type(titleInput, "New Title");

    await user.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(mockUpdateRun).toHaveBeenCalled();
    });

    const callArgs = mockUpdateRun.mock.calls[0][1];
    expect(callArgs).not.toHaveProperty("runDate");
  });

  it("combines date and time correctly when both are changed", async () => {
    const run: Run = {
      ...baseRun,
      runDate: "2026-03-24T07:30:00Z",
    };
    mockGetRun.mockResolvedValue(run);
    mockUpdateRun.mockResolvedValue({ ...run, runDate: "2026-03-25T18:45:00.000Z" });

    const user = userEvent.setup();
    renderRunDetail();

    await waitFor(() => {
      expect(screen.getByText("Morning Run")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Edit"));

    // Change both date and time
    const dateInput = screen.getByLabelText("Date");
    fireEvent.change(dateInput, { target: { value: "2026-03-25" } });

    const timeInput = screen.getByLabelText("Time");
    fireEvent.change(timeInput, { target: { value: "18:45" } });

    await user.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(mockUpdateRun).toHaveBeenCalled();
    });

    const callArgs = mockUpdateRun.mock.calls[0][1];
    expect(callArgs).toHaveProperty("runDate");
    // The ISO string should correspond to 2026-03-25T18:45 in local time
    const sent = new Date(callArgs.runDate);
    expect(sent.getFullYear()).toBe(2026);
    expect(sent.getMonth()).toBe(2); // March = 2
    expect(sent.getDate()).toBe(25);
    expect(sent.getHours()).toBe(18);
    expect(sent.getMinutes()).toBe(45);
  });
});
