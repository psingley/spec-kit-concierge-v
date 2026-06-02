import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { withTempDir } from '../../../test/tempDir';
import { createStepOwnedArtifactSnapshot } from './artifactSnapshot.factory';

describe('createStepOwnedArtifactSnapshot', () => {
  it('captures required and optional step-owned artifacts with stable content metadata', async () => {
    await withTempDir(async (directory) => {
      const featureDir = path.join(directory, 'specs/0013-hybrid-manifest-architecture');
      await mkdir(path.join(featureDir, 'checklists'), { recursive: true });
      await writeFile(path.join(featureDir, 'spec.md'), '# Spec\n');
      await writeFile(path.join(featureDir, 'checklists/requirements.md'), '# Requirements\n');

      const snapshot = await createStepOwnedArtifactSnapshot({
        step: 'specify',
        featureDir,
        capturedAt: '2026-06-02T00:00:00.000Z',
        ownedArtifacts: [
          { path: 'spec.md', required: true },
          { path: 'checklists/requirements.md', required: false },
          { path: 'optional.md', required: false }
        ]
      });

      expect(snapshot).toMatchObject({
        ok: true,
        value: {
          step: 'specify',
          featureDir,
          paths: [
            expect.objectContaining({ path: 'spec.md', required: true, present: true, sizeBytes: 7 }),
            expect.objectContaining({ path: 'checklists/requirements.md', required: false, present: true, sizeBytes: 15 }),
            { path: 'optional.md', required: false, present: false }
          ],
          snapshotHash: expect.any(String)
        }
      });
      if (!snapshot.ok) throw new Error('expected snapshot to succeed');
      expect(snapshot.value.paths[0]?.sha256).toHaveLength(64);

      const repeated = await createStepOwnedArtifactSnapshot({
        step: 'specify',
        featureDir,
        capturedAt: '2026-06-02T00:01:00.000Z',
        ownedArtifacts: [
          { path: 'optional.md', required: false },
          { path: 'checklists/requirements.md', required: false },
          { path: 'spec.md', required: true }
        ]
      });

      expect(repeated).toMatchObject({ ok: true });
      if (!repeated.ok) throw new Error('expected repeated snapshot to succeed');
      expect(repeated.value.snapshotHash).toBe(snapshot.value.snapshotHash);
    });
  });

  it('rejects step-owned paths outside the feature directory', async () => {
    await withTempDir(async (directory) => {
      const featureDir = path.join(directory, 'specs/0013-hybrid-manifest-architecture');
      await mkdir(featureDir, { recursive: true });

      const snapshot = await createStepOwnedArtifactSnapshot({
        step: 'specify',
        featureDir,
        capturedAt: '2026-06-02T00:00:00.000Z',
        ownedArtifacts: [{ path: '../outside.md', required: false }]
      });

      expect(snapshot).toMatchObject({
        ok: false,
        error: { name: 'InvalidArtifactSnapshot', path: '$.ownedArtifacts[0].path' }
      });
    });
  });

  it('blocks missing required artifacts', async () => {
    await withTempDir(async (directory) => {
      const featureDir = path.join(directory, 'specs/0013-hybrid-manifest-architecture');
      await mkdir(featureDir, { recursive: true });

      const snapshot = await createStepOwnedArtifactSnapshot({
        step: 'specify',
        featureDir,
        capturedAt: '2026-06-02T00:00:00.000Z',
        ownedArtifacts: [{ path: 'spec.md', required: true }]
      });

      expect(snapshot).toMatchObject({
        ok: false,
        error: { name: 'InvalidArtifactSnapshot', path: '$.paths[0]' }
      });
    });
  });

  it('changes snapshot hash when owned artifact content changes', async () => {
    await withTempDir(async (directory) => {
      const featureDir = path.join(directory, 'specs/0013-hybrid-manifest-architecture');
      await mkdir(featureDir, { recursive: true });
      await writeFile(path.join(featureDir, 'spec.md'), '# Spec\n');

      const first = await createStepOwnedArtifactSnapshot({
        step: 'specify',
        featureDir,
        capturedAt: '2026-06-02T00:00:00.000Z',
        ownedArtifacts: [{ path: 'spec.md', required: true }]
      });
      await writeFile(path.join(featureDir, 'spec.md'), '# Spec changed\n');
      const second = await createStepOwnedArtifactSnapshot({
        step: 'specify',
        featureDir,
        capturedAt: '2026-06-02T00:01:00.000Z',
        ownedArtifacts: [{ path: 'spec.md', required: true }]
      });

      if (!first.ok || !second.ok) throw new Error('expected snapshots to succeed');
      expect(second.value.paths[0]?.sha256).not.toBe(first.value.paths[0]?.sha256);
      expect(second.value.snapshotHash).not.toBe(first.value.snapshotHash);
    });
  });
});
