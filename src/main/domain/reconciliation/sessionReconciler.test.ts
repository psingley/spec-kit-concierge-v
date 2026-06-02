import { describe, expect, it } from 'vitest';
import {
  SESSION_MANIFEST_SCHEMA,
  type Anomaly,
  type BranchStateSnapshot,
  type SessionManifestV1,
  type StepAttempt,
  type StepOwnedArtifactSnapshot
} from '../manifest/types';
import { reconcileSessionStep } from './sessionReconciler';

const timestamp = '2026-06-02T00:00:00.000Z';
const snapshotHash = 'a'.repeat(64);

const branchSnapshot = (): BranchStateSnapshot => ({
  branch: 'build/manifest-architecture-dogfood',
  headSha: '1'.repeat(40),
  statusPorcelain: '',
  trackedChanges: [],
  timestamp
});

const artifactSnapshot = (overrides: Partial<StepOwnedArtifactSnapshot> = {}): StepOwnedArtifactSnapshot => ({
  step: 'specify',
  featureDir: 'specs/0013-hybrid-manifest-architecture',
  paths: [{
    path: 'spec.md',
    required: true,
    present: true,
    sha256: 'b'.repeat(64),
    sizeBytes: 1,
    mtimeMs: 1780372800000
  }],
  snapshotHash,
  capturedAt: timestamp,
  ...overrides
});

const attempt = (overrides: Partial<StepAttempt> = {}): StepAttempt => ({
  attemptId: 'attempt-1',
  step: 'specify',
  status: 'pass',
  startedAt: timestamp,
  endedAt: '2026-06-02T00:01:00.000Z',
  branchBefore: branchSnapshot(),
  ownedPathSnapshot: artifactSnapshot(),
  completionEvidence: {
    commitSha: '2'.repeat(40),
    trailer: 'Concierge-Step: specify:pass',
    artifactSnapshot: artifactSnapshot(),
    adoptedFromHistory: false
  },
  spawnRecipe: {
    command: 'copilot',
    args: ['-p', '--agent', 'speckit.specify', '--output-format', 'json', '--session-id', '11111111-1111-4111-8111-111111111111', '--log-dir', '.concierge/logs'],
    cwd: '/repo/spec-kit-concierge-v',
    environmentKeys: ['PATH']
  },
  assistant: [],
  logReference: {
    path: '.concierge/logs/specify.jsonl',
    sha256: 'c'.repeat(64),
    sizeBytes: 1
  },
  terminalResult: {
    exitCode: 0,
    resultKind: 'success'
  },
  anomalyIds: [],
  interventionIds: [],
  ...overrides
});

const blockingAnomaly = (): Anomaly => ({
  anomalyId: 'anomaly-1',
  step: 'specify',
  kind: 'missing-artifact',
  severity: 'blocking',
  detectedAt: timestamp,
  evidence: { path: 'spec.md' }
});

const manifest = (overrides: Partial<SessionManifestV1> = {}): SessionManifestV1 => ({
  schema: SESSION_MANIFEST_SCHEMA,
  sessionId: '11111111-1111-4111-8111-111111111111',
  featureDir: 'specs/0013-hybrid-manifest-architecture',
  branch: 'build/manifest-architecture-dogfood',
  createdAt: timestamp,
  updatedAt: timestamp,
  currentStep: 'specify',
  attempts: [attempt()],
  anomalies: [],
  interventions: [],
  doctorInvocations: [],
  nudgeRequests: [],
  audit: [],
  ...overrides
});

const baseRequest = (overrides: Partial<Parameters<typeof reconcileSessionStep>[0]> = {}) => ({
  manifest: manifest(),
  step: 'specify' as const,
  currentArtifactSnapshot: artifactSnapshot(),
  completionHistory: [{
    commitSha: '2'.repeat(40),
    step: 'specify' as const,
    status: 'pass',
    artifactSnapshotHash: snapshotHash,
    warnings: []
  }],
  failedMarker: undefined,
  ...overrides
});

describe('reconcileSessionStep', () => {
  it('returns pass only when attempt, artifacts, completion evidence, and branch history agree', () => {
    const result = reconcileSessionStep(baseRequest());

    expect(result).toMatchObject({
      step: 'specify',
      status: 'pass',
      canCommit: false,
      canNudge: false,
      completionEvidence: {
        commitSha: '2222222222222222222222222222222222222222',
        trailer: 'Concierge-Step: specify:pass',
        artifactSnapshot: { snapshotHash },
        adoptedFromHistory: false
      }
    });
  });

  it('blocks pass when a required artifact is missing', () => {
    const result = reconcileSessionStep(baseRequest({
      currentArtifactSnapshot: artifactSnapshot({
        paths: [{ path: 'spec.md', required: true, present: false }]
      })
    }));

    expect(result).toMatchObject({
      status: 'pending',
      canCommit: false,
      anomalies: [expect.objectContaining({ kind: 'missing-artifact', severity: 'blocking' })]
    });
  });

  it('does not pass a stale manifest attempt without a success terminal result', () => {
    const result = reconcileSessionStep(baseRequest({
      manifest: manifest({ attempts: [attempt({ status: 'running', terminalResult: undefined, endedAt: undefined })] })
    }));

    expect(result).toMatchObject({ status: 'running', canCommit: false });
  });

  it('allows commit when the attempt succeeded but no matching trailer exists yet', () => {
    const result = reconcileSessionStep(baseRequest({ completionHistory: [] }));

    expect(result).toMatchObject({
      status: 'pending',
      canCommit: true,
      requiredInterventions: []
    });
  });

  it('rejects mismatched artifact snapshot trailers', () => {
    const result = reconcileSessionStep(baseRequest({
      completionHistory: [{
        commitSha: '3'.repeat(40),
        step: 'specify',
        status: 'pass',
        artifactSnapshotHash: 'd'.repeat(64),
        warnings: []
      }]
    }));

    expect(result).toMatchObject({
      status: 'pending',
      canCommit: false,
      anomalies: [expect.objectContaining({ kind: 'conflicting-evidence', severity: 'blocking' })]
    });
  });

  it('blocks pass while a blocking anomaly remains unresolved', () => {
    const anomaly = blockingAnomaly();
    const result = reconcileSessionStep(baseRequest({
      manifest: manifest({ anomalies: [anomaly], attempts: [attempt({ anomalyIds: [anomaly.anomalyId] })] })
    }));

    expect(result).toMatchObject({
      status: 'pending',
      canCommit: false,
      anomalies: [expect.objectContaining({ anomalyId: 'anomaly-1' })],
      requiredInterventions: ['anomaly-1']
    });
  });

  it('surfaces failed marker inputs as failed or terminal-stuck without marking completion', () => {
    const failed = reconcileSessionStep(baseRequest({
      manifest: manifest({ attempts: [attempt({ status: 'failed', terminalResult: { exitCode: 1, resultKind: 'failure' } })] }),
      failedMarker: {
        step: 'specify',
        sessionId: 's1',
        failedAt: timestamp,
        reason: 'factory-rejected',
        strandedArtifacts: ['specs/0013-hybrid-manifest-architecture/spec.md']
      }
    }));
    const stuck = reconcileSessionStep(baseRequest({
      manifest: manifest({ attempts: [attempt({ status: 'failed', terminalResult: { exitCode: 1, resultKind: 'failure' } })] }),
      completionHistory: [],
      failedMarker: {
        step: 'specify',
        sessionId: 's1',
        failedAt: timestamp,
        reason: 'factory-rejected',
        strandedArtifacts: []
      }
    }));

    expect(failed).toMatchObject({ status: 'failed', canCommit: false, canNudge: false });
    expect(stuck).toMatchObject({ status: 'terminal-stuck', canCommit: false, canNudge: true });
  });
});
