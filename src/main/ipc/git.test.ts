import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createMainLogger } from '../logging';
import { GIT_CREATE_DRAFT_CHANNEL, GIT_READ_CHANNEL, registerGitIpc } from './git';

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
      userDataPath: '/tmp/user-data',
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
      userDataPath: '/tmp/user-data',
      readGit: vi.fn(async () => {
        throw error;
      })
    });

    await expect(handlers.get(GIT_READ_CHANNEL)?.({ sender: { id: 8 } }, { repositoryPath: '/repo', paths: [] })).rejects.toThrow(error);
    expect(errorLog).toHaveBeenCalledWith(expect.objectContaining({ channel: GIT_READ_CHANNEL, context: { senderId: 8 }, success: false, error }), 'ipc handler invocation');
  });

  it('treats Windows absolute repository paths as local paths when creating drafts', async () => {
    const handlers = new Map<string, (event: { sender: { id: number } }, payload: unknown) => Promise<unknown>>();
    const logger = createTestLogger();
    const cloneRepo = vi.fn();
    const pushBranch = vi.fn();
    const createDraft = vi.fn(async () => ({ branch: 'spec/draft-abc123' }));

    registerGitIpc({
      ipcMain: { handle: vi.fn((channel, handler) => handlers.set(channel, handler)) },
      logger,
      userDataPath: '/tmp/user-data',
      createDraft,
      cloneRepo,
      pushBranch
    });

    await expect(
      handlers.get(GIT_CREATE_DRAFT_CHANNEL)?.(
        { sender: { id: 9 } },
        { repositoryPath: 'C:/Users/runneradmin/AppData/Local/Temp/concierge-run6/repo', defaultBranch: 'main' }
      )
    ).resolves.toEqual({ branch: 'spec/draft-abc123' });
    expect(createDraft).toHaveBeenCalledWith('C:/Users/runneradmin/AppData/Local/Temp/concierge-run6/repo', undefined);
    expect(cloneRepo).not.toHaveBeenCalled();
    expect(pushBranch).not.toHaveBeenCalled();
  });
});
