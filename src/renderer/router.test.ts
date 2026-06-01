import { describe, expect, it } from 'vitest';
import { copilotLoginSucceeded, githubLoginSucceeded } from './slices/auth';
import { workspaceEntered } from './slices/workspace';
import { createAppRouter } from './router';
import { createProductStore } from './store';

const enterAuthGate = (store: ReturnType<typeof createProductStore>): void => {
  store.dispatch(githubLoginSucceeded({ identity: { login: 'octo' } }));
  store.dispatch(copilotLoginSucceeded());
};

const repo = {
  id: 'repo-1',
  name: 'concierge',
  owner: 'octo',
  path: '/work/concierge',
  defaultBranch: 'main'
};

describe('createAppRouter', () => {
  it('starts on /sign-in when the auth gate is closed', () => {
    const store = createProductStore();
    const router = createAppRouter(store);

    expect(router.state.location.pathname).toBe('/sign-in');
  });

  it('starts on /repos when auth is open but no session has been entered', () => {
    const store = createProductStore();
    enterAuthGate(store);
    const router = createAppRouter(store);

    expect(router.state.location.pathname).toBe('/repos');
  });

  it('starts on /workspace for an entered branch-null worktree session', () => {
    const store = createProductStore();
    enterAuthGate(store);
    store.dispatch(workspaceEntered({ repo, branch: null }));

    const router = createAppRouter(store);

    expect(router.state.location.pathname).toBe('/workspace');
  });

  it('defines the expected route surface and catch-all', () => {
    const store = createProductStore();
    const router = createAppRouter(store);
    const childPaths = router.routes[0]?.children?.map((route) => route.path) ?? [];

    expect(childPaths).toEqual(expect.arrayContaining(['/sign-in', '/repos', '/workspace', '*']));
  });
});
