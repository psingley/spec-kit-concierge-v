import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { api } from '../api';
import { installConciergeBridge } from '../api/testBridge';
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
    reducer: { workspace: workspaceReducer, steps: stepsReducer, [api.reducerPath]: api.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware)
  });

describe('RepoBrowseScreenContainer startNew', () => {
  it('calls startSession and enters the workspace pointed at the WORKTREE path', async () => {
    const startSession = vi.fn(async () => ({
      sessionId: 'session-xyz',
      worktreePath: '/clone.worktrees/session-xyz',
      branch: '003-add-dark-mode'
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
      expect(store.getState().workspace.branch).toBe('003-add-dark-mode');
    });
  });
});
