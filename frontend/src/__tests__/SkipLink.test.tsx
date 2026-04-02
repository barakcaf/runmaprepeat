import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { axe, toHaveNoViolations } from "jest-axe";
import { SkipLink } from "../components/ui/SkipLink";

expect.extend(toHaveNoViolations);

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

  it("has skipLink class for focus visibility", () => {
    render(<SkipLink />);
    const link = screen.getByRole("link");
    expect(link).toHaveClass("skipLink");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<SkipLink />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
