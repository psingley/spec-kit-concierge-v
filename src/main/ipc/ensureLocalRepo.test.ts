import { describe, expect, it, vi } from 'vitest';
import { registerEnsureLocalRepoIpc, ENSURE_LOCAL_REPO_CHANNEL } from './ensureLocalRepo';

describe('registerEnsureLocalRepoIpc', () => {
  it('clones via the data-layer and returns the resolved local path', async () => {
    const handlers = new Map<string, (event: { sender: { id: number } }, payload: unknown) => Promise<unknown>>();
    const logger = { info: vi.fn(), error: vi.fn() };
    const ensureCloned = vi.fn(async () => ({ localPath: '/Docs/Concierge/psingley/workcells', cloned: true }));

    registerEnsureLocalRepoIpc({
      ipcMain: { handle: vi.fn((channel, handler) => handlers.set(channel, handler)) },
      logger,
      documentsRoot: '/Docs',
      ensureCloned,
      now: () => 1
    });

    await expect(
      handlers.get(ENSURE_LOCAL_REPO_CHANNEL)?.(
        { sender: { id: 9 } },
        { owner: 'psingley', name: 'workcells', cloneUrl: 'https://github.com/psingley/workcells.git' }
      )
    ).resolves.toEqual({ localPath: '/Docs/Concierge/psingley/workcells', cloned: true });

    expect(ensureCloned).toHaveBeenCalledWith({
      owner: 'psingley',
      name: 'workcells',
      cloneUrl: 'https://github.com/psingley/workcells.git',
      documentsRoot: '/Docs'
    });
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ channel: ENSURE_LOCAL_REPO_CHANNEL, success: true }),
      'ipc handler invocation'
    );
  });

  it('logs a structured handler error when cloning fails', async () => {
    const handlers = new Map<string, (event: { sender: { id: number } }, payload: unknown) => Promise<unknown>>();
    const logger = { info: vi.fn(), error: vi.fn() };
    const ensureCloned = vi.fn(async () => {
      throw new Error('clone exploded');
    });

    registerEnsureLocalRepoIpc({
      ipcMain: { handle: vi.fn((channel, handler) => handlers.set(channel, handler)) },
      logger,
      documentsRoot: '/Docs',
      ensureCloned,
      now: () => 1
    });

    await expect(
      handlers.get(ENSURE_LOCAL_REPO_CHANNEL)?.(
        { sender: { id: 4 } },
        { owner: 'psingley', name: 'workcells', cloneUrl: 'https://github.com/psingley/workcells.git' }
      )
    ).rejects.toThrow(/clone exploded/);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ channel: ENSURE_LOCAL_REPO_CHANNEL, success: false }),
      'ipc handler invocation'
    );
  });
});
