import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createMainLogger } from '../logging';
import { AUTH_STATUS_CHANNEL, registerAuthIpc } from './auth';

const createTestLogger = () =>
  createMainLogger({
    userDataPath: mkdtempSync(path.join(tmpdir(), 'concierge-ipc-auth-')),
    enablePrettyStream: false
  });

describe('registerAuthIpc', () => {
  it('registers auth:status without initiating login', async () => {
    const handlers = new Map<string, (event: { sender: { id: number } }, payload: unknown) => Promise<unknown>>();
    const logger = createTestLogger();
    const info = vi.spyOn(logger, 'info');
    const checkStatus = vi.fn(async (provider: 'copilot' | 'github') => provider === 'copilot');

    registerAuthIpc({
      ipcMain: { handle: vi.fn((channel, handler) => handlers.set(channel, handler)) },
      logger,
      checkStatus
    });

    await expect(handlers.get(AUTH_STATUS_CHANNEL)?.({ sender: { id: 7 } }, { providers: ['copilot', 'github'] })).resolves.toEqual({
      copilotLoggedIn: true,
      githubLoggedIn: false
    });
    expect(checkStatus).toHaveBeenCalledWith('copilot');
    expect(checkStatus).toHaveBeenCalledWith('github');
    expect(info).toHaveBeenCalledWith(expect.objectContaining({ channel: AUTH_STATUS_CHANNEL, context: { senderId: 7 }, success: true }), 'ipc handler invocation');
  });

  it('logs and propagates process-boundary failures', async () => {
    const handlers = new Map<string, (event: { sender: { id: number } }, payload: unknown) => Promise<unknown>>();
    const logger = createTestLogger();
    const errorLog = vi.spyOn(logger, 'error');
    const error = new Error('process failed');

    registerAuthIpc({
      ipcMain: { handle: vi.fn((channel, handler) => handlers.set(channel, handler)) },
      logger,
      checkStatus: vi.fn(async () => {
        throw error;
      })
    });

    await expect(handlers.get(AUTH_STATUS_CHANNEL)?.({ sender: { id: 8 } }, { providers: ['copilot'] })).rejects.toThrow(error);
    expect(errorLog).toHaveBeenCalledWith(expect.objectContaining({ channel: AUTH_STATUS_CHANNEL, context: { senderId: 8 }, success: false, error }), 'ipc handler invocation');
  });
});
