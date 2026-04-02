import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { axe, toHaveNoViolations } from "jest-axe";
import { EmptyState } from "../components/ui/EmptyState";

expect.extend(toHaveNoViolations);

describe("EmptyState", () => {
  it("renders title", () => {
    render(<EmptyState title="No runs yet" />);
    expect(screen.getByText("No runs yet")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(
      <EmptyState title="No runs" description="Start your first run today" />
    );
    expect(screen.getByText("Start your first run today")).toBeInTheDocument();
  });

  it("does not render description when not provided", () => {
    const { container } = render(<EmptyState title="Empty" />);
    expect(container.querySelector("p")).toBeNull();
  });

  it("renders icon slot when provided", () => {
    render(
      <EmptyState
        title="No data"
        icon={<span data-testid="custom-icon">icon</span>}
      />
    );
    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
  });

  it("renders CTA action button when provided", async () => {
    const handleClick = vi.fn();
    render(
      <EmptyState
        title="No runs"
        action={{ label: "Create Run", onClick: handleClick }}
      />
    );

    const button = screen.getByRole("button", { name: "Create Run" });
    expect(button).toBeInTheDocument();

    await userEvent.click(button);
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("does not render action button when not provided", () => {
    render(<EmptyState title="Empty" />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders with all optional props", () => {
    render(
      <EmptyState
        title="No runs yet"
        description="Get started by creating your first run"
        icon={<span data-testid="icon">icon</span>}
        action={{ label: "New Run", onClick: vi.fn() }}
      />
    );

    expect(screen.getByText("No runs yet")).toBeInTheDocument();
    expect(screen.getByText("Get started by creating your first run")).toBeInTheDocument();
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New Run" })).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <EmptyState
        title="No data"
        description="Nothing to show"
        action={{ label: "Add", onClick: vi.fn() }}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
