import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { SpotifySearch } from "../components/Spotify/SpotifySearch";
import type { SpotifyRef } from "../types/audio";

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
    imageUrl: "https://example.com/dua.jpg",
    spotifyUrl: "https://open.spotify.com/artist/artist1",
  },
  {
    source: "spotify",
    spotifyId: "album1",
    type: "album",
    name: "Future Nostalgia",
    artistName: "Dua Lipa",
    imageUrl: "https://example.com/fn.jpg",
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
    render(<SpotifySearch value={undefined} onChange={vi.fn()} />);
    expect(screen.getByLabelText("Search Spotify")).toBeInTheDocument();
    expect(screen.getByText("Search Spotify")).toBeInTheDocument();
    expect(screen.getByText("Enter manually")).toBeInTheDocument();
  });

  it("debounces search input by 300ms", async () => {
    mockSearchSpotify.mockResolvedValue({ artists: [], albums: [], tracks: [] });
    vi.useFakeTimers();
    render(<SpotifySearch value={undefined} onChange={vi.fn()} />);

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

    render(<SpotifySearch value={undefined} onChange={vi.fn()} />);
    await typeAndSearch("Dua Lipa");

    await waitFor(() => {
      expect(screen.getByTestId("spotify-dropdown")).toBeInTheDocument();
      expect(screen.getByText("Future Nostalgia")).toBeInTheDocument();
      expect(screen.getByText("Levitating")).toBeInTheDocument();
    });

    // "Dua Lipa" appears multiple times (artist name + subtexts), verify all present
    const duaElements = screen.getAllByText("Dua Lipa");
    expect(duaElements.length).toBeGreaterThanOrEqual(1);
  });

  it("calls onChange when result is clicked", async () => {
    mockSearchSpotify.mockResolvedValue({
      artists: [sampleResults[0]],
      albums: [],
      tracks: [],
    });
    const onChange = vi.fn();

    render(<SpotifySearch value={undefined} onChange={onChange} />);
    await typeAndSearch("Dua");

    await waitFor(() => {
      expect(screen.getByTestId("spotify-dropdown")).toBeInTheDocument();
    });

    // Click the result item button containing "Dua Lipa"
    const options = screen.getAllByRole("option");
    fireEvent.click(options[0]);
    expect(onChange).toHaveBeenCalledWith(sampleResults[0]);
  });

  it("shows chip when spotify value is selected", () => {
    render(<SpotifySearch value={sampleResults[0]} onChange={vi.fn()} />);
    expect(screen.getByTestId("spotify-chip")).toBeInTheDocument();
    // The chip should show the name
    const chip = screen.getByTestId("spotify-chip");
    expect(chip.textContent).toContain("Dua Lipa");
  });

  it("removes selection when chip x is clicked", () => {
    const onChange = vi.fn();
    render(<SpotifySearch value={sampleResults[0]} onChange={onChange} />);

    fireEvent.click(screen.getByLabelText("Remove audio"));
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it("supports keyboard navigation", async () => {
    mockSearchSpotify.mockResolvedValue({
      artists: [sampleResults[0]],
      albums: [sampleResults[1]],
      tracks: [],
    });
    const onChange = vi.fn();

    render(<SpotifySearch value={undefined} onChange={onChange} />);
    await typeAndSearch("Dua");

    await waitFor(() => {
      expect(screen.getByTestId("spotify-dropdown")).toBeInTheDocument();
    });

    const input = screen.getByLabelText("Search Spotify");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith(sampleResults[1]);
  });

  it("closes dropdown on Escape", async () => {
    mockSearchSpotify.mockResolvedValue({
      artists: [sampleResults[0]],
      albums: [],
      tracks: [],
    });

    render(<SpotifySearch value={undefined} onChange={vi.fn()} />);
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

    render(<SpotifySearch value={undefined} onChange={vi.fn()} />);
    await typeAndSearch("xyznonexistent");

    await waitFor(() => {
      expect(screen.getByText("No results found")).toBeInTheDocument();
    });
  });

  it("switches to manual mode", () => {
    const onChange = vi.fn();
    render(<SpotifySearch value={undefined} onChange={onChange} />);

    fireEvent.click(screen.getByText("Enter manually"));
    expect(screen.getByLabelText("Audio name")).toBeInTheDocument();
    expect(screen.getByLabelText("Artist name")).toBeInTheDocument();
  });

  it("manual mode calls onChange with manual ref", () => {
    const onChange = vi.fn();
    render(<SpotifySearch value={undefined} onChange={onChange} />);

    fireEvent.click(screen.getByText("Enter manually"));

    fireEvent.change(screen.getByLabelText("Audio name"), {
      target: { value: "My Podcast" },
    });
    expect(onChange).toHaveBeenCalledWith({
      source: "manual",
      name: "My Podcast",
    });

    fireEvent.change(screen.getByLabelText("Artist name"), {
      target: { value: "Host Name" },
    });
    expect(onChange).toHaveBeenCalledWith({
      source: "manual",
      name: "My Podcast",
      artistName: "Host Name",
    });
  });

  it("falls back to manual mode on API error", async () => {
    mockSearchSpotify.mockRejectedValue(new Error("API error"));

    render(<SpotifySearch value={undefined} onChange={vi.fn()} />);
    await typeAndSearch("test");

    await waitFor(() => {
      expect(screen.getByLabelText("Audio name")).toBeInTheDocument();
    });
  });
});
