import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { invalid, type ManifestFactoryResult } from '../manifest/factoryUtils';
import type { StepName, StepOwnedArtifactPath, StepOwnedArtifactSnapshot } from '../manifest/types';

export type SnapshotOwnedArtifact = {
  path: string;
  required: boolean;
};

export type CreateStepOwnedArtifactSnapshotRequest = {
  step: StepName;
  featureDir: string;
  capturedAt: string;
  ownedArtifacts: SnapshotOwnedArtifact[];
  allowMissingRequired?: boolean;
};

type ErrorName = 'InvalidArtifactSnapshot';

const hashBuffer = (contents: Buffer): string =>
  createHash('sha256').update(contents).digest('hex');

const hashSnapshotPaths = (paths: StepOwnedArtifactPath[]): string =>
  createHash('sha256')
    .update(JSON.stringify(
      [...paths]
        .sort((left, right) => left.path.localeCompare(right.path))
        .map((artifact) => ({
          path: artifact.path,
          required: artifact.required,
          present: artifact.present,
          sha256: artifact.sha256,
          sizeBytes: artifact.sizeBytes
        }))
    ))
    .digest('hex');

const resolveOwnedPath = (
  featureDir: string,
  artifactPath: string,
  index: number
): ManifestFactoryResult<string, ErrorName> => {
  if (path.isAbsolute(artifactPath)) {
    return invalid('InvalidArtifactSnapshot', 'owned artifact path must be relative', `$.ownedArtifacts[${index}].path`);
  }

  const normalized = path.normalize(artifactPath);
  if (normalized === '..' || normalized.startsWith(`..${path.sep}`)) {
    return invalid('InvalidArtifactSnapshot', 'owned artifact path must stay inside the feature directory', `$.ownedArtifacts[${index}].path`);
  }

  const absolutePath = path.resolve(featureDir, normalized);
  const featureRoot = path.resolve(featureDir);
  if (absolutePath !== featureRoot && !absolutePath.startsWith(`${featureRoot}${path.sep}`)) {
    return invalid('InvalidArtifactSnapshot', 'owned artifact path must stay inside the feature directory', `$.ownedArtifacts[${index}].path`);
  }

  return { ok: true, value: normalized };
};

export const createStepOwnedArtifactSnapshot = async (
  request: CreateStepOwnedArtifactSnapshotRequest
): Promise<ManifestFactoryResult<StepOwnedArtifactSnapshot, ErrorName>> => {
  const snapshotPaths: StepOwnedArtifactPath[] = [];

  for (const [index, artifact] of request.ownedArtifacts.entries()) {
    const resolved = resolveOwnedPath(request.featureDir, artifact.path, index);
    if (!resolved.ok) return resolved;

    const diskPath = path.join(request.featureDir, resolved.value);
    try {
      const [metadata, contents] = await Promise.all([
        stat(diskPath),
        readFile(diskPath)
      ]);
      snapshotPaths.push({
        path: resolved.value,
        required: artifact.required,
        present: true,
        sha256: hashBuffer(contents),
        sizeBytes: metadata.size,
        mtimeMs: metadata.mtimeMs
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
      if (artifact.required && request.allowMissingRequired !== true) {
        return invalid('InvalidArtifactSnapshot', 'required owned artifact is missing', `$.paths[${index}]`);
      }
      snapshotPaths.push({
        path: resolved.value,
        required: artifact.required,
        present: false
      });
    }
  }

  return {
    ok: true,
    value: {
      step: request.step,
      featureDir: request.featureDir,
      paths: snapshotPaths,
      snapshotHash: hashSnapshotPaths(snapshotPaths),
      capturedAt: request.capturedAt
    }
  };
};
