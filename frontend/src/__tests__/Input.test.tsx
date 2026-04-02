import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Input from '../components/ui/Input';

describe('Input', () => {
  it('renders a basic input', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('renders label associated via htmlFor', () => {
    render(<Input label="Email" id="email" />);
    const input = screen.getByLabelText('Email');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('id', 'email');
  });

  it('generates an id when none is provided', () => {
    render(<Input label="Name" />);
    const input = screen.getByLabelText('Name');
    expect(input).toHaveAttribute('id');
  });

  it('renders error message with aria-describedby and aria-invalid', () => {
    render(<Input label="Email" id="email" error="Email is required" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'email-error');

    const errorMsg = screen.getByRole('alert');
    expect(errorMsg).toHaveTextContent('Email is required');
    expect(errorMsg).toHaveAttribute('id', 'email-error');
  });

  it('renders hint text with aria-describedby', () => {
    render(<Input label="Password" id="pw" hint="Min 8 characters" />);
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('aria-describedby', 'pw-hint');
    expect(screen.getByText('Min 8 characters')).toHaveAttribute('id', 'pw-hint');
  });

  it('hides hint when error is present', () => {
    render(<Input label="Email" id="email" error="Required" hint="Your email" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
    expect(screen.queryByText('Your email')).not.toBeInTheDocument();
  });

  it('shows required indicator when required', () => {
    render(<Input label="Name" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('does not set aria-invalid when there is no error', () => {
    render(<Input label="Name" id="name" />);
    expect(screen.getByLabelText('Name')).not.toHaveAttribute('aria-invalid');
  });

  it('applies error class when error prop is set', () => {
    render(<Input id="test" error="Bad" />);
    const input = screen.getByRole('textbox');
    expect(input.className).toContain('inputError');
  });

  it('forwards ref to the input element', () => {
    const ref = { current: null as HTMLInputElement | null };
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});
