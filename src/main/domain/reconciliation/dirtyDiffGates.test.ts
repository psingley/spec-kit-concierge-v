import { describe, expect, it } from 'vitest';
import type { StepOwnedArtifactSnapshot } from '../manifest/types';
import { classifyDirtyDiff } from './dirtyDiffGates';

const snapshot = (): StepOwnedArtifactSnapshot => ({
  step: 'tasks',
  featureDir: 'specs/0013-hybrid-manifest-architecture',
  paths: [
    { path: 'tasks.md', required: true, present: true, sha256: 'a'.repeat(64), sizeBytes: 1 },
    { path: 'checklists/requirements.md', required: false, present: true, sha256: 'b'.repeat(64), sizeBytes: 1 }
  ],
  snapshotHash: 'c'.repeat(64),
  capturedAt: '2026-06-02T00:00:00.000Z'
});

describe('classifyDirtyDiff', () => {
  it('classifies changes inside the active step-owned path set as owned-safe', () => {
    expect(classifyDirtyDiff({
      step: 'tasks',
      ownedPathSnapshot: snapshot(),
      changedPaths: ['specs/0013-hybrid-manifest-architecture/tasks.md']
    })).toEqual({
      classification: 'owned-safe',
      affectedPaths: ['specs/0013-hybrid-manifest-architecture/tasks.md'],
      blocking: false,
      strandedArtifacts: []
    });
  });

  it('classifies owned paths with known content mismatches as owned-mismatched', () => {
    expect(classifyDirtyDiff({
      step: 'tasks',
      ownedPathSnapshot: snapshot(),
      changedPaths: ['specs/0013-hybrid-manifest-architecture/tasks.md'],
      mismatchedOwnedPaths: ['specs/0013-hybrid-manifest-architecture/tasks.md']
    })).toMatchObject({
      classification: 'owned-mismatched',
      blocking: true
    });
  });

  it('classifies unrelated paths outside the owned set as unrelated', () => {
    expect(classifyDirtyDiff({
      step: 'tasks',
      ownedPathSnapshot: snapshot(),
      changedPaths: ['src/main/ipc/passiveStepIpc.ts']
    })).toMatchObject({
      classification: 'unrelated',
      blocking: true,
      strandedArtifacts: ['src/main/ipc/passiveStepIpc.ts']
    });
  });

  it('classifies sibling feature artifacts as ambiguous', () => {
    expect(classifyDirtyDiff({
      step: 'tasks',
      ownedPathSnapshot: snapshot(),
      changedPaths: ['specs/0012-remove-density-settings/tasks.md']
    })).toMatchObject({
      classification: 'ambiguous',
      blocking: true
    });
  });

  it('classifies destructive or unsafe changes as unsafe even when owned paths are also changed', () => {
    expect(classifyDirtyDiff({
      step: 'tasks',
      ownedPathSnapshot: snapshot(),
      changedPaths: [
        'specs/0013-hybrid-manifest-architecture/tasks.md',
        '.git/index'
      ],
      unsafePaths: ['.git/index']
    })).toMatchObject({
      classification: 'unsafe',
      blocking: true,
      strandedArtifacts: ['.git/index']
    });
  });
});
