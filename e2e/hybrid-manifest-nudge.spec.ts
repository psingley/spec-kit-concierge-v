import { expect, test } from '@playwright/test';
import type { SessionManifestV1 } from '../src/main/domain/manifest/types';
import { executeNudgeRecovery, type NudgeDiskTruth } from '../src/main/data-layer/recovery/nudge';
import { createSessionManifestHttpHandlers } from '../src/main/http/sessionManifest';
import { SESSION_MANIFEST_HTTP_ROUTES } from '../src/main/http/sessionManifest.routes';

const now = '2026-06-02T00:00:00.000Z';

const manifest = (): SessionManifestV1 => ({
  schema: 'concierge.sessionManifest.v1',
  sessionId: 'session-001',
  featureDir: 'specs/0013-hybrid-manifest-architecture',
  branch: 'build/manifest-architecture-dogfood',
  createdAt: now,
  updatedAt: now,
  currentStep: 'tasks',
  attempts: [],
  anomalies: [{
    anomalyId: 'anomaly-001',
    step: 'tasks',
    kind: 'misplaced-artifact',
    severity: 'blocking',
    detectedAt: now,
    evidence: {}
  }],
  interventions: [],
  doctorInvocations: [],
  nudgeRequests: [],
  audit: []
});

const truth = (overrides: Partial<NudgeDiskTruth> = {}): NudgeDiskTruth => ({
  manifest: manifest(),
  step: 'tasks',
  status: 'needs-attention',
  branchBefore: 'build/manifest-architecture-dogfood',
  currentBranch: 'build/manifest-architecture-dogfood',
  anomalies: [{ anomalyId: 'anomaly-001', kind: 'misplaced-artifact', ambiguous: false }],
  safeActions: [{ action: 'refreshFailedMarker', anomalyId: 'anomaly-001' }],
  ...overrides
});

test('hybrid manifest nudge flow repairs deterministic state, records audit, and preserves HTTP parity', async () => {
  const audit: unknown[] = [];
  const result = await executeNudgeRecovery({
    repositoryPath: '/repo',
    readDiskTruth: async () => truth(),
    applyAction: async () => undefined,
    appendAudit: async (record) => { audit.push(record); },
    now: () => now,
    id: () => 'nudge-e2e'
  });

  expect(result).toMatchObject({ result: 'repaired', markComplete: false });
  expect(audit).toContainEqual(expect.objectContaining({ event: 'nudge-action', step: 'tasks' }));

  const handlers = createSessionManifestHttpHandlers({
    dataLayer: {
      read: async () => manifest(),
      reconcile: async () => ({ step: 'tasks', status: 'needs-attention', canNudge: true }),
      auditTrail: async () => ({ audit }),
      doctorStatus: async () => ({ enabled: true }),
      nudge: async () => result
    }
  });

  await expect(handlers[SESSION_MANIFEST_HTTP_ROUTES.nudge]({ repositoryPath: '/repo' })).resolves.toEqual({
    status: 200,
    body: result
  });
});

test('hybrid manifest nudge flow hides healthy state and escalates ambiguous needs-attention state', async () => {
  const healthy = await executeNudgeRecovery({
    repositoryPath: '/repo',
    readDiskTruth: async () => truth({ status: 'pass', anomalies: [], safeActions: [] }),
    applyAction: async () => undefined,
    now: () => now,
    id: () => 'nudge-healthy'
  });
  expect(healthy).toMatchObject({ result: 'no-op', markComplete: false });

  const ambiguous = await executeNudgeRecovery({
    repositoryPath: '/repo',
    readDiskTruth: async () => truth({
      anomalies: [{ anomalyId: 'anomaly-ambiguous', kind: 'ambiguous-nudge', ambiguous: true }],
      safeActions: []
    }),
    applyAction: async () => undefined,
    now: () => now,
    id: () => 'nudge-ambiguous'
  });
  expect(ambiguous).toMatchObject({ result: 'escalated', markComplete: false });
});
