import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createMainLogger } from '../logging';
import { GIT_READ_CHANNEL, GIT_RESET_MAIN_CHANNEL, registerGitIpc } from './git';

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

  it('logs catch-up evidence on the git:resetMain success path', async () => {
    const handlers = new Map<string, (event: { sender: { id: number } }, payload: unknown) => Promise<unknown>>();
    const logger = createTestLogger();
    const info = vi.spyOn(logger, 'info');

    registerGitIpc({
      ipcMain: { handle: vi.fn((channel, handler) => handlers.set(channel, handler)) },
      logger,
      resetMain: vi.fn(async () => ({
        branch: 'develop',
        beforeSha: 'aaaaaaa',
        afterSha: 'bbbbbbb',
        originSha: 'bbbbbbb',
        commitsAdvanced: 12
      }))
    });

    await expect(
      handlers.get(GIT_RESET_MAIN_CHANNEL)?.({ sender: { id: 9 } }, { repositoryPath: '/repo', defaultBranch: 'develop' })
    ).resolves.toEqual({ branch: 'develop' });

    expect(info).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: GIT_RESET_MAIN_CHANNEL,
        context: { senderId: 9 },
        success: true,
        branch: 'develop',
        beforeSha: 'aaaaaaa',
        afterSha: 'bbbbbbb',
        commitsAdvanced: 12,
        caughtUp: 'aaaaaaa -> bbbbbbb (+12 on develop)'
      }),
      'ipc handler invocation'
    );
  });

  it('logs a local-only no-origin catch-up detail on git:resetMain', async () => {
    const handlers = new Map<string, (event: { sender: { id: number } }, payload: unknown) => Promise<unknown>>();
    const logger = createTestLogger();
    const info = vi.spyOn(logger, 'info');

    registerGitIpc({
      ipcMain: { handle: vi.fn((channel, handler) => handlers.set(channel, handler)) },
      logger,
      resetMain: vi.fn(async () => ({
        branch: 'main',
        beforeSha: null,
        afterSha: null,
        originSha: null,
        commitsAdvanced: 0
      }))
    });

    await expect(
      handlers.get(GIT_RESET_MAIN_CHANNEL)?.({ sender: { id: 10 } }, { repositoryPath: '/repo' })
    ).resolves.toEqual({ branch: 'main' });

    expect(info).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: GIT_RESET_MAIN_CHANNEL,
        success: true,
        commitsAdvanced: 0,
        caughtUp: 'local-only, no origin catch-up'
      }),
      'ipc handler invocation'
    );
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
