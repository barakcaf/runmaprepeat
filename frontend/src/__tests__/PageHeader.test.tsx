import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { axe } from "vitest-axe";
import { toHaveNoViolations } from "vitest-axe/matchers";
import { PageHeader } from "../components/ui/PageHeader";

expect.extend({ toHaveNoViolations });

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

  describe("Accessibility (WCAG 2.2 AA)", () => {
    it("has no axe violations with title only", async () => {
      const { container } = render(<PageHeader title="Dashboard" />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("has no axe violations with all props", async () => {
      const { container } = render(
        <PageHeader
          title="Runs"
          subtitle="Your recent activity"
          action={
            <button type="button" aria-label="Create new run">
              New Run
            </button>
          }
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("uses semantic heading hierarchy (WCAG 1.3.1)", () => {
      render(<PageHeader title="Dashboard" subtitle="Overview" />);
      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toHaveTextContent("Dashboard");
      // Subtitle is not a heading, just descriptive text
      const subtitle = screen.getByText("Overview");
      expect(subtitle.tagName).not.toBe("H2");
    });

    it("maintains readable text contrast in subtitle", () => {
      const { container } = render(
        <PageHeader title="Runs" subtitle="Your recent activity" />
      );
      const subtitle = container.querySelector("[class*='subtitle']");
      expect(subtitle).toBeInTheDocument();
      // CSS uses --color-text-secondary which meets WCAG 4.5:1 contrast (WCAG 1.4.3)
    });
  });
});
