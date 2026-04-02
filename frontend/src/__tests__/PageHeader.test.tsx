import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PageHeader } from "../components/ui/PageHeader";

describe("PageHeader", () => {
  it("renders a semantic h1 with the title", () => {
    render(<PageHeader title="Dashboard" />);
    const heading = screen.getByRole("heading", { level: 1, name: "Dashboard" });
    expect(heading).toBeInTheDocument();
  });

  it("renders subtitle when provided", () => {
    render(<PageHeader title="Runs" subtitle="Your recent activity" />);
    expect(screen.getByText("Your recent activity")).toBeInTheDocument();
  });

  it("does not render subtitle when not provided", () => {
    const { container } = render(<PageHeader title="Runs" />);
    expect(container.querySelector("p")).toBeNull();
  });

  it("renders action slot when provided", () => {
    render(
      <PageHeader
        title="Runs"
        action={<button>New Run</button>}
      />
    );
    expect(screen.getByRole("button", { name: "New Run" })).toBeInTheDocument();
  });

  it("does not render action container when no action provided", () => {
    const { container } = render(<PageHeader title="Runs" />);
    expect(container.querySelector("[class*='action']")).toBeNull();
  });
});
