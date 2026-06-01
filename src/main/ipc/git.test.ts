import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createMainLogger } from '../logging';
import { GIT_READ_CHANNEL, registerGitIpc } from './git';

const createTestLogger = () =>
  createMainLogger({
    userDataPath: mkdtempSync(path.join(tmpdir(), 'concierge-ipc-git-')),
    enablePrettyStream: false
  });

describe('registerGitIpc', () => {
  it('registers git:read and returns branch plus uncommitted paths', async () => {
    const handlers = new Map<string, (event: { sender: { id: number } }, payload: unknown) => Promise<unknown>>();
    const logger = createTestLogger();
    const info = vi.spyOn(logger, 'info');

    registerGitIpc({
      ipcMain: { handle: vi.fn((channel, handler) => handlers.set(channel, handler)) },
      logger,
      readGit: vi.fn(async () => ({ branch: 'main', ahead: 1, behind: 0, dirty: true, uncommittedPaths: ['x.ts'] }))
    });

    await expect(handlers.get(GIT_READ_CHANNEL)?.({ sender: { id: 7 } }, { repositoryPath: '/repo', paths: ['x.ts'] })).resolves.toEqual({
      branch: 'main',
      ahead: 1,
      behind: 0,
      dirty: true,
      uncommittedPaths: ['x.ts']
    });
    expect(info).toHaveBeenCalledWith(expect.objectContaining({ channel: GIT_READ_CHANNEL, context: { senderId: 7 }, success: true }), 'ipc handler invocation');
  });

  it('logs and propagates git failures', async () => {
    const handlers = new Map<string, (event: { sender: { id: number } }, payload: unknown) => Promise<unknown>>();
    const logger = createTestLogger();
    const errorLog = vi.spyOn(logger, 'error');
    const error = new Error('git failed');

    registerGitIpc({
      ipcMain: { handle: vi.fn((channel, handler) => handlers.set(channel, handler)) },
      logger,
      readGit: vi.fn(async () => {
        throw error;
      })
    });

    await expect(handlers.get(GIT_READ_CHANNEL)?.({ sender: { id: 8 } }, { repositoryPath: '/repo', paths: [] })).rejects.toThrow(error);
    expect(errorLog).toHaveBeenCalledWith(expect.objectContaining({ channel: GIT_READ_CHANNEL, context: { senderId: 8 }, success: false, err: error, errorDetail: expect.objectContaining({ message: error.message }) }), 'ipc handler invocation');
  });
});
