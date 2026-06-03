import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it, vi } from 'vitest';
import { branchesApi } from './branches.endpoint';
import { installConciergeBridge } from './testBridge';
import { uiReducer } from '../slices/ui';

const restoredStates = {
  specify: 'complete',
  clarify: 'pending',
  plan: 'not_available',
  tasks: 'not_available',
  analyze: 'not_available',
  review: 'not_available'
};
const sessions = {
  sessions: [
    {
      sessionId: 'session-0006',
      worktreePath: '/repo.worktrees/session-0006',
      branch: 'spec/0006-specify-vertical',
      label: 'Specify vertical',
      restoredStates,
      restoredStepCommits: { specify: 'abc123' },
      restoredFailures: {}
    }
  ]
};

const createBranchesStore = () =>
  configureStore({
    reducer: {
      [branchesApi.reducerPath]: branchesApi.reducer,
      ui: uiReducer
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(branchesApi.middleware)
  });

describe('branches endpoint', () => {
  it('lists branch sessions through preload and validates the payload', async () => {
    installConciergeBridge({ branches: { sessions: vi.fn(async () => sessions) } });
    const store = createBranchesStore();

    await expect(
      store.dispatch(branchesApi.endpoints.listBranchSessions.initiate({ repositoryPath: '/repo' })).unwrap()
    ).resolves.toEqual(sessions);
    expect(window.concierge.branches!.sessions).toHaveBeenCalledWith({ repositoryPath: '/repo' });
  });

  it('shows a toast when branch session IPC fails', async () => {
    installConciergeBridge({
      branches: {
        sessions: vi.fn(async () => {
          throw new Error('scan failed');
        })
      }
    });
    const store = createBranchesStore();

    await store.dispatch(branchesApi.endpoints.listBranchSessions.initiate({ repositoryPath: '/repo' })).unwrap().catch(() => {});

    expect(store.getState().ui.toasts).toHaveLength(1);
    expect(store.getState().ui.toasts[0]).toMatchObject({
      level: 'error',
      message: 'Branch sessions failed: scan failed'
    });
  });

  it('shows a toast when branch session payload parsing fails', async () => {
    installConciergeBridge({ branches: { sessions: vi.fn(async () => ({ sessions: 'bad' })) } });
    const store = createBranchesStore();

    await store.dispatch(branchesApi.endpoints.listBranchSessions.initiate({ repositoryPath: '/repo' })).unwrap().catch(() => {});

    expect(store.getState().ui.toasts).toHaveLength(1);
    expect(store.getState().ui.toasts[0]).toMatchObject({
      level: 'error',
      message: 'Branch sessions failed: sessions must be an array'
    });
  });
});
