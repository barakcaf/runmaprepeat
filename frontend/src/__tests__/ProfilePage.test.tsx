import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProfilePage } from "../pages/ProfilePage";

vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { email: "test@example.com", userId: "user-123" },
    signOut: vi.fn(),
  }),
}));

vi.mock("../api/client", () => ({
  getProfile: vi.fn().mockResolvedValue({
    displayName: "Test User",
    weightKg: 75,
    heightCm: 180,
    birthDate: "1990-01-15",
  }),
  updateProfile: vi.fn().mockResolvedValue({}),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>
  );
}

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state initially", () => {
    renderPage();
    expect(screen.getByText("Loading profile...")).toBeInTheDocument();
  });

  it("renders form fields after loading", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByLabelText("Display Name")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Weight (kg)")).toBeInTheDocument();
    expect(screen.getByLabelText("Height (cm)")).toBeInTheDocument();
    expect(screen.getByLabelText("Birth Date")).toBeInTheDocument();
  });

  it("populates form with loaded profile data", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByLabelText("Display Name")).toHaveValue("Test User");
    });
    expect(screen.getByLabelText("Weight (kg)")).toHaveValue(75);
    expect(screen.getByLabelText("Height (cm)")).toHaveValue(180);
    expect(screen.getByLabelText("Birth Date")).toHaveValue("1990-01-15");
  });

  it("renders save button", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Save Profile")).toBeInTheDocument();
    });
  });

  it("renders sign out button", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Sign Out")).toBeInTheDocument();
    });
  });
});
