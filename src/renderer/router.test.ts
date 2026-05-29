import { describe, expect, it } from 'vitest';
import { createAppRouter } from './router';
import { createProductStore } from './store';

describe('createAppRouter', () => {
  it('creates a memory router with sign-in, repos, workspace, and catch-all routes', () => {
    const store = createProductStore();
    const router = createAppRouter(store);

    // Routes are nested under the root layout
    const childPaths = router.routes[0]?.children?.map((r) => r.path) ?? [];
    expect(childPaths).toContain('/sign-in');
    expect(childPaths).toContain('/repos');
    expect(childPaths).toContain('/workspace');
  });

  it('includes a catch-all wildcard route', () => {
    const store = createProductStore();
    const router = createAppRouter(store);

    const catchAll = router.routes[0]?.children?.find((r) => r.path === '*');
    expect(catchAll).toBeDefined();
  });

  it('sets initial entry based on store auth state (unauthenticated defaults to /sign-in)', () => {
    const store = createProductStore();
    const router = createAppRouter(store);

    expect(router.state.location.pathname).toBe('/sign-in');
  });
});
