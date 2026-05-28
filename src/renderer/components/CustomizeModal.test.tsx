import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CustomizeModal } from './CustomizeModal';

describe('CustomizeModal visual contract', () => {
  it('renders the design modal sections and segmented controls', () => {
    const { container } = render(
      <CustomizeModal
        open
        accent="#3a7e9a"
        density="comfortable"
        activitySide="right"
        requireScroll={false}
        onChange={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(container.querySelector('[data-vd-role="modal-veil"]')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Customize' })).toBeInTheDocument();
    expect(screen.getByText('Theme')).toBeInTheDocument();
    expect(screen.getByText('Accent')).toBeInTheDocument();
    expect(screen.getByText('Density')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Compact' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Regular' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Comfy' })).toBeInTheDocument();
    expect(screen.getByText('Layout')).toBeInTheDocument();
    expect(screen.getByText('Activity stream')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Left' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Right' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Off' })).toBeInTheDocument();
    expect(screen.getByText('Flow')).toBeInTheDocument();
    expect(screen.getByText('Require scroll to unlock Clarify')).toBeInTheDocument();
  });
});
