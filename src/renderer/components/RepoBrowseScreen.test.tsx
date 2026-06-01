import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RepoBrowseScreen } from './RepoBrowseScreen';
import type { BranchSession, RepositorySummary } from '../slices/workspace';

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
        onBackToRepos={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: 'Pick a repository' })).toBeInTheDocument();
    expect(screen.getByText('Choose a Collette-travel repo to scope spec-kit to.')).toBeInTheDocument();
    expect(screen.getByText('All repos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'concierge-api4 sessions2h ago' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'itinerary-servicenewmain' })).toBeInTheDocument();
  });

  it('renders the selected repo branch picker as resumable session buttons', () => {
    const onResume = vi.fn();
    const onStartNew = vi.fn();
    const onBackToRepos = vi.fn();
    render(
      <RepoBrowseScreen
        repositories={repositories}
        sessions={[]}
        selectedRepo={repositories[0]!}
        loading={false}
        onSelectRepo={vi.fn()}
        onResume={onResume}
        onStartNew={onStartNew}
        onBackToRepos={onBackToRepos}
      />
    );

    expect(screen.getByRole('button', { name: '← All repos' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'concierge-api' })).toBeInTheDocument();
    expect(screen.getByText('Resume a prior session or start fresh from main.')).toBeInTheDocument();
    expect(screen.getByText('4 prior sessions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'spec/0042-self-serve-flight-changePlan2h ago' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start a new sessionfrom main' })).toBeInTheDocument();
  });

  it('uses runtime branch sessions when provided', () => {
    const sessions: BranchSession[] = [
      {
        branch: 'spec/runtime-session',
        label: 'Runtime session',
        restoredStates: { specify: 'complete', clarify: 'pending', plan: 'not_available', tasks: 'not_available', analyze: 'not_available', review: 'not_available' }
      }
    ];

    render(
      <RepoBrowseScreen
        repositories={repositories}
        sessions={sessions}
        selectedRepo={repositories[1]!}
        loading={false}
        onSelectRepo={vi.fn()}
        onResume={vi.fn()}
        onStartNew={vi.fn()}
        onBackToRepos={vi.fn()}
      />
    );

    expect(screen.getByText('1 prior session')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'spec/runtime-sessionClarifyrecent' })).toBeInTheDocument();
  });

  it('resumes with the full session so step-state can be restored', () => {
    const onResume = vi.fn();
    const sessions: BranchSession[] = [
      {
        branch: 'spec/runtime-session',
        label: 'Runtime session',
        restoredStates: { specify: 'complete', clarify: 'pending', plan: 'not_available', tasks: 'not_available', analyze: 'not_available', review: 'not_available' }
      }
    ];

    render(
      <RepoBrowseScreen
        repositories={repositories}
        sessions={sessions}
        selectedRepo={repositories[1]!}
        loading={false}
        onSelectRepo={vi.fn()}
        onResume={onResume}
        onStartNew={vi.fn()}
        onBackToRepos={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'spec/runtime-sessionClarifyrecent' }));

    expect(onResume).toHaveBeenCalledWith(repositories[1]!, sessions[0]!);
  });
});
