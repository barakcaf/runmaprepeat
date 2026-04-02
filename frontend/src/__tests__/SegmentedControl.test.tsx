import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { axe } from "jest-axe";
import { SegmentedControl } from "../components/ui/SegmentedControl";

const options = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
];

describe("SegmentedControl", () => {
  it("renders all options", () => {
    render(
      <SegmentedControl
        options={options}
        value="day"
        onChange={() => {}}
        aria-label="Time range"
      />
    );
    expect(screen.getByText("Day")).toBeInTheDocument();
    expect(screen.getByText("Week")).toBeInTheDocument();
    expect(screen.getByText("Month")).toBeInTheDocument();
  });

  it("uses radiogroup role with aria-label", () => {
    render(
      <SegmentedControl
        options={options}
        value="day"
        onChange={() => {}}
        aria-label="Time range"
      />
    );
    const group = screen.getByRole("radiogroup", { name: "Time range" });
    expect(group).toBeInTheDocument();
  });

  it("marks the selected option with aria-checked", () => {
    render(
      <SegmentedControl
        options={options}
        value="week"
        onChange={() => {}}
        aria-label="Time range"
      />
    );
    const radios = screen.getAllByRole("radio");
    expect(radios[0]).toHaveAttribute("aria-checked", "false");
    expect(radios[1]).toHaveAttribute("aria-checked", "true");
    expect(radios[2]).toHaveAttribute("aria-checked", "false");
  });

  it("sets tabIndex 0 on selected, -1 on others", () => {
    render(
      <SegmentedControl
        options={options}
        value="week"
        onChange={() => {}}
        aria-label="Time range"
      />
    );
    const radios = screen.getAllByRole("radio");
    expect(radios[0]).toHaveAttribute("tabindex", "-1");
    expect(radios[1]).toHaveAttribute("tabindex", "0");
    expect(radios[2]).toHaveAttribute("tabindex", "-1");
  });

  it("calls onChange on click", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SegmentedControl
        options={options}
        value="day"
        onChange={onChange}
        aria-label="Time range"
      />
    );
    await user.click(screen.getByText("Month"));
    expect(onChange).toHaveBeenCalledWith("month");
  });

  it("navigates with ArrowRight key", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SegmentedControl
        options={options}
        value="day"
        onChange={onChange}
        aria-label="Time range"
      />
    );
    const radios = screen.getAllByRole("radio");
    radios[0].focus();
    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenCalledWith("week");
  });

  it("navigates with ArrowLeft key and wraps around", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SegmentedControl
        options={options}
        value="day"
        onChange={onChange}
        aria-label="Time range"
      />
    );
    const radios = screen.getAllByRole("radio");
    radios[0].focus();
    await user.keyboard("{ArrowLeft}");
    expect(onChange).toHaveBeenCalledWith("month");
  });

  it("wraps ArrowRight from last to first", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SegmentedControl
        options={options}
        value="month"
        onChange={onChange}
        aria-label="Time range"
      />
    );
    const radios = screen.getAllByRole("radio");
    radios[2].focus();
    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenCalledWith("day");
  });

  describe("Accessibility (WCAG 2.2 AA)", () => {
    it("has no axe violations", async () => {
      const { container } = render(
        <SegmentedControl
          options={options}
          value="week"
          onChange={() => {}}
          aria-label="Time range"
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("has no axe violations with single option", async () => {
      const { container } = render(
        <SegmentedControl
          options={[{ label: "Only", value: "only" }]}
          value="only"
          onChange={() => {}}
          aria-label="Single option"
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("provides accessible name via aria-label (WCAG 4.1.2)", () => {
      render(
        <SegmentedControl
          options={options}
          value="day"
          onChange={() => {}}
          aria-label="Select time period"
        />
      );
      const group = screen.getByRole("radiogroup");
      expect(group).toHaveAccessibleName("Select time period");
    });
  });
});
