import { describe, expect, it, vi } from 'vitest';
import { SESSION_MANIFEST_HTTP_ROUTES } from './sessionManifest.routes';
import { createSessionManifestHttpHandlers } from './sessionManifest';

describe('session manifest HTTP handlers', () => {
  it('serves read, reconcile, audit, and doctor status routes through one data layer', async () => {
    const dataLayer = {
      read: vi.fn(async () => ({ sessionId: 's1' })),
      reconcile: vi.fn(async () => ({ status: 'pass' })),
      auditTrail: vi.fn(async () => ({ audit: [] })),
      doctorStatus: vi.fn(async () => ({ enabled: true })),
      nudge: vi.fn(async () => ({ result: 'no-op' }))
    };
    const logger = { info: vi.fn(), error: vi.fn() };
    const handlers = createSessionManifestHttpHandlers({ dataLayer, logger });

    await expect(handlers[SESSION_MANIFEST_HTTP_ROUTES.read]({ repositoryPath: '/repo' })).resolves.toEqual({ status: 200, body: { sessionId: 's1' } });
    await expect(handlers[SESSION_MANIFEST_HTTP_ROUTES.reconcile]({ repositoryPath: '/repo' })).resolves.toEqual({ status: 200, body: { status: 'pass' } });
    await expect(handlers[SESSION_MANIFEST_HTTP_ROUTES.audit]({ repositoryPath: '/repo' })).resolves.toEqual({ status: 200, body: { audit: [] } });
    await expect(handlers[SESSION_MANIFEST_HTTP_ROUTES.doctorStatus]({ repositoryPath: '/repo' })).resolves.toEqual({ status: 200, body: { enabled: true } });
    expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({ event: 'manifest-http-handler', route: SESSION_MANIFEST_HTTP_ROUTES.read }), 'http handler invocation');
  });
});
