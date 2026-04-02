import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import axe from "axe-core";
import { VisuallyHidden } from "../components/ui/VisuallyHidden";

describe("VisuallyHidden", () => {
  it("renders children text", () => {
    render(<VisuallyHidden>Hidden label</VisuallyHidden>);
    expect(screen.getByText("Hidden label")).toBeInTheDocument();
  });

  it("applies visually hidden styles", () => {
    render(<VisuallyHidden>Hidden</VisuallyHidden>);
    const el = screen.getByText("Hidden");
    expect(el).toHaveClass("visuallyHidden");
  });

  it("renders as span by default", () => {
    render(<VisuallyHidden>Text</VisuallyHidden>);
    const el = screen.getByText("Text");
    expect(el.tagName).toBe("SPAN");
  });

  it("renders as div when as='div'", () => {
    render(<VisuallyHidden as="div">Text</VisuallyHidden>);
    const el = screen.getByText("Text");
    expect(el.tagName).toBe("DIV");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <VisuallyHidden>Screen reader text</VisuallyHidden>
    );
    const results = await axe.run(container);
    expect(results.violations).toHaveLength(0);
  });
});
