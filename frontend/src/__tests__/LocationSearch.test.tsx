import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { LocationSearch } from "../components/Map/LocationSearch";

const mockSend = vi.fn();

vi.mock("@aws-sdk/client-location", () => {
  return {
    LocationClient: vi.fn().mockImplementation(() => ({
      send: mockSend,
    })),
    SearchPlaceIndexForSuggestionsCommand: vi.fn().mockImplementation((input) => ({
      _type: "suggestions",
      input,
    })),
    SearchPlaceIndexForTextCommand: vi.fn().mockImplementation((input) => ({
      _type: "text",
      input,
    })),
  };
});

vi.mock("@aws-amplify/auth", () => ({
  fetchAuthSession: vi.fn().mockResolvedValue({
    credentials: {
      accessKeyId: "test-key",
      secretAccessKey: "test-secret",
      sessionToken: "test-token",
    },
  }),
}));

vi.mock("../../config", () => ({
  config: {
    location: {
      placeIndexName: "test-place-index",
      region: "us-east-1",
    },
  },
}));

describe("LocationSearch", () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it("renders search input", () => {
    render(<LocationSearch onSelect={mockOnSelect} />);
    expect(screen.getByLabelText("Search location")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search location...")).toBeInTheDocument();
  });

  it("shows suggestions after typing", async () => {
    mockSend.mockResolvedValueOnce({
      Results: [
        { Text: "Tel Aviv, Israel", PlaceId: "place-1" },
        { Text: "Tel Mond, Israel", PlaceId: "place-2" },
      ],
    });

    render(<LocationSearch onSelect={mockOnSelect} />);
    const input = screen.getByLabelText("Search location");

    await act(async () => {
      fireEvent.change(input, { target: { value: "Tel" } });
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByTestId("suggestions-list")).toBeInTheDocument();
      expect(screen.getByText("Tel Aviv, Israel")).toBeInTheDocument();
      expect(screen.getByText("Tel Mond, Israel")).toBeInTheDocument();
    });
  });

  it("handles no results gracefully", async () => {
    mockSend.mockResolvedValueOnce({ Results: [] });

    render(<LocationSearch onSelect={mockOnSelect} />);
    const input = screen.getByLabelText("Search location");

    await act(async () => {
      fireEvent.change(input, { target: { value: "xyznonexistent" } });
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByText("No results found")).toBeInTheDocument();
    });
  });

  it("calls onSelect when suggestion is clicked", async () => {
    mockSend
      .mockResolvedValueOnce({
        Results: [{ Text: "Tel Aviv, Israel", PlaceId: "place-1" }],
      })
      .mockResolvedValueOnce({
        Results: [
          {
            Place: {
              Label: "Tel Aviv, Israel",
              Geometry: { Point: [34.7818, 32.0853] },
            },
          },
        ],
      });

    render(<LocationSearch onSelect={mockOnSelect} />);
    const input = screen.getByLabelText("Search location");

    await act(async () => {
      fireEvent.change(input, { target: { value: "Tel" } });
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByText("Tel Aviv, Israel")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.mouseDown(screen.getByText("Tel Aviv, Israel"));
    });

    await waitFor(() => {
      expect(mockOnSelect).toHaveBeenCalledWith(34.7818, 32.0853, "Tel Aviv, Israel");
    });
  });

  it("clears input when clear button is clicked", async () => {
    mockSend.mockResolvedValueOnce({
      Results: [{ Text: "Tel Aviv, Israel", PlaceId: "place-1" }],
    });

    render(<LocationSearch onSelect={mockOnSelect} />);
    const input = screen.getByLabelText("Search location");

    await act(async () => {
      fireEvent.change(input, { target: { value: "Tel" } });
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Clear search")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText("Clear search"));
    expect(input).toHaveValue("");
  });

  it("does not search for short queries", async () => {
    render(<LocationSearch onSelect={mockOnSelect} />);
    const input = screen.getByLabelText("Search location");

    await act(async () => {
      fireEvent.change(input, { target: { value: "T" } });
      vi.advanceTimersByTime(300);
    });

    expect(mockSend).not.toHaveBeenCalled();
  });

  it("supports keyboard navigation", async () => {
    mockSend.mockResolvedValueOnce({
      Results: [
        { Text: "Tel Aviv, Israel", PlaceId: "place-1" },
        { Text: "Tel Mond, Israel", PlaceId: "place-2" },
      ],
    });

    render(<LocationSearch onSelect={mockOnSelect} />);
    const input = screen.getByLabelText("Search location");

    await act(async () => {
      fireEvent.change(input, { target: { value: "Tel" } });
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByTestId("suggestions-list")).toBeInTheDocument();
    });

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByTestId("suggestions-list")).not.toBeInTheDocument();
  });

  it("debounces search requests", async () => {
    mockSend.mockResolvedValue({ Results: [] });

    render(<LocationSearch onSelect={mockOnSelect} />);
    const input = screen.getByLabelText("Search location");

    await act(async () => {
      fireEvent.change(input, { target: { value: "Te" } });
      vi.advanceTimersByTime(100);
      fireEvent.change(input, { target: { value: "Tel" } });
      vi.advanceTimersByTime(100);
      fireEvent.change(input, { target: { value: "Tel A" } });
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  it("passes mapBounds as bias position", async () => {
    const { SearchPlaceIndexForSuggestionsCommand } = await import("@aws-sdk/client-location");
    mockSend.mockResolvedValueOnce({ Results: [] });

    const bounds = { west: 34.0, south: 31.0, east: 35.0, north: 33.0 };
    render(<LocationSearch onSelect={mockOnSelect} mapBounds={bounds} />);
    const input = screen.getByLabelText("Search location");

    await act(async () => {
      fireEvent.change(input, { target: { value: "Test" } });
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(SearchPlaceIndexForSuggestionsCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          BiasPosition: [34.5, 32.0],
        })
      );
    });
  });
});
