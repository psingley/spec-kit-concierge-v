import { describe, expect, it, vi } from 'vitest';
import { createRtkQueryTestStore } from '../../test/rtkQueryStore';
import { workspaceApi } from './workspace.endpoint';
import { installConciergeBridge } from './testBridge';
import { rendererWorkspace } from './workspace.factory.spec';

describe('workspace endpoint', () => {
  it('reads workspace through preload, validates, and provides the Workspace tag', async () => {
    installConciergeBridge({ workspace: { read: vi.fn(async () => rendererWorkspace) } });
    const { store } = createRtkQueryTestStore(workspaceApi);

    await expect(store.dispatch(workspaceApi.endpoints.getWorkspace.initiate({ repositoryPath: '/repo' })).unwrap()).resolves.toEqual(rendererWorkspace);
    expect(window.concierge.workspace!.read).toHaveBeenCalledWith({ repositoryPath: '/repo' });
  });

  it('preserves IPC and renderer factory errors', async () => {
    installConciergeBridge({ workspace: { read: vi.fn(async () => ({})) } });
    const { store } = createRtkQueryTestStore(workspaceApi);

    await expect(store.dispatch(workspaceApi.endpoints.getWorkspace.initiate({ repositoryPath: '/repo' })).unwrap()).rejects.toEqual({
      status: 'PARSING_ERROR',
      data: { name: 'InvalidWorkspaceState', message: 'must be a non-empty string' }
    });
  });
});
