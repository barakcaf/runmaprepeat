import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import axe from "axe-core";
import { ErrorState } from "../components/ui/ErrorState";

describe("ErrorState", () => {
  it("renders with role=alert", () => {
    render(<ErrorState message="Something failed" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("renders error message", () => {
    render(<ErrorState message="Network error" />);
    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  it("renders title text", () => {
    render(<ErrorState message="Error" />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("renders retry button when onRetry provided", () => {
    render(<ErrorState message="Error" onRetry={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Try Again" })).toBeInTheDocument();
  });

  it("calls onRetry when retry button is clicked", async () => {
    const handleRetry = vi.fn();
    render(<ErrorState message="Error" onRetry={handleRetry} />);

    await userEvent.click(screen.getByRole("button", { name: "Try Again" }));
    expect(handleRetry).toHaveBeenCalledOnce();
  });

  it("does not render retry button when onRetry not provided", () => {
    render(<ErrorState message="Error" />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders error icon", () => {
    render(<ErrorState message="Error" />);
    const alert = screen.getByRole("alert");
    const svg = alert.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <ErrorState message="Something went wrong" onRetry={vi.fn()} />
    );
    const results = await axe.run(container);
    expect(results.violations).toHaveLength(0);
  });
});
