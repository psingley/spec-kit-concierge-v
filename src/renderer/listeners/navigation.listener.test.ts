import { describe, expect, it, vi } from 'vitest';
import { createMemoryRouter } from 'react-router';
import { copilotLoginSucceeded, githubLoginSucceeded } from '../slices/auth';
import { repositorySelected, workspaceEntered, workspaceStepViewed } from '../slices/workspace';
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

  it('does not replace-navigate when the workspace step is already encoded in the URL', async () => {
    const store = createProductStore();
    const router = createTestRouter('/workspace?step=plan');
    const navigate = vi.spyOn(router, 'navigate');
    store.wireRouter(router);

    store.dispatch(workspaceStepViewed('plan'));
    await waitForListener();

    expect(navigate).not.toHaveBeenCalled();
    expect(router.state.location.pathname).toBe('/workspace');
    expect(router.state.location.search).toBe('?step=plan');
  });

  it('navigates a resumed session to its first incomplete step', async () => {
    const store = createProductStore();
    const router = createTestRouter('/repos');
    store.wireRouter(router);

    store.dispatch(workspaceEntered({
      repo,
      branch: '015-remove-activity-left',
      restoredStates: {
        specify: 'complete',
        clarify: 'complete',
        plan: 'complete',
        tasks: 'pending',
        analyze: 'not_available',
        review: 'not_available'
      }
    }));
    await waitForListener();

    expect(router.state.location.pathname).toBe('/workspace');
    expect(router.state.location.search).toBe('?step=tasks');
  });
});
