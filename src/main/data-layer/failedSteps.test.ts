import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { withTempDir } from '../../test/tempDir';
import { failedStepMarkerPath, readFailedStepMarker, writeFailedStepMarker } from './failedSteps';

describe('failed step markers', () => {
  it('reads legacy markers without strandedArtifacts or anomalyIds', async () => {
    await withTempDir(async (repositoryPath) => {
      const markerPath = failedStepMarkerPath({ repositoryPath, step: 'tasks' });
      await mkdir(path.dirname(markerPath), { recursive: true });
      await writeFile(markerPath, JSON.stringify({
        step: 'tasks',
        sessionId: 'tasks-1',
        failedAt: '2026-06-02T00:00:00.000Z',
        reason: 'factory-rejected'
      }));

      await expect(readFailedStepMarker({ repositoryPath, step: 'tasks' })).resolves.toEqual({
        step: 'tasks',
        sessionId: 'tasks-1',
        failedAt: '2026-06-02T00:00:00.000Z',
        reason: 'factory-rejected',
        strandedArtifacts: [],
        anomalyIds: []
      });
    });
  });

  it('writes and reads stranded artifact and anomaly id details', async () => {
    await withTempDir(async (repositoryPath) => {
      await writeFailedStepMarker({
        repositoryPath,
        userDataPath: repositoryPath,
        step: 'tasks',
        sessionId: 'tasks-1',
        failedAt: '2026-06-02T00:00:00.000Z',
        reason: 'needs-attention: dirty diff blocked completion',
        strandedArtifacts: ['src/main/ipc/passiveStepIpc.ts'],
        anomalyIds: ['anomaly-1']
      });

      await expect(readFailedStepMarker({ repositoryPath, step: 'tasks' })).resolves.toMatchObject({
        strandedArtifacts: ['src/main/ipc/passiveStepIpc.ts'],
        anomalyIds: ['anomaly-1']
      });
    });
  });

  it('treats invalid anomaly ids as invalid markers', async () => {
    await withTempDir(async (repositoryPath) => {
      const markerPath = failedStepMarkerPath({ repositoryPath, step: 'tasks' });
      await mkdir(path.dirname(markerPath), { recursive: true });
      await writeFile(markerPath, JSON.stringify({
        step: 'tasks',
        sessionId: 'tasks-1',
        failedAt: '2026-06-02T00:00:00.000Z',
        reason: 'factory-rejected',
        strandedArtifacts: [],
        anomalyIds: [123]
      }));

      await expect(readFailedStepMarker({ repositoryPath, step: 'tasks' })).resolves.toBeUndefined();
    });
  });
});
