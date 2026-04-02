import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import axe from "axe-core";
import { SkipLink } from "../components/ui/SkipLink";

describe("SkipLink", () => {
  it("renders a link with correct text", () => {
    render(<SkipLink />);
    expect(screen.getByText("Skip to main content")).toBeInTheDocument();
  });

  it("links to #main-content", () => {
    render(<SkipLink />);
    const link = screen.getByRole("link", { name: "Skip to main content" });
    expect(link).toHaveAttribute("href", "#main-content");
  });

  it("accepts custom href", () => {
    render(<SkipLink href="#content">Jump to content</SkipLink>);
    const link = screen.getByText("Jump to content");
    expect(link).toHaveAttribute("href", "#content");
  });

  it("accepts custom children text", () => {
    render(<SkipLink>Skip navigation</SkipLink>);
    expect(screen.getByText("Skip navigation")).toBeInTheDocument();
  });

  it("has skipLink class for focus visibility", () => {
    render(<SkipLink />);
    const link = screen.getByRole("link");
    expect(link).toHaveClass("skipLink");
  });

  it("renders as an anchor element", () => {
    render(<SkipLink />);
    const link = screen.getByText("Skip to main content");
    expect(link.tagName).toBe("A");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<SkipLink />);
    const results = await axe.run(container);
    expect(results.violations).toHaveLength(0);
  });
});
