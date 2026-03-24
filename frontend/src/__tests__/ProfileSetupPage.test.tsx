import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProfileSetupPage } from "../pages/ProfileSetupPage";

const mockRecheckProfile = vi.fn();
const mockUpdateProfile = vi.fn();

vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { email: "test@example.com", userId: "user-123" },
    isAuthenticated: true,
    isLoading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}));

vi.mock("../auth/ProfileGate", () => ({
  useProfileGate: () => ({
    hasProfile: false,
    isCheckingProfile: false,
    recheckProfile: mockRecheckProfile,
  }),
}));

vi.mock("../api/client", () => ({
  updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/setup"]}>
      <ProfileSetupPage />
    </MemoryRouter>
  );
}

describe("ProfileSetupPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateProfile.mockResolvedValue({});
    mockRecheckProfile.mockResolvedValue(undefined);
  });

  it("renders setup page title", () => {
    renderPage();
    expect(screen.getByText("Set Up Your Profile")).toBeInTheDocument();
  });

  it("renders subtitle text", () => {
    renderPage();
    expect(screen.getByText("Please fill in your details to get started.")).toBeInTheDocument();
  });

  it("renders all required form fields", () => {
    renderPage();
    expect(screen.getByLabelText("Email *")).toBeInTheDocument();
    expect(screen.getByLabelText("Display Name *")).toBeInTheDocument();
    expect(screen.getByLabelText("Height (cm) *")).toBeInTheDocument();
    expect(screen.getByLabelText("Weight (kg) *")).toBeInTheDocument();
  });

  it("pre-fills email from auth user", () => {
    renderPage();
    expect(screen.getByLabelText("Email *")).toHaveValue("test@example.com");
  });

  it("renders Complete Setup button", () => {
    renderPage();
    expect(screen.getByText("Complete Setup")).toBeInTheDocument();
  });

  it("does not render sign out button", () => {
    renderPage();
    expect(screen.queryByText("Sign Out")).not.toBeInTheDocument();
  });

  it("does not render bottom navigation", () => {
    renderPage();
    expect(screen.queryByTestId("bottom-nav")).not.toBeInTheDocument();
  });

  it("shows validation error for empty display name", async () => {
    renderPage();

    const form = screen.getByText("Complete Setup").closest("form") as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Display name is required")).toBeInTheDocument();
    });
  });

  it("shows validation error for invalid email", async () => {
    renderPage();

    const emailInput = screen.getByLabelText("Email *");
    fireEvent.change(emailInput, { target: { value: "not-an-email" } });

    const form = screen.getByText("Complete Setup").closest("form") as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument();
    });
  });

  it("calls updateProfile and recheckProfile on valid submit", async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText("Display Name *"), {
      target: { value: "Test User" },
    });
    fireEvent.change(screen.getByLabelText("Height (cm) *"), {
      target: { value: "180" },
    });
    fireEvent.change(screen.getByLabelText("Weight (kg) *"), {
      target: { value: "75" },
    });

    const form = screen.getByText("Complete Setup").closest("form") as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        email: "test@example.com",
        displayName: "Test User",
        heightCm: 180,
        weightKg: 75,
      });
    });

    expect(mockRecheckProfile).toHaveBeenCalled();
  });

  it("shows error when updateProfile fails", async () => {
    mockUpdateProfile.mockRejectedValue(new Error("Server error"));

    renderPage();

    fireEvent.change(screen.getByLabelText("Display Name *"), {
      target: { value: "Test User" },
    });
    fireEvent.change(screen.getByLabelText("Height (cm) *"), {
      target: { value: "180" },
    });
    fireEvent.change(screen.getByLabelText("Weight (kg) *"), {
      target: { value: "75" },
    });

    const form = screen.getByText("Complete Setup").closest("form") as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Server error")).toBeInTheDocument();
    });
  });

  it("disables button while saving", async () => {
    mockUpdateProfile.mockReturnValue(new Promise(() => {})); // never resolves

    renderPage();

    fireEvent.change(screen.getByLabelText("Display Name *"), {
      target: { value: "Test User" },
    });
    fireEvent.change(screen.getByLabelText("Height (cm) *"), {
      target: { value: "180" },
    });
    fireEvent.change(screen.getByLabelText("Weight (kg) *"), {
      target: { value: "75" },
    });

    const form = screen.getByText("Complete Setup").closest("form") as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Saving...")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
  });
});
