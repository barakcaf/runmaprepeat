import "vitest";

declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Assertion<T = any> {
    toHaveNoViolations(): void;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface AsymmetricMatchersContaining<T = any> {
    toHaveNoViolations(): void;
  }
}
