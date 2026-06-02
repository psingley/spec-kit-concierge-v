import { describe, expect, it, vi } from 'vitest';
import { withTempDir } from '../../../test/tempDir';
import {
  SESSION_MANIFEST_SCHEMA,
  type Anomaly,
  type BranchStateSnapshot,
  type Intervention,
  type SessionManifestV1,
  type StepOwnedArtifactSnapshot
} from '../../domain/manifest/types';
import {
  appendAnomaly,
  appendIntervention,
  loadManifest,
  manifestFilePath,
  writeManifest
} from './sessionManifestStore';

const timestamp = '2026-06-02T00:00:00.000Z';

const branchSnapshot = (): BranchStateSnapshot => ({
  branch: 'build/manifest-architecture-dogfood',
  headSha: '1'.repeat(40),
  statusPorcelain: '',
  trackedChanges: [],
  timestamp
});

const artifactSnapshot = (): StepOwnedArtifactSnapshot => ({
  step: 'specify',
  featureDir: 'specs/0013-hybrid-manifest-architecture',
  paths: [{
    path: 'specs/0013-hybrid-manifest-architecture/spec.md',
    required: true,
    present: true,
    sha256: 'a'.repeat(64),
    sizeBytes: 1,
    mtimeMs: 1780372800000
  }],
  snapshotHash: 'b'.repeat(64),
  capturedAt: timestamp
});

const manifest = (): SessionManifestV1 => ({
  schema: SESSION_MANIFEST_SCHEMA,
  sessionId: '11111111-1111-4111-8111-111111111111',
  featureDir: 'specs/0013-hybrid-manifest-architecture',
  branch: 'build/manifest-architecture-dogfood',
  createdAt: timestamp,
  updatedAt: timestamp,
  currentStep: 'specify',
  attempts: [{
    attemptId: 'attempt-1',
    step: 'specify',
    status: 'pending',
    startedAt: timestamp,
    branchBefore: branchSnapshot(),
    ownedPathSnapshot: artifactSnapshot(),
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
    anomalyIds: [],
    interventionIds: []
  }],
  anomalies: [],
  interventions: [],
  doctorInvocations: [],
  nudgeRequests: [],
  audit: []
});

const anomaly = (): Anomaly => ({
  anomalyId: 'anomaly-1',
  step: 'specify',
  kind: 'missing-artifact',
  severity: 'blocking',
  detectedAt: '2026-06-02T00:01:00.000Z',
  evidence: { path: 'spec.md' }
});

const intervention = (): Intervention => ({
  interventionId: 'intervention-1',
  anomalyId: 'anomaly-1',
  tool: 'relocateArtifact',
  startedAt: '2026-06-02T00:02:00.000Z',
  endedAt: '2026-06-02T00:03:00.000Z',
  preconditionSnapshot: { anomalyId: 'anomaly-1' },
  result: 'applied',
  auditMessage: 'relocated owned artifact'
});

describe('sessionManifestStore logging', () => {
  it('logs session-manifest-write and session-manifest-read events', async () => {
    await withTempDir(async (repositoryPath) => {
      const logger = { info: vi.fn() };

      await writeManifest(manifest(), { repositoryPath, logger });
      await loadManifest({ repositoryPath, logger });

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'session-manifest-write',
          feature: 'hybrid-manifest',
          manifestPath: manifestFilePath(repositoryPath),
          sessionId: '11111111-1111-4111-8111-111111111111',
          currentStep: 'specify'
        }),
        'hybrid manifest event'
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'session-manifest-read',
          feature: 'hybrid-manifest',
          manifestPath: manifestFilePath(repositoryPath),
          sessionId: '11111111-1111-4111-8111-111111111111'
        }),
        'hybrid manifest event'
      );
    });
  });

  it('logs anomaly and intervention append events', async () => {
    await withTempDir(async (repositoryPath) => {
      const logger = { info: vi.fn() };

      await writeManifest(manifest(), { repositoryPath, logger });
      await appendAnomaly({ repositoryPath, anomaly: anomaly(), logger });
      await appendIntervention({ repositoryPath, intervention: intervention(), logger });

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'manifest-anomaly-recorded',
          feature: 'hybrid-manifest',
          anomalyId: 'anomaly-1',
          step: 'specify',
          severity: 'blocking'
        }),
        'hybrid manifest event'
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'manifest-intervention-recorded',
          feature: 'hybrid-manifest',
          interventionId: 'intervention-1',
          anomalyId: 'anomaly-1',
          result: 'applied'
        }),
        'hybrid manifest event'
      );
    });
  });
});
