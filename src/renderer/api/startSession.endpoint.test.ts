import { describe, expect, it, vi } from 'vitest';
import { createRtkQueryTestStore } from '../../test/rtkQueryStore';
import { startSessionApi } from './startSession.endpoint';
import { installConciergeBridge } from './testBridge';

const result = { sessionId: 'session-xyz', worktreePath: '/clone.worktrees/session-xyz' };

describe('startSession endpoint', () => {
  it('starts a session through preload and validates the {sessionId, worktreePath} pair (no branch — spec-kit names it)', async () => {
    installConciergeBridge({ repo: { ensureLocal: vi.fn(), startSession: vi.fn(async () => result) } });
    const { store } = createRtkQueryTestStore(startSessionApi);

    await expect(
      store
        .dispatch(
          startSessionApi.endpoints.startSession.initiate({
            clonePath: '/clone',
            defaultBranch: 'main',
            description: 'Add dark mode'
          })
        )
        .unwrap()
    ).resolves.toEqual(result);
    expect(window.concierge.repo!.startSession).toHaveBeenCalledWith({
      clonePath: '/clone',
      defaultBranch: 'main',
      description: 'Add dark mode'
    });
  });

  it('preserves IPC failures', async () => {
    installConciergeBridge({
      repo: {
        ensureLocal: vi.fn(),
        startSession: vi.fn(async () => {
          throw new Error('ipc failed');
        })
      }
    });
    const { store } = createRtkQueryTestStore(startSessionApi);

    await expect(
      store
        .dispatch(
          startSessionApi.endpoints.startSession.initiate({ clonePath: '/clone', defaultBranch: 'main', description: 'x' })
        )
        .unwrap()
    ).rejects.toEqual({ status: 'IPC_ERROR', data: { name: 'Error', message: 'ipc failed' } });
  });
});
