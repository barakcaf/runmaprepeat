import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { Card } from '../components/ui/Card';

describe('Card', () => {
  describe('rendering', () => {
    it('renders children', () => {
      render(<Card>Hello World</Card>);
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('renders as div by default', () => {
      const { container } = render(<Card>Content</Card>);
      expect(container.firstChild?.nodeName).toBe('DIV');
    });

    it('renders as article when specified', () => {
      const { container } = render(<Card as="article">Content</Card>);
      expect(container.firstChild?.nodeName).toBe('ARTICLE');
    });

    it('renders as section when specified', () => {
      const { container } = render(<Card as="section">Content</Card>);
      expect(container.firstChild?.nodeName).toBe('SECTION');
    });

    it('applies default medium padding', () => {
      const { container } = render(<Card>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('padding-md');
    });

    it('applies no padding when specified', () => {
      const { container } = render(<Card padding="none">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('padding-none');
    });

    it('applies small padding when specified', () => {
      const { container } = render(<Card padding="sm">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('padding-sm');
    });

    it('applies large padding when specified', () => {
      const { container } = render(<Card padding="lg">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('padding-lg');
    });

    it('merges custom className with base styles', () => {
      const { container } = render(<Card className="custom-class">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('card');
      expect(card.className).toContain('custom-class');
    });
  });

  describe('interactivity', () => {
    it('is not interactive by default', () => {
      const { container } = render(<Card>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).not.toHaveAttribute('role', 'button');
      expect(card).not.toHaveAttribute('tabIndex');
      expect(card.className).not.toContain('interactive');
    });

    it('applies interactive class when interactive', () => {
      const { container } = render(
        <Card interactive onClick={() => {}}>
          Content
        </Card>
      );
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('interactive');
    });

    it('calls onClick when clicked', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      render(
        <Card interactive onClick={handleClick}>
          Content
        </Card>
      );
      const button = screen.getByRole('button');
      await user.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when not interactive', () => {
      const handleClick = vi.fn();
      const { container } = render(<Card onClick={handleClick}>Content</Card>);
      const card = container.firstChild as HTMLElement;
      card.click();
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('keyboard navigation', () => {
    it('adds role=button when interactive', () => {
      const { container } = render(
        <Card interactive onClick={() => {}}>
          Content
        </Card>
      );
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveAttribute('role', 'button');
    });

    it('adds tabIndex=0 when interactive', () => {
      const { container } = render(
        <Card interactive onClick={() => {}}>
          Content
        </Card>
      );
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('calls onClick on Enter key', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      render(
        <Card interactive onClick={handleClick}>
          Content
        </Card>
      );
      const card = screen.getByRole('button');
      card.focus();
      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('calls onClick on Space key', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      render(
        <Card interactive onClick={handleClick}>
          Content
        </Card>
      );
      const card = screen.getByRole('button');
      card.focus();
      await user.keyboard(' ');
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick on other keys', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      render(
        <Card interactive onClick={handleClick}>
          Content
        </Card>
      );
      const card = screen.getByRole('button');
      card.focus();
      await user.keyboard('{Escape}');
      await user.keyboard('{Tab}');
      await user.keyboard('a');
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('calls custom onKeyDown handler', async () => {
      const handleKeyDown = vi.fn();
      const user = userEvent.setup();
      render(
        <Card interactive onClick={() => {}} onKeyDown={handleKeyDown}>
          Content
        </Card>
      );
      const card = screen.getByRole('button');
      card.focus();
      await user.keyboard('{Enter}');
      expect(handleKeyDown).toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('has no role when not interactive', () => {
      const { container } = render(<Card>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).not.toHaveAttribute('role');
    });

    it('is keyboard focusable when interactive', () => {
      render(
        <Card interactive onClick={() => {}}>
          Content
        </Card>
      );
      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('is not keyboard focusable when not interactive', () => {
      const { container } = render(<Card>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).not.toHaveAttribute('tabIndex');
    });

    it('sets aria-disabled when interactive but no onClick', () => {
      const { container } = render(<Card interactive>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveAttribute('aria-disabled', 'true');
    });

    it('does not set aria-disabled when onClick is provided', () => {
      const { container } = render(
        <Card interactive onClick={() => {}}>
          Content
        </Card>
      );
      const card = container.firstChild as HTMLElement;
      expect(card).not.toHaveAttribute('aria-disabled');
    });
  });

  describe('composition', () => {
    it('renders nested content correctly', () => {
      render(
        <Card>
          <h2>Title</h2>
          <p>Description</p>
        </Card>
      );
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
    });

    it('combines all props correctly', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      const { container } = render(
        <Card
          as="article"
          padding="lg"
          interactive
          onClick={handleClick}
          className="custom"
        >
          Content
        </Card>
      );
      const card = container.firstChild as HTMLElement;

      // Element type
      expect(card.nodeName).toBe('ARTICLE');

      // Padding
      expect(card.className).toContain('padding-lg');

      // Interactive
      expect(card).toHaveAttribute('role', 'button');
      expect(card.className).toContain('interactive');

      // Custom class
      expect(card.className).toContain('custom');

      // Click works
      await user.click(card);
      expect(handleClick).toHaveBeenCalled();
    });
  });
});
