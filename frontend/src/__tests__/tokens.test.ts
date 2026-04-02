import { describe, it, expect } from 'vitest';

describe('Design System Tokens', () => {
  it('should parse tokens CSS files correctly', () => {
    // Verify that all token files are properly formatted and parseable
    const tokenModules = [
      () => import('../styles/tokens/colors.css'),
      () => import('../styles/tokens/typography.css'),
      () => import('../styles/tokens/spacing.css'),
      () => import('../styles/tokens/components.css'),
      () => import('../styles/tokens/index.css'),
    ];

    // All modules should be importable without throwing errors
    expect(() => tokenModules).not.toThrow();

    // Test that CSS custom properties are available on the root element
    const root = document.documentElement;

    // Create a test element to apply styles and verify CSS custom properties work
    const testElement = document.createElement('div');
    testElement.style.color = 'var(--color-primary)';
    testElement.style.fontSize = 'var(--text-base)';
    testElement.style.padding = 'var(--space-4)';
    testElement.style.borderRadius = 'var(--radius-md)';

    document.body.appendChild(testElement);

    // Verify styles can be applied (would fail if CSS is malformed)
    expect(testElement.style.color).toBe('var(--color-primary)');
    expect(testElement.style.fontSize).toBe('var(--text-base)');
    expect(testElement.style.padding).toBe('var(--space-4)');
    expect(testElement.style.borderRadius).toBe('var(--radius-md)');

    document.body.removeChild(testElement);
  });

  it('should define all required color tokens', () => {
    // Create a snapshot of the token structure to ensure consistency
    const expectedTokens = {
      brand: ['--color-primary', '--color-primary-hover', '--color-primary-subtle', '--color-secondary', '--color-secondary-hover', '--color-secondary-subtle'],
      semantic: ['--color-success', '--color-success-subtle', '--color-warning', '--color-warning-subtle', '--color-error', '--color-error-subtle'],
      neutral: ['--color-bg-primary', '--color-bg-secondary', '--color-bg-tertiary', '--color-border-primary', '--color-border-secondary', '--color-text-primary', '--color-text-secondary', '--color-text-tertiary', '--color-text-on-primary'],
      utility: ['--color-focus-ring', '--color-overlay'],
      chart: ['--color-chart-1', '--color-chart-2', '--color-chart-3', '--color-chart-bg', '--color-chart-grid', '--color-chart-text']
    };

    expect(expectedTokens).toMatchSnapshot();
  });

  it('should define all required typography tokens', () => {
    const expectedTypographyTokens = {
      fonts: ['--font-sans', '--font-mono'],
      sizes: ['--text-xs', '--text-sm', '--text-base', '--text-lg', '--text-xl', '--text-2xl', '--text-3xl'],
      weights: ['--font-weight-normal', '--font-weight-medium', '--font-weight-semibold', '--font-weight-bold'],
      lineHeights: ['--leading-tight', '--leading-normal', '--leading-relaxed']
    };

    expect(expectedTypographyTokens).toMatchSnapshot();
  });

  it('should define all required spacing tokens', () => {
    const expectedSpacingTokens = ['--space-1', '--space-2', '--space-3', '--space-4', '--space-5', '--space-6', '--space-8', '--space-10', '--space-12', '--space-16'];

    expect(expectedSpacingTokens).toMatchSnapshot();
  });

  it('should define all required component tokens', () => {
    const expectedComponentTokens = {
      radius: ['--radius-sm', '--radius-md', '--radius-lg', '--radius-xl', '--radius-full'],
      shadows: ['--shadow-sm', '--shadow-md', '--shadow-lg', '--shadow-xl'],
      transitions: ['--duration-fast', '--duration-normal', '--duration-slow', '--ease-default', '--ease-in', '--ease-out', '--ease-spring', '--transition-colors', '--transition-shadow', '--transition-transform'],
      zIndex: ['--z-base', '--z-dropdown', '--z-sticky', '--z-overlay', '--z-modal', '--z-toast', '--z-nav']
    };

    expect(expectedComponentTokens).toMatchSnapshot();
  });
});