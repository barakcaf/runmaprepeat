import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import axe from "axe-core";
import { Badge } from "../components/ui/Badge";

describe("Badge", () => {
  it("renders children text", () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("applies default variant class", () => {
    render(<Badge>Default</Badge>);
    const el = screen.getByText("Default");
    expect(el).toHaveClass("badge");
    expect(el).toHaveClass("default");
  });

  it("applies success variant class", () => {
    render(<Badge variant="success">Done</Badge>);
    expect(screen.getByText("Done")).toHaveClass("success");
  });

  it("applies warning variant class", () => {
    render(<Badge variant="warning">Pending</Badge>);
    expect(screen.getByText("Pending")).toHaveClass("warning");
  });

  it("applies error variant class", () => {
    render(<Badge variant="error">Failed</Badge>);
    expect(screen.getByText("Failed")).toHaveClass("error");
  });

  it("applies info variant class", () => {
    render(<Badge variant="info">Info</Badge>);
    expect(screen.getByText("Info")).toHaveClass("info");
  });

  it("renders as a span element", () => {
    render(<Badge>Tag</Badge>);
    expect(screen.getByText("Tag").tagName).toBe("SPAN");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Badge variant="success">Passed</Badge>);
    const results = await axe.run(container);
    expect(results.violations).toHaveLength(0);
  });
});
