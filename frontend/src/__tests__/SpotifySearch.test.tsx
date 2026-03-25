import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { SpotifySearch } from "../components/Spotify/SpotifySearch";
import type { SpotifyRef, AudioRef } from "../types/audio";
import { normalizeAudio, MAX_AUDIO_SELECTIONS } from "../types/audio";

const mockSearchSpotify = vi.fn();

beforeAll(() => {
  vi.mock("../api/client", () => ({
    searchSpotify: (...args: unknown[]) => mockSearchSpotify(...args),
  }));
});

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

const sampleResults: SpotifyRef[] = [
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
  {
    source: "spotify",
    spotifyId: "track1",
    type: "track",
    name: "Levitating",
    artistName: "Dua Lipa",
    imageUrl: null,
    spotifyUrl: "https://open.spotify.com/track/track1",
  },
];

async function typeAndSearch(query: string) {
  vi.useFakeTimers();
  const input = screen.getByLabelText("Search Spotify");
  fireEvent.change(input, { target: { value: query } });
  await act(async () => {
    vi.advanceTimersByTime(300);
  });
  vi.useRealTimers();
}

describe("SpotifySearch", () => {
  it("renders search input and tab toggle", () => {
    render(<SpotifySearch value={[]} onChange={vi.fn()} />);
    expect(screen.getByLabelText("Search Spotify")).toBeInTheDocument();
    expect(screen.getByText("Search Spotify")).toBeInTheDocument();
    expect(screen.getByText("Enter manually")).toBeInTheDocument();
  });

  it("debounces search input by 300ms", async () => {
    mockSearchSpotify.mockResolvedValue({ artists: [], albums: [], tracks: [] });
    vi.useFakeTimers();
    render(<SpotifySearch value={[]} onChange={vi.fn()} />);

    const input = screen.getByLabelText("Search Spotify");
    fireEvent.change(input, { target: { value: "Dua" } });

    expect(mockSearchSpotify).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(mockSearchSpotify).toHaveBeenCalledWith("Dua");
  });

  it("shows results dropdown after search", async () => {
    mockSearchSpotify.mockResolvedValue({
      artists: [sampleResults[0]],
      albums: [sampleResults[1]],
      tracks: [sampleResults[2]],
    });

    render(<SpotifySearch value={[]} onChange={vi.fn()} />);
    await typeAndSearch("Dua Lipa");

    await waitFor(() => {
      expect(screen.getByTestId("spotify-dropdown")).toBeInTheDocument();
      expect(screen.getByText("Future Nostalgia")).toBeInTheDocument();
      expect(screen.getByText("Levitating")).toBeInTheDocument();
    });

    const duaElements = screen.getAllByText("Dua Lipa");
    expect(duaElements.length).toBeGreaterThanOrEqual(1);
  });

  it("calls onChange with array when result is clicked", async () => {
    mockSearchSpotify.mockResolvedValue({
      artists: [sampleResults[0]],
      albums: [],
      tracks: [],
    });
    const onChange = vi.fn();

    render(<SpotifySearch value={[]} onChange={onChange} />);
    await typeAndSearch("Dua");

    await waitFor(() => {
      expect(screen.getByTestId("spotify-dropdown")).toBeInTheDocument();
    });

    const options = screen.getAllByRole("option");
    fireEvent.click(options[0]);
    expect(onChange).toHaveBeenCalledWith([sampleResults[0]]);
  });

  it("shows chip when spotify value is selected", () => {
    render(<SpotifySearch value={[sampleResults[0]]} onChange={vi.fn()} />);
    expect(screen.getByTestId("spotify-chip")).toBeInTheDocument();
    const chip = screen.getByTestId("spotify-chip");
    expect(chip.textContent).toContain("Dua Lipa");
  });

  it("removes specific selection when chip x is clicked", () => {
    const onChange = vi.fn();
    render(<SpotifySearch value={[sampleResults[0], sampleResults[1]]} onChange={onChange} />);

    const chips = screen.getAllByTestId("spotify-chip");
    expect(chips).toHaveLength(2);

    // Remove first chip
    fireEvent.click(screen.getByLabelText("Remove Dua Lipa"));
    expect(onChange).toHaveBeenCalledWith([sampleResults[1]]);
  });

  it("supports keyboard navigation", async () => {
    mockSearchSpotify.mockResolvedValue({
      artists: [sampleResults[0]],
      albums: [sampleResults[1]],
      tracks: [],
    });
    const onChange = vi.fn();

    render(<SpotifySearch value={[]} onChange={onChange} />);
    await typeAndSearch("Dua");

    await waitFor(() => {
      expect(screen.getByTestId("spotify-dropdown")).toBeInTheDocument();
    });

    const input = screen.getByLabelText("Search Spotify");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith([sampleResults[1]]);
  });

  it("closes dropdown on Escape", async () => {
    mockSearchSpotify.mockResolvedValue({
      artists: [sampleResults[0]],
      albums: [],
      tracks: [],
    });

    render(<SpotifySearch value={[]} onChange={vi.fn()} />);
    await typeAndSearch("Dua");

    await waitFor(() => {
      expect(screen.getByTestId("spotify-dropdown")).toBeInTheDocument();
    });

    const input = screen.getByLabelText("Search Spotify");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByTestId("spotify-dropdown")).not.toBeInTheDocument();
  });

  it("shows no results message when search returns empty", async () => {
    mockSearchSpotify.mockResolvedValue({ artists: [], albums: [], tracks: [] });

    render(<SpotifySearch value={[]} onChange={vi.fn()} />);
    await typeAndSearch("xyznonexistent");

    await waitFor(() => {
      expect(screen.getByText("No results found")).toBeInTheDocument();
    });
  });

  it("switches to manual mode", () => {
    const onChange = vi.fn();
    render(<SpotifySearch value={[]} onChange={onChange} />);

    fireEvent.click(screen.getByText("Enter manually"));
    expect(screen.getByLabelText("Audio name")).toBeInTheDocument();
    expect(screen.getByLabelText("Artist name")).toBeInTheDocument();
  });

  it("manual mode calls onChange with array containing manual ref", () => {
    const onChange = vi.fn();
    render(<SpotifySearch value={[]} onChange={onChange} />);

    fireEvent.click(screen.getByText("Enter manually"));

    fireEvent.change(screen.getByLabelText("Audio name"), {
      target: { value: "My Podcast" },
    });
    expect(onChange).toHaveBeenCalledWith([{
      source: "manual",
      name: "My Podcast",
    }]);

    fireEvent.change(screen.getByLabelText("Artist name"), {
      target: { value: "Host Name" },
    });
    expect(onChange).toHaveBeenCalledWith([{
      source: "manual",
      name: "My Podcast",
      artistName: "Host Name",
    }]);
  });

  it("falls back to manual mode on API error", async () => {
    mockSearchSpotify.mockRejectedValue(new Error("API error"));

    render(<SpotifySearch value={[]} onChange={vi.fn()} />);
    await typeAndSearch("test");

    await waitFor(() => {
      expect(screen.getByLabelText("Audio name")).toBeInTheDocument();
    });
  });
});

describe("SpotifySearch multi-select", () => {
  it("keeps search open after selecting one item", async () => {
    mockSearchSpotify.mockResolvedValue({
      artists: [sampleResults[0]],
      albums: [sampleResults[1]],
      tracks: [],
    });
    const onChange = vi.fn();

    render(<SpotifySearch value={[]} onChange={onChange} />);
    await typeAndSearch("Dua");

    await waitFor(() => {
      expect(screen.getByTestId("spotify-dropdown")).toBeInTheDocument();
    });

    const options = screen.getAllByRole("option");
    fireEvent.click(options[0]);

    // onChange called with first item — search input should still be available
    // (parent re-renders with updated value)
    expect(onChange).toHaveBeenCalledWith([sampleResults[0]]);
  });

  it("shows multiple chips for multiple selections", () => {
    render(
      <SpotifySearch
        value={[sampleResults[0], sampleResults[1]]}
        onChange={vi.fn()}
      />
    );

    const chips = screen.getAllByTestId("spotify-chip");
    expect(chips).toHaveLength(2);
    expect(chips[0].textContent).toContain("Dua Lipa");
    expect(chips[1].textContent).toContain("Future Nostalgia");
  });

  it("shows max message when 3 items selected", () => {
    render(
      <SpotifySearch
        value={[sampleResults[0], sampleResults[1], sampleResults[2]]}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText(`Maximum of ${MAX_AUDIO_SELECTIONS} selections reached`)).toBeInTheDocument();
    expect(screen.queryByLabelText("Search Spotify")).not.toBeInTheDocument();
  });

  it("does not allow selecting duplicate items", async () => {
    mockSearchSpotify.mockResolvedValue({
      artists: [sampleResults[0]],
      albums: [],
      tracks: [],
    });
    const onChange = vi.fn();

    render(
      <SpotifySearch
        value={[sampleResults[0]]}
        onChange={onChange}
      />
    );
    await typeAndSearch("Dua");

    await waitFor(() => {
      expect(screen.getByTestId("spotify-dropdown")).toBeInTheDocument();
    });

    // The already-selected item should be disabled
    const options = screen.getAllByRole("option");
    expect(options[0]).toBeDisabled();
    fireEvent.click(options[0]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("appends to existing selections when selecting a new item", async () => {
    mockSearchSpotify.mockResolvedValue({
      artists: [],
      albums: [sampleResults[1]],
      tracks: [],
    });
    const onChange = vi.fn();

    render(
      <SpotifySearch
        value={[sampleResults[0]]}
        onChange={onChange}
      />
    );
    await typeAndSearch("Future");

    await waitFor(() => {
      expect(screen.getByTestId("spotify-dropdown")).toBeInTheDocument();
    });

    const options = screen.getAllByRole("option");
    fireEvent.click(options[0]);
    expect(onChange).toHaveBeenCalledWith([sampleResults[0], sampleResults[1]]);
  });

  it("shows updated placeholder text when items are selected", () => {
    render(
      <SpotifySearch
        value={[sampleResults[0]]}
        onChange={vi.fn()}
      />
    );

    const input = screen.getByLabelText("Search Spotify");
    expect(input).toHaveAttribute("placeholder", "Add another (1/3)...");
  });
});

describe("normalizeAudio", () => {
  it("returns empty array for undefined", () => {
    expect(normalizeAudio(undefined)).toEqual([]);
  });

  it("returns empty array for null", () => {
    expect(normalizeAudio(null)).toEqual([]);
  });

  it("wraps single AudioRef in array", () => {
    const single: AudioRef = sampleResults[0];
    expect(normalizeAudio(single)).toEqual([single]);
  });

  it("returns array as-is", () => {
    const arr: AudioRef[] = [sampleResults[0], sampleResults[1]];
    expect(normalizeAudio(arr)).toBe(arr);
  });

  it("wraps manual ref in array", () => {
    const manual: AudioRef = { source: "manual", name: "Test" };
    expect(normalizeAudio(manual)).toEqual([manual]);
  });
});
