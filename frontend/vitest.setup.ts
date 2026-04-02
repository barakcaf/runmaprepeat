import "@testing-library/jest-dom/vitest";
import { toHaveNoViolations } from "vitest-axe/dist/matchers";

expect.extend(toHaveNoViolations);
