import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProfilePage } from "../pages/ProfilePage";

const mockSignOut = vi.fn();

vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { email: "test@example.com", userId: "user-123" },
    signOut: mockSignOut,
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

async function waitForLoaded() {
  await waitFor(() => {
    expect(screen.queryByText("Loading profile...")).not.toBeInTheDocument();
  });
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

  describe("view mode (default)", () => {
    it("displays profile fields as text after loading", async () => {
      renderPage();
      await waitForLoaded();

      expect(screen.getByTestId("view-email")).toHaveTextContent("test@example.com");
      expect(screen.getByTestId("view-displayName")).toHaveTextContent("Test User");
      expect(screen.getByTestId("view-heightCm")).toHaveTextContent("180");
      expect(screen.getByTestId("view-weightKg")).toHaveTextContent("75");
    });

    it("does not render form inputs in view mode", async () => {
      renderPage();
      await waitForLoaded();

      expect(screen.queryByLabelText("Email *")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Display Name *")).not.toBeInTheDocument();
    });

    it("renders Edit button", async () => {
      renderPage();
      await waitForLoaded();
      expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    });

    it("does not render Save or Cancel buttons", async () => {
      renderPage();
      await waitForLoaded();
      expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
    });

    it("renders Sign Out button", async () => {
      renderPage();
      await waitForLoaded();
      expect(screen.getByRole("button", { name: "Sign Out" })).toBeInTheDocument();
    });
  });

  describe("edit mode", () => {
    async function enterEditMode() {
      renderPage();
      await waitForLoaded();
      fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    }

    it("switches to edit mode when Edit is clicked", async () => {
      await enterEditMode();

      expect(screen.getByLabelText("Email *")).toBeInTheDocument();
      expect(screen.getByLabelText("Display Name *")).toBeInTheDocument();
      expect(screen.getByLabelText("Height (cm) *")).toBeInTheDocument();
      expect(screen.getByLabelText("Weight (kg) *")).toBeInTheDocument();
    });

    it("populates inputs with current values", async () => {
      await enterEditMode();

      expect(screen.getByLabelText("Email *")).toHaveValue("test@example.com");
      expect(screen.getByLabelText("Display Name *")).toHaveValue("Test User");
      expect(screen.getByLabelText("Height (cm) *")).toHaveValue(180);
      expect(screen.getByLabelText("Weight (kg) *")).toHaveValue(75);
    });

    it("shows Save and Cancel buttons", async () => {
      await enterEditMode();

      expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    });

    it("does not show Edit button in edit mode", async () => {
      await enterEditMode();
      expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    });

    it("shows Sign Out button in edit mode", async () => {
      await enterEditMode();
      expect(screen.getByRole("button", { name: "Sign Out" })).toBeInTheDocument();
    });

    it("marks all fields as required", async () => {
      await enterEditMode();

      expect(screen.getByLabelText("Email *")).toBeRequired();
      expect(screen.getByLabelText("Display Name *")).toBeRequired();
      expect(screen.getByLabelText("Height (cm) *")).toBeRequired();
      expect(screen.getByLabelText("Weight (kg) *")).toBeRequired();
    });
  });

  describe("cancel", () => {
    it("returns to view mode and discards changes", async () => {
      renderPage();
      await waitForLoaded();

      fireEvent.click(screen.getByRole("button", { name: "Edit" }));
      fireEvent.change(screen.getByLabelText("Display Name *"), {
        target: { value: "Changed Name" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

      // Back in view mode with original values
      expect(screen.getByTestId("view-displayName")).toHaveTextContent("Test User");
      expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    });
  });

  describe("save", () => {
    it("saves profile and returns to view mode with updated values", async () => {
      renderPage();
      await waitForLoaded();

      fireEvent.click(screen.getByRole("button", { name: "Edit" }));
      fireEvent.change(screen.getByLabelText("Display Name *"), {
        target: { value: "New Name" },
      });

      const form = screen.getByRole("button", { name: "Save" }).closest("form") as HTMLFormElement;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByTestId("view-displayName")).toHaveTextContent("New Name");
      });

      expect(mockUpdateProfile).toHaveBeenCalledWith({
        email: "test@example.com",
        displayName: "New Name",
        heightCm: 180,
        weightKg: 75,
      });
      expect(screen.getByText("Profile saved!")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    });

    it("shows validation error for invalid email on save", async () => {
      renderPage();
      await waitForLoaded();

      fireEvent.click(screen.getByRole("button", { name: "Edit" }));
      fireEvent.change(screen.getByLabelText("Email *"), {
        target: { value: "not-an-email" },
      });

      const form = screen.getByRole("button", { name: "Save" }).closest("form") as HTMLFormElement;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument();
      });
      // Should stay in edit mode on error
      expect(screen.getByLabelText("Email *")).toBeInTheDocument();
    });

    it("stays in edit mode on save failure", async () => {
      mockUpdateProfile.mockRejectedValueOnce(new Error("Network error"));

      renderPage();
      await waitForLoaded();

      fireEvent.click(screen.getByRole("button", { name: "Edit" }));

      const form = screen.getByRole("button", { name: "Save" }).closest("form") as HTMLFormElement;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });
      // Still in edit mode
      expect(screen.getByLabelText("Email *")).toBeInTheDocument();
    });
  });
});
