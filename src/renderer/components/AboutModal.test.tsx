import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AboutModal } from './AboutModal';

describe('AboutModal visual contract', () => {
  it('renders the design about panel', () => {
    const { container } = render(<AboutModal open onClose={vi.fn()} repo="concierge-api" branch="spec/demo" />);

    expect(container.querySelector('[data-vd-role="modal-veil"]')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Spec-kit Concierge' })).toBeInTheDocument();
    expect(screen.getByText('An Electron wrapper around GitHub Copilot CLI driving the spec-kit workflow, tuned for the Collette-travel concierge team.')).toBeInTheDocument();
    expect(screen.getByText('2.0.0 (2026.05.20)')).toBeInTheDocument();
    expect(screen.getByText('collette-travel')).toBeInTheDocument();
    expect(screen.getByText('concierge-api')).toBeInTheDocument();
    expect(screen.getByText('claude-sonnet-4-5')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Documentation' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });
});
