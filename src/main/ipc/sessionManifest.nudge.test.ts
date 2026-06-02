import { describe, expect, it, vi } from 'vitest';
import { SESSION_MANIFEST_CHANNELS } from './sessionManifest.channels';
import { registerSessionManifestIpc } from './sessionManifest';

describe('session manifest nudge IPC handler', () => {
  it('registers sessionManifest:nudge through the same validated data layer path', async () => {
    const handlers = new Map<string, (event: { sender: { id: number } }, payload: unknown) => Promise<unknown>>();
    const dataLayer = {
      read: vi.fn(),
      reconcile: vi.fn(),
      auditTrail: vi.fn(),
      doctorStatus: vi.fn(),
      nudge: vi.fn(async () => ({ result: 'repaired', markComplete: false }))
    };
    const logger = { info: vi.fn(), error: vi.fn() };

    registerSessionManifestIpc({
      ipcMain: { handle: vi.fn((channel, handler) => handlers.set(channel, handler)) },
      logger,
      dataLayer
    });

    await expect(handlers.get(SESSION_MANIFEST_CHANNELS.nudge)?.({ sender: { id: 7 } }, { repositoryPath: '/repo' })).resolves.toEqual({
      result: 'repaired',
      markComplete: false
    });
    expect(dataLayer.nudge).toHaveBeenCalledWith({ repositoryPath: '/repo' });
    expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({ event: 'manifest-handler', channel: SESSION_MANIFEST_CHANNELS.nudge }), 'ipc handler invocation');
  });
});
