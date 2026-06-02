import { describe, expect, it, vi } from 'vitest';
import { createRtkQueryTestStore } from '../../test/rtkQueryStore';
import { installConciergeBridge } from './testBridge';
import { sessionManifestApi } from './sessionManifest.endpoint';

describe('session manifest endpoint', () => {
  it('reads manifest, reconcile state, doctor status, and audit trail through preload', async () => {
    installConciergeBridge({
      sessionManifest: {
        read: vi.fn(async () => ({ sessionId: 's1', currentStep: 'tasks' })),
        reconcile: vi.fn(async () => ({ status: 'needs-attention', canNudge: true })),
        doctorStatus: vi.fn(async () => ({ enabled: true, attemptsRemaining: 2 })),
        auditTrail: vi.fn(async () => ({ audit: [{ event: 'nudge-action' }] })),
        nudge: vi.fn()
      }
    });
    const { store } = createRtkQueryTestStore(sessionManifestApi);
    const request = { repositoryPath: '/repo' };

    await expect(store.dispatch(sessionManifestApi.endpoints.getSessionManifest.initiate(request)).unwrap()).resolves.toMatchObject({ sessionId: 's1' });
    await expect(store.dispatch(sessionManifestApi.endpoints.reconcileSessionManifest.initiate(request)).unwrap()).resolves.toMatchObject({ status: 'needs-attention' });
    await expect(store.dispatch(sessionManifestApi.endpoints.getDoctorStatus.initiate(request)).unwrap()).resolves.toMatchObject({ enabled: true });
    await expect(store.dispatch(sessionManifestApi.endpoints.getAuditTrail.initiate(request)).unwrap()).resolves.toMatchObject({ audit: [expect.objectContaining({ event: 'nudge-action' })] });
    expect(window.concierge.sessionManifest!.read).toHaveBeenCalledWith(request);
  });

  it('surfaces bridge exit factory failures', async () => {
    installConciergeBridge({ sessionManifest: { read: vi.fn(async () => null), reconcile: vi.fn(), doctorStatus: vi.fn(), auditTrail: vi.fn(), nudge: vi.fn() } });
    const { store } = createRtkQueryTestStore(sessionManifestApi);

    await expect(store.dispatch(sessionManifestApi.endpoints.getSessionManifest.initiate({ repositoryPath: '/repo' })).unwrap()).rejects.toMatchObject({
      status: 'PARSING_ERROR',
      data: { name: 'InvalidSessionManifestEndpointPayload' }
    });
  });

  it('nudges through preload and invalidates manifest, reconcile, and audit state', async () => {
    const nudge = vi.fn(async () => ({ result: 'repaired', markComplete: false }));
    installConciergeBridge({
      sessionManifest: {
        read: vi.fn(),
        reconcile: vi.fn(),
        doctorStatus: vi.fn(),
        auditTrail: vi.fn(),
        nudge
      }
    });
    const { store } = createRtkQueryTestStore(sessionManifestApi);
    const request = { repositoryPath: '/repo' };

    await expect(store.dispatch(sessionManifestApi.endpoints.nudgeSessionManifest.initiate(request)).unwrap()).resolves.toMatchObject({
      result: 'repaired',
      markComplete: false
    });

    expect(nudge).toHaveBeenCalledWith(request);
  });
});
