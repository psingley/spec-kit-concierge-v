import { describe, expect, it } from 'vitest';
import { createMemoryRouter } from 'react-router';
import { copilotLoginSucceeded, githubLoginSucceeded } from '../slices/auth';
import { repositorySelected, workspaceEntered } from '../slices/workspace';
import { createProductStore } from '../store';

const repo = {
  id: 'repo-1',
  name: 'concierge',
  owner: 'octo',
  path: '/work/concierge',
  defaultBranch: 'main'
};

const createTestRouter = (initialEntry = '/sign-in') =>
  createMemoryRouter(
    [
      { path: '/sign-in', element: null },
      { path: '/repos', element: null },
      { path: '/workspace', element: null }
    ],
    { initialEntries: [initialEntry] }
  );

const waitForListener = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

describe('navigation listener branch-null routing', () => {
  it('navigates to /workspace when auth opens for an entered branch-null session', async () => {
    const store = createProductStore();
    store.dispatch(githubLoginSucceeded({ identity: { login: 'octo' } }));
    store.dispatch(workspaceEntered({ repo, branch: null }));
    const router = createTestRouter('/sign-in');
    store.wireRouter(router);

    store.dispatch(copilotLoginSucceeded());
    await waitForListener();

    expect(router.state.location.pathname).toBe('/workspace');
  });

  it('navigates to /repos when auth opens for a selected repo without an entered session', async () => {
    const store = createProductStore();
    store.dispatch(githubLoginSucceeded({ identity: { login: 'octo' } }));
    store.dispatch(repositorySelected(repo));
    const router = createTestRouter('/sign-in');
    store.wireRouter(router);

    store.dispatch(copilotLoginSucceeded());
    await waitForListener();

    expect(router.state.location.pathname).toBe('/repos');
  });
});
