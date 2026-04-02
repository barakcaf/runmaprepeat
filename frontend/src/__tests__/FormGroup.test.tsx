import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FormGroup from '../components/ui/FormGroup';

describe('FormGroup', () => {
  it('renders label associated with child input via htmlFor', () => {
    render(
      <FormGroup label="Email" htmlFor="email">
        <input id="email" />
      </FormGroup>
    );
    const label = screen.getByText('Email');
    expect(label.tagName).toBe('LABEL');
    expect(label).toHaveAttribute('for', 'email');
  });

  it('renders error message with correct id for aria-describedby', () => {
    render(
      <FormGroup label="Email" htmlFor="email" error="Required">
        <input id="email" aria-describedby="email-error" />
      </FormGroup>
    );
    const errorMsg = screen.getByRole('alert');
    expect(errorMsg).toHaveTextContent('Required');
    expect(errorMsg).toHaveAttribute('id', 'email-error');
  });

  it('renders hint text with correct id for aria-describedby', () => {
    render(
      <FormGroup label="Email" htmlFor="email" hint="We won't share it">
        <input id="email" aria-describedby="email-hint" />
      </FormGroup>
    );
    const hint = screen.getByText("We won't share it");
    expect(hint).toHaveAttribute('id', 'email-hint');
  });

  it('hides hint when error is present', () => {
    render(
      <FormGroup label="Email" htmlFor="email" error="Bad" hint="Help text">
        <input id="email" />
      </FormGroup>
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Bad');
    expect(screen.queryByText('Help text')).not.toBeInTheDocument();
  });

  it('renders required indicator', () => {
    render(
      <FormGroup label="Name" htmlFor="name" required>
        <input id="name" />
      </FormGroup>
    );
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <FormGroup label="Custom" htmlFor="custom">
        <select id="custom">
          <option>A</option>
        </select>
      </FormGroup>
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('has role="group" with aria-labelledby', () => {
    render(
      <FormGroup label="Field" htmlFor="field">
        <input id="field" />
      </FormGroup>
    );
    const group = screen.getByRole('group');
    expect(group).toHaveAttribute('aria-labelledby', 'field-label');
  });
});
