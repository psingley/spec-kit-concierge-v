import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createMainLogger } from '../logging';
import { AUTH_COPILOT_LOGIN_CHANNEL, AUTH_STATUS_CHANNEL, registerAuthIpc } from './auth';

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
    expect(errorLog).toHaveBeenCalledWith(expect.objectContaining({ channel: AUTH_STATUS_CHANNEL, context: { senderId: 8 }, success: false, err: error, errorDetail: expect.objectContaining({ message: error.message }) }), 'ipc handler invocation');
  });

  it('forwards Copilot device-code events to the auth login stream before final success', async () => {
    const handlers = new Map<string, (event: { sender: { id: number; send: ReturnType<typeof vi.fn> } }, payload: unknown) => Promise<unknown>>();
    const logger = createTestLogger();
    const sender = { id: 9, send: vi.fn() };
    const loginCopilotAdapter = vi.fn(async (_githubConnected: boolean, options?: { onDeviceCode?: (info: { code: string; url: string }) => void }) => {
      options?.onDeviceCode?.({ code: '023C-3350', url: 'https://github.com/login/device' });
      return { status: 'ok' as const, provider: 'copilot' as const, label: 'Copilot CLI ready' };
    });

    registerAuthIpc({
      ipcMain: { handle: vi.fn((channel, handler) => handlers.set(channel, handler)) },
      logger,
      loginCopilotAdapter
    });

    await expect(handlers.get(AUTH_COPILOT_LOGIN_CHANNEL)?.(
      { sender },
      { provider: 'copilot', subscriptionId: 'auth-sub-1' }
    )).resolves.toEqual({ status: 'ok', provider: 'copilot', label: 'Copilot CLI ready' });

    expect(loginCopilotAdapter).toHaveBeenCalledWith(false, expect.objectContaining({ onDeviceCode: expect.any(Function) }));
    expect(sender.send).toHaveBeenCalledWith('auth:copilot:login:event', {
      subscriptionId: 'auth-sub-1',
      event: { type: 'device-code', code: '023C-3350', url: 'https://github.com/login/device' }
    });
  });
});
