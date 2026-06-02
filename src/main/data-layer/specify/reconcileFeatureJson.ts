import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { safeWrite } from '../fs/safeWrite';
import { runGit as defaultRunGit } from '../git/gitCommand';
import type { MainLogger } from '../../logging';

type FeatureJson = Record<string, unknown>;

export type ChangedSpecifySpecPath = {
  path: string;
  mtimeMs?: number;
};

export type DecideSpecifyFeatureDirectoryRequest = {
  inheritedFeatureDirectory?: string;
  changedPaths: Array<string | ChangedSpecifySpecPath>;
  branchName?: string;
};

export type ReconcileSpecifyFeatureJsonRequest = {
  repositoryPath: string;
  logger: Pick<MainLogger, 'info' | 'warn'>;
  branchName?: string;
  baseRef?: string;
  runGit?: typeof defaultRunGit;
};

export type ReconcileSpecifyFeatureJsonResult = {
  featureDirectory?: string;
  previousFeatureDirectory?: string;
  changed: boolean;
};

const normalizeGitPath = (value: string): string => value.replace(/\\/g, '/');

const parsePorcelainPath = (line: string): string | undefined => {
  const pathText = line.replace(/^(?:..|.)\s+/, '').trim();
  if (pathText.length === 0) {
    return undefined;
  }

  return pathText.includes(' -> ') ? pathText.split(' -> ').at(-1) : pathText;
};

const featureDirFromSpecPath = (changedPath: string): string | undefined => {
  const match = /^specs\/([^/]+)\/spec\.md$/.exec(normalizeGitPath(changedPath));
  return match === null ? undefined : `specs/${match[1]}`;
};

const pathValue = (entry: string | ChangedSpecifySpecPath): string =>
  typeof entry === 'string' ? entry : entry.path;

const mtimeValue = (entry: string | ChangedSpecifySpecPath): number =>
  typeof entry === 'string' || entry.mtimeMs === undefined ? 0 : entry.mtimeMs;

const branchBasename = (branchName: string | undefined): string | undefined => {
  if (branchName === undefined || branchName.trim().length === 0) {
    return undefined;
  }

  return branchName.split(/[\\/]+/).at(-1);
};

export const decideSpecifyFeatureDirectory = (
  request: DecideSpecifyFeatureDirectoryRequest
): string | undefined => {
  const candidates = request.changedPaths
    .map((entry, index) => ({
      featureDirectory: featureDirFromSpecPath(pathValue(entry)),
      mtimeMs: mtimeValue(entry),
      index
    }))
    .filter((candidate): candidate is { featureDirectory: string; mtimeMs: number; index: number } =>
      candidate.featureDirectory !== undefined
    );

  if (candidates.length === 0) {
    return request.inheritedFeatureDirectory;
  }

  if (candidates.length === 1) {
    return candidates[0]?.featureDirectory;
  }

  const branch = branchBasename(request.branchName);
  const branchMatch = branch === undefined
    ? undefined
    : candidates.find((candidate) => path.basename(candidate.featureDirectory) === branch);
  if (branchMatch !== undefined) {
    return branchMatch.featureDirectory;
  }

  return candidates
    .slice()
    .sort((left, right) => right.mtimeMs - left.mtimeMs || right.index - left.index)[0]
    ?.featureDirectory;
};

const readFeatureJson = async (repositoryPath: string): Promise<{ raw?: string; value: FeatureJson }> => {
  const manifestPath = path.join(repositoryPath, '.specify', 'feature.json');
  try {
    const raw = await readFile(manifestPath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    return {
      raw,
      value: typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
        ? parsed as FeatureJson
        : {}
    };
  } catch {
    return { value: {} };
  }
};

const changedPathsFromPorcelain = (statusPorcelain: string): string[] =>
  statusPorcelain
    .split(/\r?\n/)
    .map(parsePorcelainPath)
    .filter((changedPath): changedPath is string => changedPath !== undefined);

const readChangedSpecPaths = async (
  repositoryPath: string,
  runGit: typeof defaultRunGit,
  logger: Pick<MainLogger, 'warn'>,
  baseRef?: string
): Promise<string[]> => {
  const changed = new Set<string>();

  const addChangedPath = async (changedPath: string): Promise<void> => {
    const normalized = normalizeGitPath(changedPath);
    if (featureDirFromSpecPath(normalized) !== undefined) {
      changed.add(normalized);
      return;
    }

    const directoryMatch = /^specs\/([^/]+)\/?$/.exec(normalized);
    if (directoryMatch === null) {
      changed.add(normalized);
      return;
    }

    const specPath = `specs/${directoryMatch[1]}/spec.md`;
    try {
      await stat(path.join(repositoryPath, specPath));
      changed.add(specPath);
    } catch {
      changed.add(normalized);
    }
  };

  try {
    const status = await runGit(repositoryPath, ['status', '--porcelain', '--', 'specs']);
    for (const changedPath of changedPathsFromPorcelain(status)) {
      await addChangedPath(changedPath);
    }
  } catch (error) {
    logger.warn({ repositoryPath, error }, 'feature.json reconciliation could not inspect git status');
  }

  if (baseRef !== undefined && baseRef.trim().length > 0) {
    try {
      const diff = await runGit(repositoryPath, ['diff', '--name-only', baseRef, 'HEAD', '--', 'specs']);
      for (const changedPath of diff.split(/\r?\n/).filter(Boolean)) {
        await addChangedPath(changedPath);
      }
    } catch (error) {
      logger.warn({ repositoryPath, baseRef, error }, 'feature.json reconciliation could not inspect git diff');
    }
  }

  return [...changed];
};

const withMtimes = async (
  repositoryPath: string,
  changedPaths: string[]
): Promise<ChangedSpecifySpecPath[]> =>
  Promise.all(
    changedPaths.map(async (changedPath) => {
      try {
        const fileStat = await stat(path.join(repositoryPath, changedPath));
        return { path: changedPath, mtimeMs: fileStat.mtimeMs };
      } catch {
        return { path: changedPath };
      }
    })
  );

export const reconcileSpecifyFeatureJson = async (
  request: ReconcileSpecifyFeatureJsonRequest
): Promise<ReconcileSpecifyFeatureJsonResult> => {
  const runGit = request.runGit ?? defaultRunGit;
  const manifestPath = path.join(request.repositoryPath, '.specify', 'feature.json');
  const manifest = await readFeatureJson(request.repositoryPath);
  const previousFeatureDirectory = typeof manifest.value.feature_directory === 'string'
    ? manifest.value.feature_directory
    : undefined;
  const changedPaths = await withMtimes(
    request.repositoryPath,
    await readChangedSpecPaths(request.repositoryPath, runGit, request.logger, request.baseRef)
  );
  const featureDirectory = decideSpecifyFeatureDirectory({
    inheritedFeatureDirectory: previousFeatureDirectory,
    changedPaths,
    branchName: request.branchName
  });

  if (featureDirectory === undefined) {
    request.logger.info({ repositoryPath: request.repositoryPath }, 'feature.json reconciliation no feature directory discovered');
    return { previousFeatureDirectory, changed: false };
  }

  if (featureDirectory === previousFeatureDirectory) {
    request.logger.info(
      { repositoryPath: request.repositoryPath, featureDirectory },
      'feature.json reconciliation already current'
    );
    return { featureDirectory, previousFeatureDirectory, changed: false };
  }

  const nextManifest = {
    ...manifest.value,
    feature_directory: featureDirectory
  };
  await safeWrite(
    {
      targetPath: manifestPath,
      contents: `${JSON.stringify(nextManifest, null, 2)}\n`,
      stepContext: { stepId: 'specify', label: 'feature.json reconciliation' }
    },
    request.logger
  );
  request.logger.info(
    { repositoryPath: request.repositoryPath, previousFeatureDirectory, featureDirectory },
    'feature.json reconciled to specify-written directory'
  );

  return { featureDirectory, previousFeatureDirectory, changed: true };
};
