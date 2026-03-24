import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import { BottomNav } from "../components/NavBar/BottomNav";

function renderWithRouter(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <BottomNav />
    </MemoryRouter>
  );
}

describe("BottomNav", () => {
  it("renders all four tabs", () => {
    renderWithRouter();
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("New Run")).toBeInTheDocument();
    expect(screen.getByText("Planned")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  it("marks Home tab as active on /", () => {
    renderWithRouter("/");
    const homeLink = screen.getByText("Home").closest("a");
    expect(homeLink?.className).toContain("active");
  });

  it("marks Planned tab as active on /planned", () => {
    renderWithRouter("/planned");
    const plannedLink = screen.getByText("Planned").closest("a");
    expect(plannedLink?.className).toContain("active");
  });

  it("marks Profile tab as active on /profile", () => {
    renderWithRouter("/profile");
    const profileLink = screen.getByText("Profile").closest("a");
    expect(profileLink?.className).toContain("active");
  });

  it("does not mark Home as active on /planned", () => {
    renderWithRouter("/planned");
    const homeLink = screen.getByText("Home").closest("a");
    expect(homeLink?.className).not.toContain("active");
  });

  it("renders the nav element with test id", () => {
    renderWithRouter();
    expect(screen.getByTestId("bottom-nav")).toBeInTheDocument();
  });
});
