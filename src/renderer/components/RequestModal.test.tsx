import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RequestModal } from './RequestModal';

describe('RequestModal', () => {
  it('renders the request form controls and closes from cancel', async () => {
    const onClose = vi.fn();
    render(<RequestModal open onClose={onClose} />);

    expect(screen.getByRole('dialog', { name: /request support/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Report a bug or request a feature' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Feature' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bug' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Normal' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('#concierge-triage')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send request' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
