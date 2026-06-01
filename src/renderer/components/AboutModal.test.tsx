import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AboutModal } from './AboutModal';

describe('AboutModal visual contract', () => {
  it('renders the design about panel with the signed-in account', () => {
    const { container } = render(<AboutModal open onClose={vi.fn()} repo="concierge-api" branch="spec/demo" account="psingley" />);

    expect(container.querySelector('[data-vd-role="modal-veil"]')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Spec-kit Concierge' })).toBeInTheDocument();
    expect(screen.getByText('An Electron wrapper around GitHub Copilot CLI driving the spec-kit workflow.')).toBeInTheDocument();
    expect(screen.getByText('2.0.0 (2026.05.20)')).toBeInTheDocument();
    expect(screen.getByText('psingley')).toBeInTheDocument();
    expect(screen.queryByText('collette-travel')).not.toBeInTheDocument();
    expect(screen.getByText('concierge-api')).toBeInTheDocument();
    expect(screen.getByText('claude-sonnet-4-5')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Documentation' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('omits the account row when no account is signed in', () => {
    render(<AboutModal open onClose={vi.fn()} repo="concierge-api" branch="spec/demo" account={null} />);

    expect(screen.queryByText('Account')).not.toBeInTheDocument();
    expect(screen.queryByText('Org')).not.toBeInTheDocument();
  });
});
