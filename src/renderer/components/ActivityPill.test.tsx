import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ActivityPill } from './ActivityPill';

describe('ActivityPill visual contract', () => {
  it('renders the idle compact terminal pill with required markers', () => {
    const { container } = render(<ActivityPill busy={false} currentStatus="Idle" logRate={0} onToggle={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Idle' })).toBeInTheDocument();
    expect(container.querySelector('[data-vd-role="activity-terminal-icon"]')).toBeInTheDocument();
    expect(container.querySelector('[data-vd-role="activity-pill-divider"]')).toBeInTheDocument();
    expect(container.querySelector('[data-vd-role="spinner"]')).toBeInTheDocument();
  });

  it('uses the busy specify prompt as the accessible label without visible chip text', () => {
    const { container } = render(
      <ActivityPill busy currentStatus="Specify complete" label="Build a hello-world feature" logRate={0.5} onToggle={vi.fn()} />
    );

    expect(screen.getByRole('button', { name: 'Build a hello-world feature' })).toBeInTheDocument();
    expect(container.querySelector('.activity-pill.is-busy')).toBeInTheDocument();
    expect(container.querySelector('.ap-label')).toHaveTextContent('Build a hello-world feature');
  });
});
