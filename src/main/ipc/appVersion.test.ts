import { describe, expect, it, vi } from 'vitest';
import { APP_GET_VERSION_CHANNEL, registerAppVersionIpc } from './appVersion';

describe('registerAppVersionIpc', () => {
  it('registers only app:getVersion and returns the package version payload', async () => {
    const handlers = new Map<string, (event: { sender: { id: number } }) => Promise<unknown>>();
    const ipcMain = {
      handle: vi.fn((channel: string, handler: (event: { sender: { id: number } }) => Promise<unknown>) => {
        handlers.set(channel, handler);
      })
    };
    const logger = { info: vi.fn(), error: vi.fn() };

    registerAppVersionIpc({
      ipcMain,
      logger,
      packageVersion: '0.1.0'
    });

    expect([...handlers.keys()]).toEqual([APP_GET_VERSION_CHANNEL]);
    await expect(handlers.get(APP_GET_VERSION_CHANNEL)?.({ sender: { id: 7 } })).resolves.toEqual({
      version: '0.1.0'
    });
  });

  it('emits a structured pino log line on every successful invocation', async () => {
    const handlers = new Map<string, (event: { sender: { id: number } }) => Promise<unknown>>();
    const ipcMain = {
      handle: vi.fn((channel: string, handler: (event: { sender: { id: number } }) => Promise<unknown>) => {
        handlers.set(channel, handler);
      })
    };
    const logger = { info: vi.fn(), error: vi.fn() };
    registerAppVersionIpc({
      ipcMain,
      logger,
      packageVersion: '0.1.0'
    });

    await handlers.get(APP_GET_VERSION_CHANNEL)?.({ sender: { id: 7 } });

    expect(logger.info).toHaveBeenCalledWith(
      {
        channel: APP_GET_VERSION_CHANNEL,
        context: { senderId: 7 },
        success: true,
        latencyMs: expect.any(Number)
      },
      'ipc handler invocation'
    );
  });
});
