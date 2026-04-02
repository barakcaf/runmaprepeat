import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { axe, toHaveNoViolations } from "jest-axe";
import { Skeleton } from "../components/ui/Skeleton";

expect.extend(toHaveNoViolations);

describe("Skeleton", () => {
  it("renders with role=status and loading label", () => {
    render(<Skeleton />);
    const el = screen.getByRole("status");
    expect(el).toHaveAttribute("aria-label", "Loading");
  });

  it("defaults to line variant", () => {
    render(<Skeleton />);
    const el = screen.getByRole("status");
    expect(el).toHaveClass("skeleton");
    expect(el).toHaveClass("line");
  });

  it("renders circle variant", () => {
    render(<Skeleton variant="circle" />);
    const el = screen.getByRole("status");
    expect(el).toHaveClass("circle");
  });

  it("renders rect variant", () => {
    render(<Skeleton variant="rect" />);
    const el = screen.getByRole("status");
    expect(el).toHaveClass("rect");
  });

  it("applies custom width and height", () => {
    render(<Skeleton width={200} height={40} />);
    const el = screen.getByRole("status");
    expect(el.style.width).toBe("200px");
    expect(el.style.height).toBe("40px");
    expect(el.style.minHeight).toBe("40px");
  });

  it("applies string dimensions", () => {
    render(<Skeleton width="100%" height="2rem" />);
    const el = screen.getByRole("status");
    expect(el.style.width).toBe("100%");
    expect(el.style.height).toBe("2rem");
  });

  it("has shimmer animation class", () => {
    render(<Skeleton />);
    const el = screen.getByRole("status");
    expect(el).toHaveClass("skeleton");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Skeleton />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
