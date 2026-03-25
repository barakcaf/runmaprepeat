import { describe, it, expect } from "vitest";
import { evaluateExpression, calculatePaceFromInput } from "../utils/calculator";

describe("evaluateExpression", () => {
  it("evaluates simple addition", () => {
    expect(evaluateExpression("2+3")).toBe(5);
  });

  it("evaluates simple subtraction", () => {
    expect(evaluateExpression("10-3")).toBe(7);
  });

  it("evaluates multiplication", () => {
    expect(evaluateExpression("4*5")).toBe(20);
  });

  it("evaluates division", () => {
    expect(evaluateExpression("20/4")).toBe(5);
  });

  it("evaluates complex expressions with parentheses", () => {
    expect(evaluateExpression("(2+3)*4")).toBe(20);
  });

  it("evaluates decimal numbers", () => {
    expect(evaluateExpression("5.5+2.5")).toBe(8);
  });

  it("handles whitespace in expressions", () => {
    expect(evaluateExpression("2 + 3 * 4")).toBe(14);
  });

  it("throws error for invalid characters", () => {
    expect(() => evaluateExpression("alert(1)")).toThrow("Invalid expression");
  });

  it("throws error for malicious code", () => {
    expect(() => evaluateExpression("fetch('http://evil.com')")).toThrow("Invalid expression");
  });

  it("throws error for non-numeric input", () => {
    expect(() => evaluateExpression("abc")).toThrow("Invalid expression");
  });

  it("throws error for expressions resulting in NaN", () => {
    expect(() => evaluateExpression("0/0")).toThrow("Expression did not produce a finite number");
  });

  it("throws error for expressions resulting in Infinity", () => {
    expect(() => evaluateExpression("1/0")).toThrow("Expression did not produce a finite number");
  });
});

describe("calculatePaceFromInput", () => {
  it("calculates pace correctly for simple values", () => {
    expect(calculatePaceFromInput("10", "50")).toBe("5:00");
  });

  it("calculates pace with seconds padding", () => {
    expect(calculatePaceFromInput("10", "52")).toBe("5:12");
  });

  it("pads single-digit seconds with zero", () => {
    expect(calculatePaceFromInput("10", "51")).toBe("5:06");
  });

  it("handles decimal inputs", () => {
    expect(calculatePaceFromInput("5.5", "30")).toBe("5:27");
  });

  it("handles expressions as inputs", () => {
    expect(calculatePaceFromInput("5+5", "50")).toBe("5:00");
  });

  it("returns --:-- for zero distance", () => {
    expect(calculatePaceFromInput("0", "50")).toBe("--:--");
  });

  it("returns --:-- for zero duration", () => {
    expect(calculatePaceFromInput("10", "0")).toBe("--:--");
  });

  it("returns --:-- for negative distance", () => {
    expect(calculatePaceFromInput("-10", "50")).toBe("--:--");
  });

  it("returns --:-- for negative duration", () => {
    expect(calculatePaceFromInput("10", "-50")).toBe("--:--");
  });

  it("returns --:-- for invalid distance expression", () => {
    expect(calculatePaceFromInput("abc", "50")).toBe("--:--");
  });

  it("returns --:-- for invalid duration expression", () => {
    expect(calculatePaceFromInput("10", "xyz")).toBe("--:--");
  });

  it("returns --:-- for malicious input", () => {
    expect(calculatePaceFromInput("alert(1)", "50")).toBe("--:--");
  });

  it("handles seconds rounding to 60 edge case", () => {
    // When fractional seconds are >= 59.5, Math.round produces 60
    expect(calculatePaceFromInput("10", "59.92")).toBe("6:00");
  });

  it("handles NaN from division by zero", () => {
    expect(calculatePaceFromInput("1/0", "50")).toBe("--:--");
  });

  it("handles Infinity in calculations", () => {
    expect(calculatePaceFromInput("10", "1/0")).toBe("--:--");
  });
});
