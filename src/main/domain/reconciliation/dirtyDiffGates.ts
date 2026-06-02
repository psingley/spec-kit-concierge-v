import path from 'node:path';
import type { StepName, StepOwnedArtifactSnapshot } from '../manifest/types';

export type DirtyDiffClassification =
  | 'owned-safe'
  | 'owned-mismatched'
  | 'unrelated'
  | 'ambiguous'
  | 'unsafe';

export type DirtyDiffGateRequest = {
  step: StepName;
  ownedPathSnapshot: StepOwnedArtifactSnapshot;
  changedPaths: string[];
  mismatchedOwnedPaths?: string[];
  unsafePaths?: string[];
};

export type DirtyDiffGateResult = {
  classification: DirtyDiffClassification;
  affectedPaths: string[];
  blocking: boolean;
  strandedArtifacts: string[];
};

const normalize = (filePath: string): string =>
  filePath.split(path.sep).join('/');

const featureRelativeOwnedPaths = (snapshot: StepOwnedArtifactSnapshot): Set<string> =>
  new Set(snapshot.paths.map((artifact) => normalize(path.posix.join(snapshot.featureDir, artifact.path))));

const isSiblingFeaturePath = (snapshot: StepOwnedArtifactSnapshot, changedPath: string): boolean =>
  changedPath.startsWith('specs/') && !changedPath.startsWith(`${normalize(snapshot.featureDir)}/`);

export const classifyDirtyDiff = (request: DirtyDiffGateRequest): DirtyDiffGateResult => {
  const changedPaths = request.changedPaths.map(normalize).sort();
  const unsafePaths = new Set((request.unsafePaths ?? []).map(normalize));
  const mismatchedOwnedPaths = new Set((request.mismatchedOwnedPaths ?? []).map(normalize));
  const ownedPaths = featureRelativeOwnedPaths(request.ownedPathSnapshot);

  if (changedPaths.some((changedPath) => unsafePaths.has(changedPath))) {
    return {
      classification: 'unsafe',
      affectedPaths: changedPaths.filter((changedPath) => unsafePaths.has(changedPath)),
      blocking: true,
      strandedArtifacts: changedPaths.filter((changedPath) => unsafePaths.has(changedPath))
    };
  }

  if (changedPaths.some((changedPath) => mismatchedOwnedPaths.has(changedPath))) {
    const affectedPaths = changedPaths.filter((changedPath) => mismatchedOwnedPaths.has(changedPath));
    return {
      classification: 'owned-mismatched',
      affectedPaths,
      blocking: true,
      strandedArtifacts: affectedPaths
    };
  }

  if (changedPaths.some((changedPath) => isSiblingFeaturePath(request.ownedPathSnapshot, changedPath))) {
    const affectedPaths = changedPaths.filter((changedPath) => isSiblingFeaturePath(request.ownedPathSnapshot, changedPath));
    return {
      classification: 'ambiguous',
      affectedPaths,
      blocking: true,
      strandedArtifacts: affectedPaths
    };
  }

  const unrelatedPaths = changedPaths.filter((changedPath) => !ownedPaths.has(changedPath));
  if (unrelatedPaths.length > 0) {
    return {
      classification: 'unrelated',
      affectedPaths: unrelatedPaths,
      blocking: true,
      strandedArtifacts: unrelatedPaths
    };
  }

  return {
    classification: 'owned-safe',
    affectedPaths: changedPaths,
    blocking: false,
    strandedArtifacts: []
  };
};
