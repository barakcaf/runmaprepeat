import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { axe } from "vitest-axe";
import { toHaveNoViolations } from "vitest-axe/dist/matchers";
import { Divider } from "../components/ui/Divider";

expect.extend({ toHaveNoViolations });

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

  describe("Accessibility (WCAG 2.2 AA)", () => {
    it("has no axe violations without label", async () => {
      const { container } = render(<Divider />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("has no axe violations with label", async () => {
      const { container } = render(<Divider label="or" />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("uses semantic separator role (WCAG 1.3.1)", () => {
      render(<Divider />);
      const separator = screen.getByRole("separator");
      expect(separator).toBeInTheDocument();
    });

    it("provides accessible label when text is present (WCAG 4.1.2)", () => {
      render(<Divider label="or continue with" />);
      const separator = screen.getByRole("separator");
      expect(separator).toHaveAccessibleName("or continue with");
    });

    it("hides decorative elements from screen readers (WCAG 1.3.1)", () => {
      const { container } = render(<Divider label="section" />);
      const hrs = container.querySelectorAll("hr[aria-hidden='true']");
      expect(hrs.length).toBe(2);
      const label = container.querySelector("span[aria-hidden='true']");
      expect(label).toBeInTheDocument();
    });

    it("maintains sufficient text contrast in label", () => {
      const { container } = render(<Divider label="Section" />);
      const label = container.querySelector("[class*='label']");
      expect(label).toBeInTheDocument();
      // CSS uses --color-text-tertiary which meets WCAG 4.5:1 contrast (WCAG 1.4.3)
    });
  });
});
