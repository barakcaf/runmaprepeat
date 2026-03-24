import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProfilePage } from "../pages/ProfilePage";

vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { email: "test@example.com", userId: "user-123" },
    signOut: vi.fn(),
  }),
}));

const mockUpdateProfile = vi.fn().mockResolvedValue({});

vi.mock("../api/client", () => ({
  getProfile: vi.fn().mockResolvedValue({
    email: "test@example.com",
    displayName: "Test User",
    weightKg: 75,
    heightCm: 180,
  }),
  updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
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
    mockUpdateProfile.mockResolvedValue({});
  });

  it("shows loading state initially", () => {
    renderPage();
    expect(screen.getByText("Loading profile...")).toBeInTheDocument();
  });

  it("renders form fields after loading", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByLabelText("Email *")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Display Name *")).toBeInTheDocument();
    expect(screen.getByLabelText("Weight (kg) *")).toBeInTheDocument();
    expect(screen.getByLabelText("Height (cm) *")).toBeInTheDocument();
  });

  it("does not render birth date field", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByLabelText("Email *")).toBeInTheDocument();
    });
    expect(screen.queryByLabelText("Birth Date")).not.toBeInTheDocument();
  });

  it("populates form with loaded profile data", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByLabelText("Email *")).toHaveValue("test@example.com");
    });
    expect(screen.getByLabelText("Display Name *")).toHaveValue("Test User");
    expect(screen.getByLabelText("Weight (kg) *")).toHaveValue(75);
    expect(screen.getByLabelText("Height (cm) *")).toHaveValue(180);
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

  it("marks all fields as required", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByLabelText("Email *")).toBeRequired();
    });
    expect(screen.getByLabelText("Display Name *")).toBeRequired();
    expect(screen.getByLabelText("Height (cm) *")).toBeRequired();
    expect(screen.getByLabelText("Weight (kg) *")).toBeRequired();
  });

  it("shows validation error for invalid email on save", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByLabelText("Email *")).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText("Email *");
    fireEvent.change(emailInput, { target: { value: "not-an-email" } });

    const form = screen.getByText("Save Profile").closest("form") as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument();
    });
  });
});
