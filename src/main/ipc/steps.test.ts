import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createMainLogger } from '../logging';
import { registerStepsIpc, STEPS_READ_CHANNEL } from './steps';

const createTestLogger = () =>
  createMainLogger({
    userDataPath: mkdtempSync(path.join(tmpdir(), 'concierge-ipc-steps-')),
    enablePrettyStream: false
  });

describe('registerStepsIpc', () => {
  it('registers steps:read and derives state from Concierge-Step trailers', async () => {
    const handlers = new Map<string, (event: { sender: { id: number } }, payload: unknown) => Promise<unknown>>();
    const logger = createTestLogger();
    const info = vi.spyOn(logger, 'info');

    registerStepsIpc({
      ipcMain: { handle: vi.fn((channel, handler) => handlers.set(channel, handler)) },
      logger
    });

    await expect(
      handlers.get(STEPS_READ_CHANNEL)?.({ sender: { id: 7 } }, { commits: [{ sha: 'abc', message: 'Concierge-Step: setup:done' }] })
    ).resolves.toEqual({
      steps: [{ id: 'setup', status: 'done', commitSha: 'abc', interpretation: 'exact', warnings: [] }]
    });
    expect(info).toHaveBeenCalledWith(expect.objectContaining({ channel: STEPS_READ_CHANNEL, context: { senderId: 7 }, success: true }), 'ipc handler invocation');
  });

  it('logs and propagates trailer-reader failures', async () => {
    const handlers = new Map<string, (event: { sender: { id: number } }, payload: unknown) => Promise<unknown>>();
    const logger = createTestLogger();
    const errorLog = vi.spyOn(logger, 'error');
    const error = new Error('trailers failed');

    registerStepsIpc({
      ipcMain: { handle: vi.fn((channel, handler) => handlers.set(channel, handler)) },
      logger,
      readSteps: vi.fn(async () => {
        throw error;
      })
    });

    await expect(handlers.get(STEPS_READ_CHANNEL)?.({ sender: { id: 8 } }, { commits: [] })).rejects.toThrow(error);
    expect(errorLog).toHaveBeenCalledWith(expect.objectContaining({ channel: STEPS_READ_CHANNEL, context: { senderId: 8 }, success: false, err: error, errorDetail: expect.objectContaining({ message: error.message }) }), 'ipc handler invocation');
  });
});
