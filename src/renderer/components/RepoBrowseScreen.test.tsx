import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RepoBrowseScreen } from './RepoBrowseScreen';
import type { RepositorySummary } from '../slices/workspace';

const repositories: RepositorySummary[] = [
  { id: '1', owner: 'collette-travel', name: 'concierge-api', path: '/repo/concierge-api', defaultBranch: 'main', language: 'TypeScript' },
  { id: '2', owner: 'collette-travel', name: 'itinerary-service', path: '/repo/itinerary-service', defaultBranch: 'main', language: 'Go' }
];

describe('RepoBrowseScreen visual contract', () => {
  it('renders the design repo-picker rows as button actions', () => {
    render(
      <RepoBrowseScreen
        repositories={repositories}
        sessions={[]}
        selectedRepo={null}
        loading={false}
        onSelectRepo={vi.fn()}
        onResume={vi.fn()}
        onStartNew={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: 'Pick a repository' })).toBeInTheDocument();
    expect(screen.getByText('Choose a Collette-travel repo to scope spec-kit to.')).toBeInTheDocument();
    expect(screen.getByText('All repos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'concierge-api4 sessions2h ago' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'itinerary-servicenewmain' })).toBeInTheDocument();
  });
});
