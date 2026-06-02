import { describe, expect, it } from 'vitest';
import {
  createSessionManifestAuditRequest,
  createSessionManifestDoctorStatusRequest,
  createSessionManifestReadRequest,
  createSessionManifestReconcileRequest
} from './sessionManifest.factory';

const valid = { repositoryPath: '/repo' };

describe('session manifest IPC factories', () => {
  it.each([
    ['read', createSessionManifestReadRequest],
    ['reconcile', createSessionManifestReconcileRequest],
    ['audit', createSessionManifestAuditRequest],
    ['doctor-status', createSessionManifestDoctorStatusRequest]
  ])('accepts %s request and rejects the seven-case floor', (_name, factory) => {
    expect(factory(valid)).toMatchObject({ ok: true, value: valid });
    for (const bad of [null, undefined, [], {}, { repositoryPath: '' }, { repositoryPath: 42 }, { ...valid, extra: true }]) {
      expect(factory(bad)).toMatchObject({ ok: false, error: { name: 'InvalidSessionManifestPayload' } });
    }
  });
});
