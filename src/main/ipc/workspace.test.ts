import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createMainLogger } from '../logging';
import { registerWorkspaceIpc, WORKSPACE_READ_CHANNEL } from './workspace';

const createTestLogger = () =>
  createMainLogger({
    userDataPath: mkdtempSync(path.join(tmpdir(), 'concierge-ipc-workspace-')),
    enablePrettyStream: false
  });

describe('registerWorkspaceIpc', () => {
  it('registers workspace:read and returns validated workspace state', async () => {
    const handlers = new Map<string, (event: { sender: { id: number } }, payload: unknown) => Promise<unknown>>();
    const logger = createTestLogger();
    const info = vi.spyOn(logger, 'info');

    registerWorkspaceIpc({
      ipcMain: { handle: vi.fn((channel, handler) => handlers.set(channel, handler)) },
      logger,
      readWorkspace: vi.fn(async () => ({ activeRepoPath: '/repo', agents: [] }))
    });

    await expect(handlers.get(WORKSPACE_READ_CHANNEL)?.({ sender: { id: 7 } }, { repositoryPath: '/repo' })).resolves.toEqual({
      activeRepoPath: '/repo',
      agents: []
    });
    expect([...handlers.keys()]).toEqual([WORKSPACE_READ_CHANNEL]);
    expect(info).toHaveBeenCalledWith(expect.objectContaining({ channel: WORKSPACE_READ_CHANNEL, context: { senderId: 7 }, success: true }), 'ipc handler invocation');
  });

  it('logs and propagates workspace failures', async () => {
    const handlers = new Map<string, (event: { sender: { id: number } }, payload: unknown) => Promise<unknown>>();
    const logger = createTestLogger();
    const errorLog = vi.spyOn(logger, 'error');
    const error = new Error('manifest failed');

    registerWorkspaceIpc({
      ipcMain: { handle: vi.fn((channel, handler) => handlers.set(channel, handler)) },
      logger,
      readWorkspace: vi.fn(async () => {
        throw error;
      })
    });

    await expect(handlers.get(WORKSPACE_READ_CHANNEL)?.({ sender: { id: 8 } }, { repositoryPath: '/repo' })).rejects.toThrow(error);
    expect(errorLog).toHaveBeenCalledWith(
      expect.objectContaining({ channel: WORKSPACE_READ_CHANNEL, context: { senderId: 8 }, success: false, error }),
      'ipc handler invocation'
    );
  });
});
