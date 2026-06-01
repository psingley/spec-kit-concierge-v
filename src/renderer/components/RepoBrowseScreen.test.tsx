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
  it('renders the live signed-in repositories as button actions', () => {
    render(
      <RepoBrowseScreen
        repositories={repositories}
        sessions={[]}
        selectedRepo={null}
        loading={false}
        error={false}
        onSelectRepo={vi.fn()}
        onResume={vi.fn()}
        onStartNew={vi.fn()}
        onBackToRepos={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: 'Pick a repository' })).toBeInTheDocument();
    expect(screen.getByText('Choose a repository to scope spec-kit to.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /concierge-api/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /itinerary-service/ })).toBeInTheDocument();
  });

  it('shows an honest empty state when the account has no repositories', () => {
    render(
      <RepoBrowseScreen
        repositories={[]}
        sessions={[]}
        selectedRepo={null}
        loading={false}
        error={false}
        onSelectRepo={vi.fn()}
        onResume={vi.fn()}
        onStartNew={vi.fn()}
        onBackToRepos={vi.fn()}
      />
    );

    expect(screen.getByText('No repositories found for the signed-in account.')).toBeInTheDocument();
  });

  it('shows an honest error state when the repository query fails', () => {
    render(
      <RepoBrowseScreen
        repositories={[]}
        sessions={[]}
        selectedRepo={null}
        loading={false}
        error
        onSelectRepo={vi.fn()}
        onResume={vi.fn()}
        onStartNew={vi.fn()}
        onBackToRepos={vi.fn()}
      />
    );

    expect(screen.getByText('Could not load repositories.')).toBeInTheDocument();
  });

  it('renders the selected repo branch picker without fabricated sessions', () => {
    const onResume = vi.fn();
    const onStartNew = vi.fn();
    const onBackToRepos = vi.fn();
    render(
      <RepoBrowseScreen
        repositories={repositories}
        sessions={[]}
        selectedRepo={repositories[0]!}
        loading={false}
        error={false}
        onSelectRepo={vi.fn()}
        onResume={onResume}
        onStartNew={onStartNew}
        onBackToRepos={onBackToRepos}
      />
    );

    expect(screen.getByRole('button', { name: '← All repos' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'concierge-api' })).toBeInTheDocument();
    expect(screen.getByText('Resume a prior session or start fresh from main.')).toBeInTheDocument();
    expect(screen.getByText('0 prior sessions')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'spec/0042-self-serve-flight-changePlan2h ago' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start a new sessionfrom main' })).toBeInTheDocument();
  });

  it('uses runtime branch sessions when provided', () => {
    const sessions: BranchSession[] = [
      {
        sessionId: 'session-runtime',
        worktreePath: '/repo/itinerary-service.worktrees/session-runtime',
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
        error={false}
        onSelectRepo={vi.fn()}
        onResume={vi.fn()}
        onStartNew={vi.fn()}
        onBackToRepos={vi.fn()}
      />
    );

    expect(screen.getByText('1 prior session')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Runtime sessionClarifyrecent' })).toBeInTheDocument();
  });

  it('renders a detached (not-yet-named) session by its sessionId label', () => {
    const sessions: BranchSession[] = [
      {
        sessionId: 'session-detached',
        worktreePath: '/repo/itinerary-service.worktrees/session-detached',
        branch: null,
        label: 'session-detached',
        restoredStates: { specify: 'pending', clarify: 'not_available', plan: 'not_available', tasks: 'not_available', analyze: 'not_available', review: 'not_available' }
      }
    ];

    render(
      <RepoBrowseScreen
        repositories={repositories}
        sessions={sessions}
        selectedRepo={repositories[1]!}
        loading={false}
        error={false}
        onSelectRepo={vi.fn()}
        onResume={vi.fn()}
        onStartNew={vi.fn()}
        onBackToRepos={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'session-detachedSpecifyrecent' })).toBeInTheDocument();
  });

  it('renders a distinct pip visual per step state (complete / pending / not_available)', () => {
    const sessions: BranchSession[] = [
      {
        sessionId: 'session-three-state',
        worktreePath: '/repo/itinerary-service.worktrees/session-three-state',
        branch: 'spec/three-state',
        label: 'Three state',
        // specify complete, clarify pending (dirty/in-progress), the rest not_available.
        restoredStates: { specify: 'complete', clarify: 'pending', plan: 'not_available', tasks: 'not_available', analyze: 'not_available', review: 'not_available' }
      }
    ];

    const { container } = render(
      <RepoBrowseScreen
        repositories={repositories}
        sessions={sessions}
        selectedRepo={repositories[1]!}
        loading={false}
        error={false}
        onSelectRepo={vi.fn()}
        onResume={vi.fn()}
        onStartNew={vi.fn()}
        onBackToRepos={vi.fn()}
      />
    );

    const pips = Array.from(container.querySelectorAll('.rb-branch-pips .pip'));
    expect(pips).toHaveLength(6);
    // stepOrder: specify, clarify, plan, analyze, tasks, review
    expect(pips[0]?.className).toContain('done');
    expect(pips[0]?.className).not.toContain('in-progress');
    expect(pips[1]?.className).toContain('in-progress');
    expect(pips[1]?.className).not.toContain('done');
    expect(pips[2]?.className).toBe('pip');
    expect(pips[3]?.className).toBe('pip');
  });

  it('resumes with the full session so step-state can be restored', () => {
    const onResume = vi.fn();
    const sessions: BranchSession[] = [
      {
        sessionId: 'session-runtime',
        worktreePath: '/repo/itinerary-service.worktrees/session-runtime',
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
        error={false}
        onSelectRepo={vi.fn()}
        onResume={onResume}
        onStartNew={vi.fn()}
        onBackToRepos={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Runtime sessionClarifyrecent' }));

    expect(onResume).toHaveBeenCalledWith(repositories[1]!, sessions[0]!);
  });
});
