import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProfileGate, useProfileGate } from "../auth/ProfileGate";

const mockGetProfile = vi.fn();

vi.mock("../api/client", () => ({
  getProfile: (...args: unknown[]) => mockGetProfile(...args),
}));

vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { email: "test@example.com", userId: "user-123" },
    isAuthenticated: true,
    isLoading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}));

function ChildComponent() {
  return <div>App Content</div>;
}

function SetupPage() {
  return <div>Setup Page</div>;
}

function ProfileGateConsumer() {
  const { hasProfile, isCheckingProfile } = useProfileGate();
  return (
    <div>
      <span data-testid="has-profile">{String(hasProfile)}</span>
      <span data-testid="is-checking">{String(isCheckingProfile)}</span>
    </div>
  );
}

function renderWithRouter(initialPath: string, hasProfile: boolean) {
  const routes = hasProfile
    ? (
        <MemoryRouter initialEntries={[initialPath]}>
          <ProfileGate>
            <ChildComponent />
          </ProfileGate>
        </MemoryRouter>
      )
    : (
        <MemoryRouter initialEntries={[initialPath]}>
          <ProfileGate>
            {initialPath === "/setup" ? <SetupPage /> : <ChildComponent />}
          </ProfileGate>
        </MemoryRouter>
      );

  return render(routes);
}

describe("ProfileGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state while checking profile", () => {
    mockGetProfile.mockReturnValue(new Promise(() => {})); // never resolves
    render(
      <MemoryRouter initialEntries={["/"]}>
        <ProfileGate>
          <ChildComponent />
        </ProfileGate>
      </MemoryRouter>
    );
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders children when user has a profile", async () => {
    mockGetProfile.mockResolvedValue({
      email: "test@example.com",
      displayName: "Test",
      heightCm: 180,
      weightKg: 75,
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <ProfileGate>
          <ChildComponent />
        </ProfileGate>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("App Content")).toBeInTheDocument();
    });
  });

  it("redirects to /setup when user has no profile (404)", async () => {
    const error = new Error("Not Found");
    Object.assign(error, { status: 404 });
    mockGetProfile.mockRejectedValue(error);

    let currentPath = "/";
    render(
      <MemoryRouter initialEntries={["/"]}>
        <ProfileGate>
          <ChildComponent />
        </ProfileGate>
      </MemoryRouter>
    );

    // The component should redirect - it won't render ChildComponent
    await waitFor(() => {
      expect(screen.queryByText("App Content")).not.toBeInTheDocument();
    });
  });

  it("redirects to /setup when getProfile returns 404 message", async () => {
    const error = new Error("404 Not Found");
    mockGetProfile.mockRejectedValue(error);

    render(
      <MemoryRouter initialEntries={["/"]}>
        <ProfileGate>
          <ChildComponent />
        </ProfileGate>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText("App Content")).not.toBeInTheDocument();
    });
  });

  it("renders setup page at /setup when no profile exists", async () => {
    const error = new Error("Not Found");
    Object.assign(error, { status: 404 });
    mockGetProfile.mockRejectedValue(error);

    render(
      <MemoryRouter initialEntries={["/setup"]}>
        <ProfileGate>
          <SetupPage />
        </ProfileGate>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Setup Page")).toBeInTheDocument();
    });
  });

  it("redirects from /setup to / when user already has a profile", async () => {
    mockGetProfile.mockResolvedValue({
      email: "test@example.com",
      displayName: "Test",
      heightCm: 180,
      weightKg: 75,
    });

    render(
      <MemoryRouter initialEntries={["/setup"]}>
        <ProfileGate>
          <SetupPage />
        </ProfileGate>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText("Setup Page")).not.toBeInTheDocument();
    });
  });

  it("exposes hasProfile=true via context when profile exists", async () => {
    mockGetProfile.mockResolvedValue({
      email: "test@example.com",
      displayName: "Test",
      heightCm: 180,
      weightKg: 75,
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <ProfileGate>
          <ProfileGateConsumer />
        </ProfileGate>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("has-profile")).toHaveTextContent("true");
    });
    expect(screen.getByTestId("is-checking")).toHaveTextContent("false");
  });

  it("exposes hasProfile=false via context when no profile", async () => {
    const error = new Error("Not Found");
    Object.assign(error, { status: 404 });
    mockGetProfile.mockRejectedValue(error);

    render(
      <MemoryRouter initialEntries={["/setup"]}>
        <ProfileGate>
          <ProfileGateConsumer />
        </ProfileGate>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("has-profile")).toHaveTextContent("false");
    });
  });
});
