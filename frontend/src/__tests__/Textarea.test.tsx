import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Textarea from '../components/ui/Textarea';

describe('Textarea', () => {
  it('renders a textarea element', () => {
    render(<Textarea placeholder="Enter notes" />);
    expect(screen.getByPlaceholderText('Enter notes').tagName).toBe('TEXTAREA');
  });

  it('renders label associated via htmlFor', () => {
    render(<Textarea label="Notes" id="notes" />);
    const textarea = screen.getByLabelText('Notes');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveAttribute('id', 'notes');
  });

  it('renders error message with aria-describedby and aria-invalid', () => {
    render(<Textarea label="Notes" id="notes" error="Too short" />);
    const textarea = screen.getByLabelText('Notes');
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
    expect(textarea).toHaveAttribute('aria-describedby', 'notes-error');

    const errorMsg = screen.getByRole('alert');
    expect(errorMsg).toHaveTextContent('Too short');
  });

  it('renders hint text with aria-describedby', () => {
    render(<Textarea label="Bio" id="bio" hint="Max 500 chars" />);
    const textarea = screen.getByLabelText('Bio');
    expect(textarea).toHaveAttribute('aria-describedby', 'bio-hint');
    expect(screen.getByText('Max 500 chars')).toBeInTheDocument();
  });

  it('hides hint when error is present', () => {
    render(<Textarea label="Bio" id="bio" error="Required" hint="Max 500" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
    expect(screen.queryByText('Max 500')).not.toBeInTheDocument();
  });

  it('defaults to 3 rows', () => {
    render(<Textarea id="t" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('rows', '3');
  });

  it('allows custom rows', () => {
    render(<Textarea id="t" rows={5} />);
    expect(screen.getByRole('textbox')).toHaveAttribute('rows', '5');
  });

  it('forwards ref to the textarea element', () => {
    const ref = { current: null as HTMLTextAreaElement | null };
    render(<Textarea ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });
});
