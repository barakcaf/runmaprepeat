import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Divider } from "../components/ui/Divider";

describe("Divider", () => {
  it("renders a separator without label", () => {
    render(<Divider />);
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });

  it("renders as an hr element without label", () => {
    const { container } = render(<Divider />);
    const hr = container.querySelector("hr");
    expect(hr).toBeInTheDocument();
  });

  it("renders a labeled divider with text", () => {
    render(<Divider label="or" />);
    expect(screen.getByRole("separator")).toBeInTheDocument();
    expect(screen.getByText("or")).toBeInTheDocument();
  });

  it("renders two hr elements when labeled", () => {
    const { container } = render(<Divider label="section" />);
    const hrs = container.querySelectorAll("hr");
    expect(hrs.length).toBe(2);
  });
});
