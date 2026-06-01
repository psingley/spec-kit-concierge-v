import { readFile } from 'node:fs/promises';
import path from 'node:path';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Spec Kit writes its artifacts (spec.md, plan.md, etc.) to the feature directory
// recorded in .specify/feature.json (key feature_directory, relative to the repo
// root), NOT the repo root itself. Resolve that directory so handlers read/write
// the real artifacts instead of the worktree root.
//
// Strict variant: throws a clear Error when the manifest is missing, malformed, or
// has no feature_directory. Callers that run inside a try/catch surface this as a
// clean failure event; an in-flight session without feature.json should not reach
// these steps.
export const resolveFeatureDir = async (repositoryPath: string): Promise<string> => {
  const manifestPath = path.join(repositoryPath, '.specify', 'feature.json');
  let raw: string;
  try {
    raw = await readFile(manifestPath, 'utf8');
  } catch {
    throw new Error('spec-kit feature directory not found (.specify/feature.json missing)');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('spec-kit feature directory unreadable (.specify/feature.json is malformed JSON)');
  }
  if (!isRecord(parsed) || typeof parsed.feature_directory !== 'string' || parsed.feature_directory.trim().length === 0) {
    throw new Error('spec-kit feature directory missing (.specify/feature.json has no feature_directory)');
  }
  return path.join(repositoryPath, parsed.feature_directory);
};

// Resolve the absolute on-disk path for an artifact read. The renderer passes the
// worktree root + a BARE artifact name (e.g. plan.md); the real file lives under
// the feature dir from feature.json. Cases:
//   - bare name (no specs/ segment)   -> <featureDir>/<name> via resolveFeatureDir
//   - already repo-relative (specs/)  -> <repositoryPath>/<artifactPath> (no double prefix)
//   - feature.json missing/unreadable -> fall back to <repositoryPath>/<artifactPath>
// (Absolute / app-owned paths never reach this IPC — the request factory rejects
// leading-slash artifactPaths, so they flow through review:evidence instead.)
export const resolveArtifactReadPath = async (
  repositoryPath: string,
  artifactPath: string,
  resolveDir: (repositoryPath: string) => Promise<string> = resolveFeatureDir
): Promise<string> => {
  if (artifactPath.split('/').includes('specs')) {
    return path.join(repositoryPath, artifactPath);
  }
  try {
    const featureDir = await resolveDir(repositoryPath);
    return path.join(featureDir, artifactPath);
  } catch {
    return path.join(repositoryPath, artifactPath);
  }
};
