import { describe, expect, it, vi } from 'vitest';
import { SESSION_MANIFEST_HTTP_ROUTES } from './sessionManifest.routes';
import { createSessionManifestHttpHandlers } from './sessionManifest';

describe('session manifest nudge HTTP handler', () => {
  it('serves POST /v1/session-manifest/nudge through validated nudge execution', async () => {
    const dataLayer = {
      read: vi.fn(),
      reconcile: vi.fn(),
      auditTrail: vi.fn(),
      doctorStatus: vi.fn(),
      nudge: vi.fn(async () => ({ result: 'escalated', markComplete: false }))
    };
    const logger = { info: vi.fn(), error: vi.fn() };
    const handlers = createSessionManifestHttpHandlers({ dataLayer, logger });

    await expect(handlers[SESSION_MANIFEST_HTTP_ROUTES.nudge]({ repositoryPath: '/repo' })).resolves.toEqual({
      status: 200,
      body: { result: 'escalated', markComplete: false }
    });
    expect(dataLayer.nudge).toHaveBeenCalledWith({ repositoryPath: '/repo' });
    expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({ event: 'manifest-http-handler', route: SESSION_MANIFEST_HTTP_ROUTES.nudge }), 'http handler invocation');
  });
});
