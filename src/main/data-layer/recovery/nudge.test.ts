import { describe, expect, it, vi } from 'vitest';
import type { SessionManifestV1 } from '../../domain/manifest/types';
import { executeNudgeRecovery, type NudgeDiskTruth } from './nudge';

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

describe('executeNudgeRecovery', () => {
  it('re-reads disk truth before each guarded mutation, records intervention and audit, reconciles, and logs nudge actions', async () => {
    const readDiskTruth = vi.fn(async () => truth());
    const applyAction = vi.fn(async () => undefined);
    const appendIntervention = vi.fn(async () => undefined);
    const appendAudit = vi.fn(async () => undefined);
    const appendNudge = vi.fn(async () => undefined);
    const reconcileAfterAction = vi.fn(async () => ({ status: 'pass' }));
    const logger = { info: vi.fn() };

    const result = await executeNudgeRecovery({
      repositoryPath: '/repo',
      readDiskTruth,
      applyAction,
      appendIntervention,
      appendAudit,
      appendNudge,
      reconcileAfterAction,
      logger,
      now: () => now,
      id: () => 'nudge-001'
    });

    expect(result).toMatchObject({ result: 'repaired', markComplete: false, interventionIds: ['intervention-nudge-001-0'] });
    expect(readDiskTruth).toHaveBeenCalledTimes(2);
    expect(readDiskTruth.mock.invocationCallOrder[1]).toBeLessThan(applyAction.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY);
    expect(applyAction).toHaveBeenCalledWith({ action: 'refreshFailedMarker', anomalyId: 'anomaly-001' }, expect.objectContaining({ currentBranch: 'build/manifest-architecture-dogfood' }));
    expect(appendIntervention).toHaveBeenCalledWith(expect.objectContaining({
      interventionId: 'intervention-nudge-001-0',
      anomalyId: 'anomaly-001',
      tool: 'refreshFailedMarker',
      result: 'applied'
    }));
    expect(appendAudit).toHaveBeenCalledWith(expect.objectContaining({ event: 'nudge-action', step: 'tasks' }));
    expect(reconcileAfterAction).toHaveBeenCalledWith(expect.objectContaining({ step: 'tasks', action: 'refreshFailedMarker' }));
    expect(appendNudge).toHaveBeenCalledWith(expect.objectContaining({
      nudgeId: 'nudge-001',
      result: 'repaired',
      interventionIds: ['intervention-nudge-001-0']
    }));
    expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({
      event: 'nudge-action',
      result: 'repaired'
    }), 'hybrid manifest event');
  });

  it('escalates ambiguous needs-attention state without guessing a repair', async () => {
    const applyAction = vi.fn(async () => undefined);
    const appendNudge = vi.fn(async () => undefined);

    const result = await executeNudgeRecovery({
      repositoryPath: '/repo',
      readDiskTruth: vi.fn(async () => truth({
        anomalies: [{ anomalyId: 'anomaly-ambiguous', kind: 'ambiguous-nudge', ambiguous: true }],
        safeActions: []
      })),
      applyAction,
      appendNudge,
      now: () => now,
      id: () => 'nudge-ambiguous'
    });

    expect(result).toMatchObject({ result: 'escalated', markComplete: false });
    expect(applyAction).not.toHaveBeenCalled();
    expect(appendNudge).toHaveBeenCalledWith(expect.objectContaining({
      result: 'escalated',
      anomalyIds: ['anomaly-ambiguous']
    }));
  });

  it('rejects when branch changes between nudge planning and guarded mutation', async () => {
    const readDiskTruth = vi.fn()
      .mockResolvedValueOnce(truth())
      .mockResolvedValueOnce(truth({ currentBranch: 'other-branch' }));
    const applyAction = vi.fn(async () => undefined);
    const appendNudge = vi.fn(async () => undefined);

    const result = await executeNudgeRecovery({
      repositoryPath: '/repo',
      readDiskTruth,
      applyAction,
      appendNudge,
      now: () => now,
      id: () => 'nudge-branch-change'
    });

    expect(result).toMatchObject({ result: 'rejected', markComplete: false });
    expect(applyAction).not.toHaveBeenCalled();
    expect(appendNudge).toHaveBeenCalledWith(expect.objectContaining({
      result: 'rejected',
      message: 'Branch changed after nudge preconditions were captured'
    }));
  });
});
