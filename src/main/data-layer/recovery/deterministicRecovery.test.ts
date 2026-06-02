import { describe, expect, it, vi } from 'vitest';
import type { SafeRecoveryClass, SafeRecoveryRequest } from '../../domain/recovery/recoveryCatalog.factory';
import type { Anomaly, SessionManifestV1, StepName } from '../../domain/manifest/types';
import { executeDeterministicRecovery, type RecoveryActionName, type RecoveryDiskTruth } from './deterministicRecovery';

const now = '2026-06-02T00:00:00.000Z';

const actionByClass: Record<SafeRecoveryClass, RecoveryActionName> = {
  'relocate-step-owned-artifact': 'relocateArtifact',
  'adopt-valid-completion': 'adoptValidCompletion',
  'refresh-failed-marker': 'refreshFailedMarker',
  'revert-proven-unrelated-file': 'revertUnrelatedFiles',
  'cancel-observed-active-step': 'cancelActiveStep',
  'restart-with-pinned-context': 'reRunStepWithPinnedContext'
};

const anomaly = (step: StepName = 'tasks'): Anomaly => ({
  anomalyId: 'anomaly-001',
  step,
  kind: 'misplaced-artifact',
  severity: 'blocking',
  detectedAt: now,
  evidence: {
    paths: ['specs/0013-hybrid-manifest-architecture/tasks.md']
  }
});

const manifest = (step: StepName = 'tasks'): SessionManifestV1 => ({
  schema: 'concierge.sessionManifest.v1',
  sessionId: 'session-001',
  featureDir: 'specs/0013-hybrid-manifest-architecture',
  branch: 'build/manifest-architecture-dogfood',
  createdAt: now,
  updatedAt: now,
  currentStep: step,
  attempts: [],
  anomalies: [anomaly(step)],
  interventions: [],
  doctorInvocations: [],
  nudgeRequests: [],
  audit: []
});

const request = (
  recoveryClass: SafeRecoveryClass,
  overrides: Partial<SafeRecoveryRequest> = {}
): SafeRecoveryRequest => ({
  recoveryClass,
  step: 'tasks',
  anomalyId: 'anomaly-001',
  idempotencyKey: `key-${recoveryClass}`,
  requestedBy: recoveryClass === 'restart-with-pinned-context' ? 'user' : 'deterministic',
  ambiguous: false,
  userConfirmed: recoveryClass === 'restart-with-pinned-context',
  ownership: {
    featureDir: 'specs/0013-hybrid-manifest-architecture',
    branch: 'build/manifest-architecture-dogfood',
    paths: ['specs/0013-hybrid-manifest-architecture/tasks.md'],
    snapshotHash: 'snapshot-001'
  },
  evidence: {
    sourcePath: 'specs/0012-old/tasks.md',
    destinationPath: 'specs/0013-hybrid-manifest-architecture/tasks.md',
    paths: ['src/unrelated.txt'],
    restorePointAvailable: true
  },
  ...overrides
});

const diskTruth = (overrides: Partial<RecoveryDiskTruth> = {}): RecoveryDiskTruth => ({
  manifest: manifest(),
  branch: 'build/manifest-architecture-dogfood',
  featureDir: 'specs/0013-hybrid-manifest-architecture',
  stepOwnedPaths: ['specs/0013-hybrid-manifest-architecture/tasks.md'],
  ambiguousDestinations: false,
  matchingCompletion: {
    commitSha: 'abc123',
    snapshotHash: 'snapshot-001'
  },
  restorePointAvailable: true,
  observedProcess: {
    attemptId: 'attempt-001',
    state: 'running'
  },
  ...overrides
});

const harness = (truth: RecoveryDiskTruth = diskTruth()) => {
  const actions = {
    relocateArtifact: vi.fn(async () => undefined),
    adoptValidCompletion: vi.fn(async () => undefined),
    refreshFailedMarker: vi.fn(async () => undefined),
    revertUnrelatedFiles: vi.fn(async () => undefined),
    cancelActiveStep: vi.fn(async () => undefined),
    reRunStepWithPinnedContext: vi.fn(async () => undefined)
  };
  const logger = { info: vi.fn() };
  const appendIntervention = vi.fn(async () => undefined);
  const appendAudit = vi.fn(async () => undefined);
  const readDiskTruth = vi.fn(async () => truth);

  return { actions, appendAudit, appendIntervention, logger, readDiskTruth };
};

describe('executeDeterministicRecovery', () => {
  it('runs each safe class through its guarded action after re-reading disk truth', async () => {
    for (const recoveryClass of Object.keys(actionByClass) as SafeRecoveryClass[]) {
      const deps = harness(diskTruth({
        manifest: manifest(recoveryClass === 'restart-with-pinned-context' ? 'review' : 'tasks'),
        stepOwnedPaths: ['specs/0013-hybrid-manifest-architecture/tasks.md']
      }));
      const result = await executeDeterministicRecovery({
        repositoryPath: '/repo',
        userDataPath: '/user-data',
        request: request(recoveryClass),
        now: () => now,
        ...deps
      });

      expect(deps.readDiskTruth.mock.invocationCallOrder[0]).toBeLessThan(
        deps.actions[actionByClass[recoveryClass]].mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY
      );
      expect(deps.actions[actionByClass[recoveryClass]]).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({
        result: 'applied',
        requiresReconciliation: true,
        doctorEscalated: false
      });
    }
  });

  it('rejects ambiguous destinations and refuses to move files outside step ownership', async () => {
    const ambiguous = harness(diskTruth({ ambiguousDestinations: true }));
    await expect(executeDeterministicRecovery({
      repositoryPath: '/repo',
      userDataPath: '/user-data',
      request: request('relocate-step-owned-artifact'),
      now: () => now,
      ...ambiguous
    })).resolves.toMatchObject({ result: 'escalated' });
    expect(ambiguous.actions.relocateArtifact).not.toHaveBeenCalled();

    const unowned = harness(diskTruth());
    await expect(executeDeterministicRecovery({
      repositoryPath: '/repo',
      userDataPath: '/user-data',
      request: request('relocate-step-owned-artifact', {
        ownership: {
          featureDir: 'specs/0013-hybrid-manifest-architecture',
          branch: 'build/manifest-architecture-dogfood',
          paths: ['specs/0013-hybrid-manifest-architecture/tasks.md'],
          snapshotHash: 'snapshot-001'
        },
        evidence: {
          sourcePath: 'src/outside.ts',
          destinationPath: 'src/outside.ts'
        }
      }),
      now: () => now,
      ...unowned
    })).resolves.toMatchObject({ result: 'rejected' });
    expect(unowned.actions.relocateArtifact).not.toHaveBeenCalled();
  });

  it('adopts only matching completion evidence and refreshes failed markers with anomaly ids', async () => {
    const mismatched = harness(diskTruth({ matchingCompletion: { commitSha: 'abc123', snapshotHash: 'other' } }));
    await expect(executeDeterministicRecovery({
      repositoryPath: '/repo',
      userDataPath: '/user-data',
      request: request('adopt-valid-completion'),
      now: () => now,
      ...mismatched
    })).resolves.toMatchObject({ result: 'rejected' });
    expect(mismatched.actions.adoptValidCompletion).not.toHaveBeenCalled();

    const refresh = harness();
    await executeDeterministicRecovery({
      repositoryPath: '/repo',
      userDataPath: '/user-data',
      request: request('refresh-failed-marker'),
      now: () => now,
      ...refresh
    });
    expect(refresh.actions.refreshFailedMarker).toHaveBeenCalledWith(expect.objectContaining({
      anomalyIds: ['anomaly-001'],
      strandedArtifacts: ['specs/0013-hybrid-manifest-architecture/tasks.md']
    }));
  });

  it('reverts only proven unrelated files, cancels only observed active steps, and gates restarts', async () => {
    const unsafeRevert = harness(diskTruth({ restorePointAvailable: false }));
    await expect(executeDeterministicRecovery({
      repositoryPath: '/repo',
      userDataPath: '/user-data',
      request: request('revert-proven-unrelated-file'),
      now: () => now,
      ...unsafeRevert
    })).resolves.toMatchObject({ result: 'escalated' });
    expect(unsafeRevert.actions.revertUnrelatedFiles).not.toHaveBeenCalled();

    const missingProcess = harness(diskTruth({ observedProcess: undefined }));
    await expect(executeDeterministicRecovery({
      repositoryPath: '/repo',
      userDataPath: '/user-data',
      request: request('cancel-observed-active-step'),
      now: () => now,
      ...missingProcess
    })).resolves.toMatchObject({ result: 'rejected' });
    expect(missingProcess.actions.cancelActiveStep).not.toHaveBeenCalled();

    const restart = harness();
    await executeDeterministicRecovery({
      repositoryPath: '/repo',
      userDataPath: '/user-data',
      request: request('restart-with-pinned-context', { userConfirmed: true, requestedBy: 'user' }),
      now: () => now,
      ...restart
    });
    expect(restart.actions.reRunStepWithPinnedContext).toHaveBeenCalledTimes(1);
  });

  it('appends intervention and audit records, logs the action, and never returns direct completion', async () => {
    const deps = harness();
    const result = await executeDeterministicRecovery({
      repositoryPath: '/repo',
      userDataPath: '/user-data',
      request: request('refresh-failed-marker'),
      now: () => now,
      ...deps
    });

    expect(deps.appendIntervention.mock.invocationCallOrder[0]).toBeLessThan(
      deps.appendAudit.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY
    );
    expect(deps.appendAudit).toHaveBeenCalledWith(expect.objectContaining({
      event: 'recovery-action',
      message: expect.stringContaining('refresh-failed-marker')
    }));
    expect(deps.logger.info).toHaveBeenCalledWith(expect.objectContaining({
      event: 'recovery-action',
      result: 'applied'
    }), 'hybrid manifest event');
    expect(result.result).not.toBe('pass');
  });

  it('is idempotent by anomaly id and performs no guarded mutation after a prior intervention', async () => {
    const previous = {
      interventionId: 'intervention-existing',
      anomalyId: 'anomaly-001',
      tool: 'refreshFailedMarker',
      startedAt: now,
      endedAt: now,
      preconditionSnapshot: {},
      result: 'applied',
      auditMessage: 'already refreshed'
    } as const;
    const deps = harness(diskTruth({ manifest: { ...manifest(), interventions: [previous] } }));

    await expect(executeDeterministicRecovery({
      repositoryPath: '/repo',
      userDataPath: '/user-data',
      request: request('refresh-failed-marker'),
      now: () => now,
      ...deps
    })).resolves.toMatchObject({
      result: 'no-op',
      interventionId: 'intervention-existing'
    });

    expect(deps.actions.refreshFailedMarker).not.toHaveBeenCalled();
    expect(deps.appendIntervention).not.toHaveBeenCalled();
  });
});
