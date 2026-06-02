import { describe, expect, it } from 'vitest';
import {
  createSessionManifestHttpAuditRequest,
  createSessionManifestHttpDoctorStatusRequest,
  createSessionManifestHttpNudgeRequest,
  createSessionManifestHttpReadRequest,
  createSessionManifestHttpReconcileRequest
} from './sessionManifest.factory';

const valid = { repositoryPath: '/repo' };

describe('session manifest HTTP factories', () => {
  it.each([
    ['read', createSessionManifestHttpReadRequest],
    ['reconcile', createSessionManifestHttpReconcileRequest],
    ['audit', createSessionManifestHttpAuditRequest],
    ['doctor-status', createSessionManifestHttpDoctorStatusRequest],
    ['nudge', createSessionManifestHttpNudgeRequest]
  ])('accepts %s request and rejects the seven-case floor', (_name, factory) => {
    expect(factory(valid)).toMatchObject({ ok: true, value: valid });
    for (const bad of [null, undefined, [], {}, { repositoryPath: '' }, { repositoryPath: 42 }, { ...valid, extra: true }]) {
      expect(factory(bad)).toMatchObject({ ok: false, error: { name: 'InvalidSessionManifestHttpPayload' } });
    }
  });
});
