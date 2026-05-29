import { describe, expect, it } from 'vitest';
import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit';
import { createMemoryRouter } from 'react-router';
import { setupNavigationListener, navigationTopic } from './navigation.listener';
import { authReducer } from '../slices/auth';
import { workspaceReducer, workspaceEntered, repositoryBrowseReset, workspaceStepViewed, specifyCompletedInWorkspace } from '../slices/workspace';
import { authLoginFailed, githubLoginSucceeded, copilotLoginSucceeded, atlassianLoginSucceeded } from '../slices/auth';
import type { AppStartListening } from './types';

const createTestRouter = (initialEntry = '/sign-in') =>
  createMemoryRouter(
    [
      { path: '/sign-in', element: null },
      { path: '/repos', element: null },
      { path: '/workspace', element: null }
    ],
    { initialEntries: [initialEntry] }
  );

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createTestStore = (preloadedState?: Record<string, any>) => {
  const listenerMiddleware = createListenerMiddleware();
  const store = configureStore(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { reducer: { auth: authReducer, workspace: workspaceReducer }, preloadedState, middleware: (getDefault: any) => getDefault().prepend(listenerMiddleware.middleware) } as any
  );
  return { store, startListening: listenerMiddleware.startListening };
};

describe('navigation listener', () => {
  it('exports the navigation topic descriptor', () => {
    expect(navigationTopic.topic).toBe('navigation');
  });

  it('navigates to /sign-in when auth gate closes', async () => {
    const { store, startListening } = createTestStore({
      auth: { copilotLoggedIn: true, githubLoggedIn: true, github: 'ok', copilot: 'ok', atlassian: 'ok', identity: { login: 'user' }, lastError: null },
      workspace: { activeRepoPath: null, agents: null, branch: null, ahead: 0, behind: 0, dirty: false, selectedRepo: null, sessions: [], activeStep: 'specify', maxReachedStep: 'specify' }
    });
    const router = createTestRouter('/repos');
    setupNavigationListener(startListening as unknown as AppStartListening, router);

    store.dispatch(authLoginFailed({ provider: 'github', message: 'session expired' }));
    await new Promise((r) => setTimeout(r, 50));

    expect(router.state.location.pathname).toBe('/sign-in');
  });

  it('navigates to /repos when auth gate opens and no workspace', async () => {
    const { store, startListening } = createTestStore({
      auth: { copilotLoggedIn: null, githubLoggedIn: null, github: 'unknown', copilot: 'locked', atlassian: 'out', identity: null, lastError: null },
      workspace: { activeRepoPath: null, agents: null, branch: null, ahead: 0, behind: 0, dirty: false, selectedRepo: null, sessions: [], activeStep: 'specify', maxReachedStep: 'specify' }
    });
    const router = createTestRouter('/sign-in');
    setupNavigationListener(startListening as unknown as AppStartListening, router);

    store.dispatch(githubLoginSucceeded({ identity: { login: 'user' } }));
    store.dispatch(copilotLoginSucceeded());
    store.dispatch(atlassianLoginSucceeded());
    await new Promise((r) => setTimeout(r, 50));

    expect(router.state.location.pathname).toBe('/repos');
  });

  it('navigates to /workspace when workspaceEntered dispatched', async () => {
    const { store, startListening } = createTestStore({
      auth: { copilotLoggedIn: true, githubLoggedIn: true, github: 'ok', copilot: 'ok', atlassian: 'out', identity: null, lastError: null },
      workspace: { activeRepoPath: null, agents: null, branch: null, ahead: 0, behind: 0, dirty: false, selectedRepo: null, sessions: [], activeStep: 'specify', maxReachedStep: 'specify' }
    });
    const router = createTestRouter('/repos');
    setupNavigationListener(startListening as unknown as AppStartListening, router);

    store.dispatch(workspaceEntered({
      repo: { id: '1', name: 'test', owner: 'user', path: '/test', defaultBranch: 'main' },
      branch: 'main'
    }));
    await new Promise((r) => setTimeout(r, 50));

    expect(router.state.location.pathname).toBe('/workspace');
  });

  it('navigates to /repos when repositoryBrowseReset dispatched', async () => {
    const { store, startListening } = createTestStore({
      auth: { copilotLoggedIn: true, githubLoggedIn: true, github: 'ok', copilot: 'ok', atlassian: 'out', identity: null, lastError: null },
      workspace: { activeRepoPath: '/path', agents: null, branch: 'main', ahead: 0, behind: 0, dirty: false, selectedRepo: { id: '1', name: 'repo', owner: 'user', path: '/path', defaultBranch: 'main' }, sessions: [], activeStep: 'specify', maxReachedStep: 'specify' }
    });
    const router = createTestRouter('/workspace');
    setupNavigationListener(startListening as unknown as AppStartListening, router);

    store.dispatch(repositoryBrowseReset());
    await new Promise((r) => setTimeout(r, 50));

    expect(router.state.location.pathname).toBe('/repos');
  });

  it('updates ?step= query param when workspaceStepViewed dispatched', async () => {
    const { store, startListening } = createTestStore({
      auth: { copilotLoggedIn: true, githubLoggedIn: true, github: 'ok', copilot: 'ok', atlassian: 'out', identity: null, lastError: null },
      workspace: { activeRepoPath: '/path', agents: null, branch: 'main', ahead: 0, behind: 0, dirty: false, selectedRepo: { id: '1', name: 'repo', owner: 'user', path: '/path', defaultBranch: 'main' }, sessions: [], activeStep: 'clarify', maxReachedStep: 'clarify' }
    });
    const router = createTestRouter('/workspace?step=specify');
    setupNavigationListener(startListening as unknown as AppStartListening, router);

    store.dispatch(workspaceStepViewed('clarify'));
    await new Promise((r) => setTimeout(r, 50));

    expect(router.state.location.pathname).toBe('/workspace');
    expect(router.state.location.search).toBe('?step=clarify');
  });

  it('sets ?step=clarify when specifyCompletedInWorkspace dispatched', async () => {
    const { store, startListening } = createTestStore({
      auth: { copilotLoggedIn: true, githubLoggedIn: true, github: 'ok', copilot: 'ok', atlassian: 'out', identity: null, lastError: null },
      workspace: { activeRepoPath: '/path', agents: null, branch: 'main', ahead: 0, behind: 0, dirty: false, selectedRepo: { id: '1', name: 'repo', owner: 'user', path: '/path', defaultBranch: 'main' }, sessions: [], activeStep: 'specify', maxReachedStep: 'specify' }
    });
    const router = createTestRouter('/workspace?step=specify');
    setupNavigationListener(startListening as unknown as AppStartListening, router);

    store.dispatch(specifyCompletedInWorkspace());
    await new Promise((r) => setTimeout(r, 50));

    expect(router.state.location.pathname).toBe('/workspace');
    expect(router.state.location.search).toBe('?step=clarify');
  });

  it('external agent dispatch of workspaceEntered produces same route change as UI interaction', async () => {
    // Simulates FR-010: external agents dispatch Redux actions through the HTTP API
    // and the navigation listener translates them into route changes identically.
    const { store, startListening } = createTestStore({
      auth: { copilotLoggedIn: true, githubLoggedIn: true, github: 'ok', copilot: 'ok', atlassian: 'out', identity: null, lastError: null },
      workspace: { activeRepoPath: null, agents: null, branch: null, ahead: 0, behind: 0, dirty: false, selectedRepo: null, sessions: [], activeStep: 'specify', maxReachedStep: 'specify' }
    });
    const router = createTestRouter('/repos');
    setupNavigationListener(startListening as unknown as AppStartListening, router);

    // External agent dispatches workspaceEntered (same action shape as UI code)
    store.dispatch(workspaceEntered({
      repo: { id: 'ext-1', name: 'agent-repo', owner: 'agent-user', path: '/agent-path', defaultBranch: 'main' },
      branch: 'feature/from-agent'
    }));
    await new Promise((r) => setTimeout(r, 50));

    // Exact same outcome as human UI interaction
    expect(router.state.location.pathname).toBe('/workspace');
    expect(router.state.location.search).toBe('?step=specify');
  });
});
