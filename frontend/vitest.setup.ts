import "@testing-library/jest-dom/vitest";
import * as matchers from "vitest-axe/dist/matchers";
import { expect } from "vitest";

expect.extend(matchers);
