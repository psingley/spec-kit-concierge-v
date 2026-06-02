import { existsSync } from 'node:fs';
import { mkdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { withTempDir } from '../../../test/tempDir';
import {
  SESSION_MANIFEST_SCHEMA,
  type Anomaly,
  type BranchStateSnapshot,
  type Intervention,
  type SessionManifestV1,
  type StepAttempt,
  type StepOwnedArtifactSnapshot
} from '../../domain/manifest/types';
import {
  appendAnomaly,
  appendIntervention,
  appendStepAttempt,
  createOrLoadManifest,
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
  attempts: [],
  anomalies: [],
  interventions: [],
  doctorInvocations: [],
  nudgeRequests: [],
  audit: []
});

const attempt = (): StepAttempt => ({
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

describe('sessionManifestStore', () => {
  it('writes the manifest through temp file, file fsync, rename, and directory fsync', async () => {
    await withTempDir(async (repositoryPath) => {
      const events: string[] = [];
      const fileHandle = {
        writeFile: vi.fn(async () => {
          events.push('write');
        }),
        stat: vi.fn(async () => ({ size: Buffer.byteLength(`${JSON.stringify(manifest(), null, 2)}\n`, 'utf8') })),
        sync: vi.fn(async () => {
          events.push('file-sync');
        }),
        close: vi.fn(async () => {
          events.push('close');
        })
      };
      const directoryHandle = {
        sync: vi.fn(async () => {
          events.push('dir-sync');
        }),
        close: vi.fn(async () => {
          events.push('dir-close');
        })
      };
      const rename = vi.fn(async (...args: unknown[]) => {
        expect(args).toHaveLength(2);
        events.push('rename');
      });

      await writeManifest(manifest(), {
        repositoryPath,
        fs: {
          open: vi.fn(async (targetPath: string, flags: string) => {
            if (flags === 'r') return directoryHandle;
            expect(targetPath).toContain(`${path.sep}.session-manifest.json.`);
            expect(flags).toBe('w');
            return fileHandle;
          }),
          rename,
          mkdir
        }
      });

      expect(events).toEqual(['write', 'file-sync', 'close', 'rename', 'dir-sync', 'dir-close']);
      expect(rename.mock.calls[0]?.[1]).toBe(manifestFilePath(repositoryPath));
    });
  });

  it('rejects short writes and leaves the target manifest untouched', async () => {
    await withTempDir(async (repositoryPath) => {
      await mkdir(path.dirname(manifestFilePath(repositoryPath)), { recursive: true });
      await writeManifest(manifest(), { repositoryPath });
      const before = await readFile(manifestFilePath(repositoryPath), 'utf8');

      await expect(
        writeManifest({ ...manifest(), sessionId: '22222222-2222-4222-8222-222222222222' }, {
          repositoryPath,
          fs: {
            open: vi.fn(async () => ({
              writeFile: vi.fn(async () => undefined),
              sync: vi.fn(async () => undefined),
              close: vi.fn(async () => undefined),
              stat: vi.fn(async () => ({ size: 1 }))
            }))
          }
        })
      ).rejects.toMatchObject({ name: 'SessionManifestStoreError', code: 'short-write' });

      await expect(readFile(manifestFilePath(repositoryPath), 'utf8')).resolves.toBe(before);
    });
  });

  it('surfaces visible parse errors when the manifest on disk is invalid', async () => {
    await withTempDir(async (repositoryPath) => {
      await mkdir(path.dirname(manifestFilePath(repositoryPath)), { recursive: true });
      await writeManifest(manifest(), { repositoryPath });
      await writeManifest({ ...manifest(), attempts: [] }, { repositoryPath });
      await readFile(manifestFilePath(repositoryPath), 'utf8');

      await writeManifest(manifest(), { repositoryPath });
      await mkdir(path.dirname(manifestFilePath(repositoryPath)), { recursive: true });
      await import('node:fs/promises').then(({ writeFile }) => writeFile(manifestFilePath(repositoryPath), '{"schema":'));

      await expect(loadManifest({ repositoryPath })).rejects.toMatchObject({
        name: 'SessionManifestStoreError',
        code: 'parse-error'
      });
    });
  });

  it('creates, loads, and appends attempts, anomalies, and interventions through the same manifest file', async () => {
    await withTempDir(async (repositoryPath) => {
      const created = await createOrLoadManifest({
        repositoryPath,
        manifest: manifest()
      });
      expect(created.sessionId).toBe('11111111-1111-4111-8111-111111111111');
      expect(existsSync(manifestFilePath(repositoryPath))).toBe(true);

      const withAttempt = await appendStepAttempt({ repositoryPath, attempt: attempt() });
      expect(withAttempt.attempts).toHaveLength(1);

      const withAnomaly = await appendAnomaly({ repositoryPath, anomaly: anomaly() });
      expect(withAnomaly.anomalies).toHaveLength(1);

      const withIntervention = await appendIntervention({ repositoryPath, intervention: intervention() });
      expect(withIntervention.interventions).toHaveLength(1);
      expect((await stat(manifestFilePath(repositoryPath))).size).toBeGreaterThan(0);

      await expect(loadManifest({ repositoryPath })).resolves.toMatchObject({
        attempts: [{ attemptId: 'attempt-1' }],
        anomalies: [{ anomalyId: 'anomaly-1' }],
        interventions: [{ interventionId: 'intervention-1' }]
      });
    });
  });
});
