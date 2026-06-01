import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createMainLogger } from '../logging';
import {
  PREFERENCES_READ_CHANNEL,
  PREFERENCES_WRITE_CHANNEL,
  registerPreferencesIpc
} from './preferences';

const createTestLogger = () =>
  createMainLogger({
    userDataPath: mkdtempSync(path.join(tmpdir(), 'concierge-ipc-preferences-')),
    enablePrettyStream: false
  });

describe('registerPreferencesIpc', () => {
  it('registers preferences read and the only Run 4 write handler', async () => {
    const handlers = new Map<string, (event: { sender: { id: number } }, payload: unknown) => Promise<unknown>>();
    const logger = createTestLogger();
    const info = vi.spyOn(logger, 'info');

    registerPreferencesIpc({
      ipcMain: { handle: vi.fn((channel, handler) => handlers.set(channel, handler)) },
      logger,
      userDataPath: '/tmp/user-data',
      readPreferences: vi.fn(async () => ({ hydratedFromDisk: true, theme: 'system' as const })),
      writePreferences: vi.fn(async (request) => ({ hydratedFromDisk: true, theme: request.theme }))
    });

    expect([...handlers.keys()]).toEqual([PREFERENCES_READ_CHANNEL, PREFERENCES_WRITE_CHANNEL]);
    await expect(handlers.get(PREFERENCES_READ_CHANNEL)?.({ sender: { id: 7 } }, { scope: 'user' })).resolves.toEqual({
      hydratedFromDisk: true,
      theme: 'system'
    });
    await expect(handlers.get(PREFERENCES_WRITE_CHANNEL)?.({ sender: { id: 7 } }, { theme: 'dark' })).resolves.toEqual({
      hydratedFromDisk: true,
      theme: 'dark'
    });
    expect(info).toHaveBeenCalledWith(expect.objectContaining({ channel: PREFERENCES_READ_CHANNEL, context: { senderId: 7 }, success: true }), 'ipc handler invocation');
    expect(info).toHaveBeenCalledWith(expect.objectContaining({ channel: PREFERENCES_WRITE_CHANNEL, context: { senderId: 7 }, success: true }), 'ipc handler invocation');
  });

  it.each([
    [PREFERENCES_READ_CHANNEL, { scope: 'user' }],
    [PREFERENCES_WRITE_CHANNEL, { theme: 'system' }]
  ])('logs and propagates %s failures', async (channel, payload) => {
    const handlers = new Map<string, (event: { sender: { id: number } }, payload: unknown) => Promise<unknown>>();
    const logger = createTestLogger();
    const errorLog = vi.spyOn(logger, 'error');
    const error = new Error(`${channel} failed`);

    registerPreferencesIpc({
      ipcMain: { handle: vi.fn((registeredChannel, handler) => handlers.set(registeredChannel, handler)) },
      logger,
      userDataPath: '/tmp/user-data',
      readPreferences: vi.fn(async () => {
        throw error;
      }),
      writePreferences: vi.fn(async () => {
        throw error;
      })
    });

    await expect(handlers.get(channel)?.({ sender: { id: 8 } }, payload)).rejects.toThrow(error);
    expect(errorLog).toHaveBeenCalledWith(expect.objectContaining({ channel, context: { senderId: 8 }, success: false, err: error, errorDetail: expect.objectContaining({ message: error.message }) }), 'ipc handler invocation');
  });
});
