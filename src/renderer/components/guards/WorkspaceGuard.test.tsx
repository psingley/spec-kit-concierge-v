import React from 'react';
import { Provider } from 'react-redux';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { createProductStore } from '../../store';
import { workspaceEntered } from '../../slices/workspace';
import { WorkspaceGuard } from './WorkspaceGuard';

const repo = {
  id: 'repo-1',
  name: 'concierge',
  owner: 'octo',
  path: '/work/concierge',
  defaultBranch: 'main'
};

const renderGuard = (store: ReturnType<typeof createProductStore>) => {
  const router = createMemoryRouter(
    [
      {
        path: '/workspace',
        element: <WorkspaceGuard />,
        children: [{ index: true, element: <div data-testid="workspace">Workspace</div> }]
      },
      { path: '/repos', element: <div data-testid="repos">Repos</div> }
    ],
    { initialEntries: ['/workspace'] }
  );

  return render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  );
};

describe('WorkspaceGuard', () => {
  it('allows an entered branch-null worktree session', () => {
    const store = createProductStore();
    store.dispatch(workspaceEntered({ repo, branch: null }));

    renderGuard(store);

    expect(screen.getByTestId('workspace')).toBeInTheDocument();
  });

  it('redirects to /repos when a repo is selected but no session has been entered', () => {
    const store = createProductStore();

    renderGuard(store);

    expect(screen.getByTestId('repos')).toBeInTheDocument();
  });
});
