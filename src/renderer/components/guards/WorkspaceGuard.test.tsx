import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { WorkspaceGuard } from './WorkspaceGuard';
import { authReducer } from '../../slices/auth';
import { workspaceReducer } from '../../slices/workspace';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createTestStore = (overrides: Record<string, any> = {}) =>
  configureStore({
    reducer: { auth: authReducer, workspace: workspaceReducer },
    preloadedState: overrides
  } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

const renderWithRouter = (store: ReturnType<typeof createTestStore>, initialEntry = '/guarded') => {
  const routes = [
    {
      path: '/',
      element: <WorkspaceGuard />,
      children: [{ path: 'guarded', element: <div data-testid="workspace-content">Workspace</div> }]
    },
    { path: '/repos', element: <div data-testid="repos-redirect">Repos</div> }
  ];
  const router = createMemoryRouter(routes, { initialEntries: [initialEntry] });
  return render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  );
};

describe('WorkspaceGuard', () => {
  it('renders Outlet when repo and branch are set', () => {
    const store = createTestStore({
      auth: { copilotLoggedIn: true, githubLoggedIn: true, github: 'ok', copilot: 'ok', atlassian: 'out', identity: null, lastError: null },
      workspace: {
        activeRepoPath: '/path',
        agents: null,
        branch: 'main',
        ahead: 0,
        behind: 0,
        dirty: false,
        selectedRepo: { id: '1', name: 'repo', owner: 'user', path: '/path', defaultBranch: 'main' },
        sessions: [],
        activeStep: 'specify' as const,
        maxReachedStep: 'specify' as const
      }
    });
    renderWithRouter(store);

    expect(screen.getByTestId('workspace-content')).toBeInTheDocument();
  });

  it('redirects to /repos when no workspace selected', () => {
    const store = createTestStore({
      auth: { copilotLoggedIn: true, githubLoggedIn: true, github: 'ok', copilot: 'ok', atlassian: 'out', identity: null, lastError: null },
      workspace: {
        activeRepoPath: null,
        agents: null,
        branch: null,
        ahead: 0,
        behind: 0,
        dirty: false,
        selectedRepo: null,
        sessions: [],
        activeStep: 'specify' as const,
        maxReachedStep: 'specify' as const
      }
    });
    renderWithRouter(store);

    expect(screen.getByTestId('repos-redirect')).toBeInTheDocument();
    expect(screen.queryByTestId('workspace-content')).not.toBeInTheDocument();
  });
});
