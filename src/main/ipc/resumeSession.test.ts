import { describe, expect, it, vi } from 'vitest';
import { registerResumeSessionIpc, REPO_RESUME_SESSION_CHANNEL } from './resumeSession';

const setup = (overrides: Partial<Parameters<typeof registerResumeSessionIpc>[0]> = {}) => {
  const handlers = new Map<string, (event: { sender: { id: number } }, payload: unknown) => Promise<unknown>>();
  const logger = { info: vi.fn(), error: vi.fn() };
  const readSpec = vi.fn(async () => ({
    specMarkdown: '# Spec\n\nbody',
    specCommitSha: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0'
  }));
  registerResumeSessionIpc({
    ipcMain: { handle: vi.fn((channel, handler) => handlers.set(channel, handler)) },
    logger,
    readSpec,
    now: () => 1,
    ...overrides
  });
  return { handlers, logger, readSpec };
};

describe('registerResumeSessionIpc', () => {
  it('reads the worktree spec and returns {specMarkdown, specCommitSha}', async () => {
    const { handlers, logger, readSpec } = setup();

    await expect(
      handlers.get(REPO_RESUME_SESSION_CHANNEL)?.({ sender: { id: 3 } }, { worktreePath: '/clone.worktrees/session-xyz' })
    ).resolves.toEqual({
      specMarkdown: '# Spec\n\nbody',
      specCommitSha: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0'
    });
    expect(readSpec).toHaveBeenCalledWith('/clone.worktrees/session-xyz');
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ channel: REPO_RESUME_SESSION_CHANNEL, context: { senderId: 3 }, success: true }),
      'ipc handler invocation'
    );
  });

  it('passes through a graceful empty read (in-flight session with no committed spec)', async () => {
    const readSpec = vi.fn(async () => ({ specMarkdown: '', specCommitSha: null }));
    const { handlers } = setup({ readSpec });

    await expect(
      handlers.get(REPO_RESUME_SESSION_CHANNEL)?.({ sender: { id: 1 } }, { worktreePath: '/clone.worktrees/session-new' })
    ).resolves.toEqual({ specMarkdown: '', specCommitSha: null });
  });

  it('logs and rejects on an invalid payload', async () => {
    const { handlers, logger, readSpec } = setup();
    await expect(
      handlers.get(REPO_RESUME_SESSION_CHANNEL)?.({ sender: { id: 9 } }, { worktreePath: 5 })
    ).rejects.toThrow();
    expect(readSpec).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ channel: REPO_RESUME_SESSION_CHANNEL, success: false }),
      'ipc handler invocation'
    );
  });
});
