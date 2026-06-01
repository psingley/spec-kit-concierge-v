import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { api } from '../api';
import { installConciergeBridge } from '../api/testBridge';
import { sessionReducer } from '../slices/session';
import { stepsReducer } from '../slices/steps';
import { workspaceReducer } from '../slices/workspace';
import { RepoBrowseScreenContainer } from './RepoBrowseScreenContainer';

const repo = {
  id: '1',
  owner: 'psingley',
  name: 'workcells',
  path: 'psingley/workcells',
  defaultBranch: 'main',
  language: 'TypeScript'
};

const makeStore = () =>
  configureStore({
    reducer: { workspace: workspaceReducer, steps: stepsReducer, session: sessionReducer, [api.reducerPath]: api.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware)
  });

describe('RepoBrowseScreenContainer startNew', () => {
  it('calls startSession and enters the workspace pointed at the WORKTREE path (branch null until spec-kit names it)', async () => {
    const startSession = vi.fn(async () => ({
      sessionId: 'session-xyz',
      worktreePath: '/clone.worktrees/session-xyz'
    }));
    installConciergeBridge({
      repos: { list: vi.fn(async () => ({ repositories: [repo] })) },
      repo: {
        ensureLocal: vi.fn(async () => ({ localPath: '/clone', cloned: false })),
        startSession
      },
      branches: { sessions: vi.fn(async () => ({ sessions: [] })) }
    });
    const store = makeStore();

    render(
      <Provider store={store}>
        <RepoBrowseScreenContainer />
      </Provider>
    );

    // Pick the repo, which clones (ensureLocal) and loads branch sessions.
    const repoButton = await screen.findByRole('button', { name: /workcells/ });
    fireEvent.click(repoButton);

    // Once local is ready, the "Start a new session" CTA renders.
    const startButton = await screen.findByRole('button', { name: /Start a new session/i });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(startSession).toHaveBeenCalledWith({
        clonePath: '/clone',
        defaultBranch: 'main',
        description: 'new session'
      });
    });

    await waitFor(() => {
      // repo.path becomes the WORKTREE path so all downstream git + spawn run there.
      expect(store.getState().workspace.activeRepoPath).toBe('/clone.worktrees/session-xyz');
      // No branch yet — the detached worktree is unnamed until spec-kit's
      // before_specify hook creates the real branch (branchUpdated sets it later).
      expect(store.getState().workspace.branch).toBeNull();
    });
  });
});

describe('RepoBrowseScreenContainer resume (Phase 2: read worktree in place)', () => {
  it('enters the workspace pointed at the session worktree, restores step-state, and NEVER checks out', async () => {
    const checkout = vi.fn();
    installConciergeBridge({
      repos: { list: vi.fn(async () => ({ repositories: [repo] })) },
      repo: {
        ensureLocal: vi.fn(async () => ({ localPath: '/clone', cloned: false })),
        startSession: vi.fn()
      },
      git: { read: vi.fn(), checkout, resetMain: vi.fn() },
      branches: {
        sessions: vi.fn(async () => ({
          sessions: [
            {
              sessionId: 'session-014',
              worktreePath: '/clone.worktrees/session-014',
              branch: '014-remove-faux-controls',
              label: '014-remove-faux-controls',
              restoredStates: { specify: 'complete', clarify: 'pending', plan: 'not_available', tasks: 'not_available', analyze: 'not_available', review: 'not_available' },
              restoredStepCommits: { specify: 'specify-sha' }
            }
          ]
        }))
      }
    });
    const store = makeStore();

    render(
      <Provider store={store}>
        <RepoBrowseScreenContainer />
      </Provider>
    );

    const repoButton = await screen.findByRole('button', { name: /workcells/ });
    fireEvent.click(repoButton);

    const resumeButton = await screen.findByRole('button', { name: /014-remove-faux-controls/ });
    fireEvent.click(resumeButton);

    await waitFor(() => {
      // Workspace points at the session's WORKTREE path — not the clone — and the
      // branch + restored states come straight from the session (no checkout).
      expect(store.getState().workspace.activeRepoPath).toBe('/clone.worktrees/session-014');
      expect(store.getState().workspace.branch).toBe('014-remove-faux-controls');
      expect(store.getState().steps.entities.specify?.status).toBe('complete');
    });

    // The entire Phase 2 point: resume reads the worktree in place. No `git checkout`.
    expect(checkout).not.toHaveBeenCalled();
  });
});
