import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createMainLogger } from '../logging';
import { ACTIVITY_READ_CHANNEL, registerActivityIpc } from './activity';

const createTestLogger = () =>
  createMainLogger({
    userDataPath: mkdtempSync(path.join(tmpdir(), 'concierge-ipc-activity-')),
    enablePrettyStream: false
  });

describe('registerActivityIpc', () => {
  it('registers activity:read and caps structured entries', async () => {
    const handlers = new Map<string, (event: { sender: { id: number } }, payload: unknown) => Promise<unknown>>();
    const logger = createTestLogger();
    const info = vi.spyOn(logger, 'info');
    const entries = Array.from({ length: 256 }, (_value, index) => ({
      id: String(index),
      timestamp: '2026-05-27T00:00:00.000Z',
      level: 'info',
      message: 'ok'
    }));

    registerActivityIpc({
      ipcMain: { handle: vi.fn((channel, handler) => handlers.set(channel, handler)) },
      logger,
      userDataPath: '/tmp/user-data',
      readActivity: vi.fn(async () => ({ entries, cap: 256 as const }))
    });

    const result = await handlers.get(ACTIVITY_READ_CHANNEL)?.({ sender: { id: 7 } }, { limit: 256 });

    expect(result).toEqual({ entries, cap: 256 });
    expect(entries).toHaveLength(256);
    expect(info).toHaveBeenCalledWith(expect.objectContaining({ channel: ACTIVITY_READ_CHANNEL, context: { senderId: 7 }, success: true }), 'ipc handler invocation');
  });

  it('logs and propagates activity log failures', async () => {
    const handlers = new Map<string, (event: { sender: { id: number } }, payload: unknown) => Promise<unknown>>();
    const logger = createTestLogger();
    const errorLog = vi.spyOn(logger, 'error');
    const error = new Error('logs failed');

    registerActivityIpc({
      ipcMain: { handle: vi.fn((channel, handler) => handlers.set(channel, handler)) },
      logger,
      userDataPath: '/tmp/user-data',
      readActivity: vi.fn(async () => {
        throw error;
      })
    });

    await expect(handlers.get(ACTIVITY_READ_CHANNEL)?.({ sender: { id: 8 } }, { limit: 10 })).rejects.toThrow(error);
    expect(errorLog).toHaveBeenCalledWith(expect.objectContaining({ channel: ACTIVITY_READ_CHANNEL, context: { senderId: 8 }, success: false, err: error, errorDetail: expect.objectContaining({ message: error.message }) }), 'ipc handler invocation');
  });
});
