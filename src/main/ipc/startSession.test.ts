import { describe, expect, it, vi } from 'vitest';
import { registerStartSessionIpc, REPO_START_SESSION_CHANNEL } from './startSession';

const setup = (overrides: Partial<Parameters<typeof registerStartSessionIpc>[0]> = {}) => {
  const handlers = new Map<string, (event: { sender: { id: number } }, payload: unknown) => Promise<unknown>>();
  const logger = { info: vi.fn(), error: vi.fn() };
  const createWorktree = vi.fn(async () => ({
    sessionId: 'session-xyz',
    worktreePath: '/clone.worktrees/session-xyz',
    branch: null
  }));
  registerStartSessionIpc({
    ipcMain: { handle: vi.fn((channel, handler) => handlers.set(channel, handler)) },
    logger,
    createWorktree,
    mintSessionId: () => 'session-xyz',
    now: () => 1,
    ...overrides
  });
  return { handlers, logger, createWorktree };
};

describe('registerStartSessionIpc', () => {
  it('creates a DETACHED worktree and returns {sessionId, worktreePath} WITHOUT pre-allocating a branch', async () => {
    const { handlers, logger, createWorktree } = setup();

    await expect(
      handlers.get(REPO_START_SESSION_CHANNEL)?.(
        { sender: { id: 3 } },
        { clonePath: '/clone', defaultBranch: 'main', description: 'Add dark mode' }
      )
    ).resolves.toEqual({
      sessionId: 'session-xyz',
      worktreePath: '/clone.worktrees/session-xyz'
    });

    // spec-kit names the branch now — start-session must NOT pre-allocate it,
    // and createWorktree is called WITHOUT a branch arg (detached).
    expect(createWorktree).toHaveBeenCalledWith('/clone', 'session-xyz', 'main');
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ channel: REPO_START_SESSION_CHANNEL, context: { senderId: 3 }, success: true }),
      'ipc handler invocation'
    );
  });

  it('logs and rejects on an invalid payload', async () => {
    const { handlers, logger, createWorktree } = setup();
    await expect(
      handlers.get(REPO_START_SESSION_CHANNEL)?.({ sender: { id: 9 } }, { clonePath: '/clone' })
    ).rejects.toThrow();
    expect(createWorktree).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ channel: REPO_START_SESSION_CHANNEL, success: false }),
      'ipc handler invocation'
    );
  });
});
