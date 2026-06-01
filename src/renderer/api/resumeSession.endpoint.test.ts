import { describe, expect, it, vi } from 'vitest';
import { createRtkQueryTestStore } from '../../test/rtkQueryStore';
import { resumeSessionApi } from './resumeSession.endpoint';
import { installConciergeBridge } from './testBridge';

const result = { specMarkdown: '# Spec\n\nbody', specCommitSha: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0' };

describe('resumeSession endpoint', () => {
  it('reads the resumed spec through preload and validates {specMarkdown, specCommitSha}', async () => {
    installConciergeBridge({ repo: { ensureLocal: vi.fn(), startSession: vi.fn(), resumeSession: vi.fn(async () => result) } });
    const { store } = createRtkQueryTestStore(resumeSessionApi);

    await expect(
      store.dispatch(resumeSessionApi.endpoints.resumeSession.initiate({ worktreePath: '/clone.worktrees/session-xyz' })).unwrap()
    ).resolves.toEqual(result);
    expect(window.concierge.repo!.resumeSession).toHaveBeenCalledWith({ worktreePath: '/clone.worktrees/session-xyz' });
  });

  it('accepts a null specCommitSha (in-flight session)', async () => {
    const empty = { specMarkdown: '', specCommitSha: null };
    installConciergeBridge({ repo: { ensureLocal: vi.fn(), startSession: vi.fn(), resumeSession: vi.fn(async () => empty) } });
    const { store } = createRtkQueryTestStore(resumeSessionApi);

    await expect(
      store.dispatch(resumeSessionApi.endpoints.resumeSession.initiate({ worktreePath: '/clone.worktrees/session-new' })).unwrap()
    ).resolves.toEqual(empty);
  });

  it('preserves IPC failures', async () => {
    installConciergeBridge({
      repo: {
        ensureLocal: vi.fn(),
        startSession: vi.fn(),
        resumeSession: vi.fn(async () => {
          throw new Error('ipc failed');
        })
      }
    });
    const { store } = createRtkQueryTestStore(resumeSessionApi);

    await expect(
      store.dispatch(resumeSessionApi.endpoints.resumeSession.initiate({ worktreePath: '/clone.worktrees/session-xyz' })).unwrap()
    ).rejects.toEqual({ status: 'IPC_ERROR', data: { name: 'Error', message: 'ipc failed' } });
  });
});
