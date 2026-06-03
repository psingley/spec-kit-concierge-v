import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it, vi } from 'vitest';
import { repositoriesApi } from './repositories.endpoint';
import { installConciergeBridge } from './testBridge';
import { uiReducer } from '../slices/ui';

const repositories = {
  repositories: [
    {
      id: 'repo-1',
      name: 'spec-kit-concierge-v',
      owner: 'psingley',
      path: 'psingley/spec-kit-concierge-v',
      defaultBranch: 'main'
    }
  ]
};

const createRepositoriesStore = () =>
  configureStore({
    reducer: {
      [repositoriesApi.reducerPath]: repositoriesApi.reducer,
      ui: uiReducer
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(repositoriesApi.middleware)
  });

describe('repositories endpoint', () => {
  it('lists repositories through preload and validates the payload', async () => {
    installConciergeBridge({ repos: { list: vi.fn(async () => repositories) } });
    const store = createRepositoriesStore();

    await expect(store.dispatch(repositoriesApi.endpoints.listRepos.initiate()).unwrap()).resolves.toEqual(repositories);
    expect(window.concierge.repos!.list).toHaveBeenCalledWith({});
  });

  it('shows a toast when repository listing IPC fails', async () => {
    installConciergeBridge({
      repos: {
        list: vi.fn(async () => {
          throw new Error('gh failed');
        })
      }
    });
    const store = createRepositoriesStore();

    await store.dispatch(repositoriesApi.endpoints.listRepos.initiate()).unwrap().catch(() => {});

    expect(store.getState().ui.toasts).toHaveLength(1);
    expect(store.getState().ui.toasts[0]).toMatchObject({
      level: 'error',
      message: 'Repository list failed: gh failed'
    });
  });

  it('shows a toast when repository payload parsing fails', async () => {
    installConciergeBridge({ repos: { list: vi.fn(async () => ({ repositories: 'bad' })) } });
    const store = createRepositoriesStore();

    await store.dispatch(repositoriesApi.endpoints.listRepos.initiate()).unwrap().catch(() => {});

    expect(store.getState().ui.toasts).toHaveLength(1);
    expect(store.getState().ui.toasts[0]).toMatchObject({
      level: 'error',
      message: 'Repository list failed: repositories must be an array'
    });
  });
});
