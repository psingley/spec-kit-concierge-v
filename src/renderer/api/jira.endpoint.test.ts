import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it, vi } from 'vitest';
import { api } from './rootApi';
import { jiraApi, prepareJiraCredentialSave } from './jira.endpoint';
import { installConciergeBridge } from './testBridge';
import { jiraReducer } from '../slices/jira';

const createJiraStore = () =>
  configureStore({
    reducer: {
      [api.reducerPath]: api.reducer,
      jira: jiraReducer
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware)
  });

describe('jira endpoint', () => {
  it('saves a direct credential through the preload bridge without caching the token in redux', async () => {
    const save = vi.fn(async () => ({
      ok: true,
      authState: {
        state: 'warm',
        displayName: 'Pat User',
        accountId: 'acct-1',
        expiryDate: '2026-12-31',
        baseUrl: 'https://example.atlassian.net'
      }
    }));
    installConciergeBridge({ jiraCredential: { save, clear: vi.fn(), state: vi.fn() } });
    const store = createJiraStore();

    await expect(
      store.dispatch(jiraApi.endpoints.saveCredential.initiate(prepareJiraCredentialSave({
        email: 'pat@example.com',
        token: 'secret-api-token',
        baseUrl: 'https://example.atlassian.net',
        expiryDate: '2026-12-31'
      }))).unwrap()
    ).resolves.toMatchObject({ authState: { state: 'warm', displayName: 'Pat User' } });

    expect(save).toHaveBeenCalledWith({
      email: 'pat@example.com',
      token: 'secret-api-token',
      baseUrl: 'https://example.atlassian.net',
      expiryDate: '2026-12-31'
    });
    expect(JSON.stringify(store.getState())).not.toContain('secret-api-token');
  });

  it('reads and clears credential state through the R2 channels', async () => {
    const state = vi.fn(async () => ({ state: 'expired', displayName: 'Pat User', accountId: 'acct-1' }));
    const clear = vi.fn(async () => ({ ok: true }));
    installConciergeBridge({ jiraCredential: { save: vi.fn(), clear, state } });
    const store = createJiraStore();

    await expect(store.dispatch(jiraApi.endpoints.getAuthState.initiate()).unwrap()).resolves.toEqual({
      state: 'expired',
      displayName: 'Pat User',
      accountId: 'acct-1'
    });
    await expect(store.dispatch(jiraApi.endpoints.clearCredential.initiate()).unwrap()).resolves.toEqual({ ok: true });

    expect(state).toHaveBeenCalledWith({});
    expect(clear).toHaveBeenCalledWith({});
  });

  it('reads and sets the repo board mapping through the R2 channels', async () => {
    const get = vi.fn(async () => ({ projectKey: 'SKC', source: 'seed' }));
    const set = vi.fn(async () => ({ projectKey: 'OPS', source: 'user' }));
    installConciergeBridge({ jiraBoard: { get, set, suggest: vi.fn(), searchProjects: vi.fn() } });
    const store = createJiraStore();

    await expect(store.dispatch(jiraApi.endpoints.getBoard.initiate({ repositoryPath: '/repo' })).unwrap()).resolves.toEqual({ projectKey: 'SKC', source: 'seed' });
    await expect(store.dispatch(jiraApi.endpoints.setBoard.initiate({ repositoryPath: '/repo', projectKey: 'OPS' })).unwrap()).resolves.toEqual({ projectKey: 'OPS', source: 'user' });

    expect(get).toHaveBeenCalledWith({ repositoryPath: '/repo' });
    expect(set).toHaveBeenCalledWith({ repositoryPath: '/repo', projectKey: 'OPS' });
  });

  it('loads board suggestions and project search results through the R2 channels', async () => {
    const suggest = vi.fn(async () => ({ boards: [{ key: 'SKC', name: 'Spec-kit Concierge', lastActivity: '2026-06-02' }] }));
    const searchProjects = vi.fn(async () => ({ projects: [{ key: 'PLAT', name: 'Platform' }] }));
    installConciergeBridge({ jiraBoard: { get: vi.fn(), set: vi.fn(), suggest, searchProjects } });
    const store = createJiraStore();

    await expect(store.dispatch(jiraApi.endpoints.suggestBoards.initiate()).unwrap()).resolves.toEqual([{ key: 'SKC', name: 'Spec-kit Concierge', lastActivity: '2026-06-02' }]);
    await expect(store.dispatch(jiraApi.endpoints.searchProjects.initiate({ query: 'pla' })).unwrap()).resolves.toEqual([{ key: 'PLAT', name: 'Platform' }]);

    expect(suggest).toHaveBeenCalledWith({});
    expect(searchProjects).toHaveBeenCalledWith({ query: 'pla' });
  });
});
