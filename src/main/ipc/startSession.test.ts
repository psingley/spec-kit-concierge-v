import { describe, expect, it, vi } from 'vitest';
import { registerStartSessionIpc, REPO_START_SESSION_CHANNEL } from './startSession';

const setup = (overrides: Partial<Parameters<typeof registerStartSessionIpc>[0]> = {}) => {
  const handlers = new Map<string, (event: { sender: { id: number } }, payload: unknown) => Promise<unknown>>();
  const logger = { info: vi.fn(), error: vi.fn() };
  const allocateBranchName = vi.fn(async () => '003-add-dark-mode');
  const createWorktree = vi.fn(async () => ({
    sessionId: 'session-xyz',
    worktreePath: '/clone.worktrees/session-xyz',
    branch: '003-add-dark-mode'
  }));
  registerStartSessionIpc({
    ipcMain: { handle: vi.fn((channel, handler) => handlers.set(channel, handler)) },
    logger,
    allocateBranchName,
    createWorktree,
    mintSessionId: () => 'session-xyz',
    now: () => 1,
    ...overrides
  });
  return { handlers, logger, allocateBranchName, createWorktree };
};

describe('registerStartSessionIpc', () => {
  it('allocates a branch, creates the worktree, and returns the triple', async () => {
    const { handlers, logger, allocateBranchName, createWorktree } = setup();

    await expect(
      handlers.get(REPO_START_SESSION_CHANNEL)?.(
        { sender: { id: 3 } },
        { clonePath: '/clone', defaultBranch: 'main', description: 'Add dark mode' }
      )
    ).resolves.toEqual({
      sessionId: 'session-xyz',
      worktreePath: '/clone.worktrees/session-xyz',
      branch: '003-add-dark-mode'
    });

    expect(allocateBranchName).toHaveBeenCalledWith('/clone', 'Add dark mode', undefined);
    expect(createWorktree).toHaveBeenCalledWith('/clone', 'session-xyz', 'main', '003-add-dark-mode');
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ channel: REPO_START_SESSION_CHANNEL, context: { senderId: 3 }, success: true }),
      'ipc handler invocation'
    );
  });

  it('threads shortName through to the allocator when provided', async () => {
    const { handlers, allocateBranchName } = setup();
    await handlers.get(REPO_START_SESSION_CHANNEL)?.(
      { sender: { id: 1 } },
      { clonePath: '/clone', defaultBranch: 'main', description: 'Add dark mode', shortName: 'dark' }
    );
    expect(allocateBranchName).toHaveBeenCalledWith('/clone', 'Add dark mode', 'dark');
  });

  it('logs and rejects on an invalid payload', async () => {
    const { handlers, logger, allocateBranchName } = setup();
    await expect(
      handlers.get(REPO_START_SESSION_CHANNEL)?.({ sender: { id: 9 } }, { clonePath: '/clone' })
    ).rejects.toThrow();
    expect(allocateBranchName).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ channel: REPO_START_SESSION_CHANNEL, success: false }),
      'ipc handler invocation'
    );
  });
});
