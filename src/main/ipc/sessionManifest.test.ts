import { describe, expect, it, vi } from 'vitest';
import { SESSION_MANIFEST_CHANNELS } from './sessionManifest.channels';
import { registerSessionManifestIpc } from './sessionManifest';

describe('registerSessionManifestIpc', () => {
  it('registers manifest read, reconcile, audit, and doctor status handlers through one data layer', async () => {
    const handlers = new Map<string, (event: { sender: { id: number } }, payload: unknown) => Promise<unknown>>();
    const dataLayer = {
      read: vi.fn(async () => ({ sessionId: 's1' })),
      reconcile: vi.fn(async () => ({ status: 'pass' })),
      auditTrail: vi.fn(async () => ({ audit: [] })),
      doctorStatus: vi.fn(async () => ({ enabled: true }))
    };
    const logger = { info: vi.fn(), error: vi.fn() };

    registerSessionManifestIpc({
      ipcMain: { handle: vi.fn((channel, handler) => handlers.set(channel, handler)) },
      logger,
      dataLayer
    });

    await expect(handlers.get(SESSION_MANIFEST_CHANNELS.read)?.({ sender: { id: 1 } }, { repositoryPath: '/repo' })).resolves.toEqual({ sessionId: 's1' });
    await expect(handlers.get(SESSION_MANIFEST_CHANNELS.reconcile)?.({ sender: { id: 1 } }, { repositoryPath: '/repo' })).resolves.toEqual({ status: 'pass' });
    await expect(handlers.get(SESSION_MANIFEST_CHANNELS.auditTrail)?.({ sender: { id: 1 } }, { repositoryPath: '/repo' })).resolves.toEqual({ audit: [] });
    await expect(handlers.get(SESSION_MANIFEST_CHANNELS.doctorStatus)?.({ sender: { id: 1 } }, { repositoryPath: '/repo' })).resolves.toEqual({ enabled: true });
    expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({ event: 'manifest-handler', channel: SESSION_MANIFEST_CHANNELS.read }), 'ipc handler invocation');
  });
});
