import { describe, expect, it, vi } from 'vitest';
import { createRtkQueryTestStore } from '../../test/rtkQueryStore';
import { gitApi } from './git.endpoint';
import { rendererGitState } from './git.factory.spec';
import { installConciergeBridge } from './testBridge';

describe('git endpoint', () => {
  it('reads git state through preload and validates it', async () => {
    installConciergeBridge({ git: { read: vi.fn(async () => rendererGitState) } });
    const { store } = createRtkQueryTestStore(gitApi);

    await expect(store.dispatch(gitApi.endpoints.getGitState.initiate({ repositoryPath: '/repo', paths: ['x.ts'] })).unwrap()).resolves.toEqual(rendererGitState);
    expect(window.concierge.git!.read).toHaveBeenCalledWith({ repositoryPath: '/repo', paths: ['x.ts'] });
  });

  it('preserves IPC failures', async () => {
    installConciergeBridge({
      git: {
        read: vi.fn(async () => {
          throw new Error('ipc failed');
        })
      }
    });
    const { store } = createRtkQueryTestStore(gitApi);

    await expect(store.dispatch(gitApi.endpoints.getGitState.initiate({ repositoryPath: '/repo', paths: [] })).unwrap()).rejects.toEqual({
      status: 'IPC_ERROR',
      data: { name: 'Error', message: 'ipc failed' }
    });
  });
});
