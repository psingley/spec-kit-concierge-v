import type { Dirent } from 'node:fs';
import { mkdir, readdir, rename, stat } from 'node:fs/promises';
import path from 'node:path';
import { STEP_ARTIFACT_MANIFEST } from '../../hooks/manifest';
import { commitCandidate, factoryEscape, readRequiredArtifact, validateMarkdownContents, validateRequiredMarkdown } from './factoryUtils';
import type { StepContractContext, StepContractResult } from './types';

type StrandedTasksCandidate = {
  featureDir: string;
  artifactPath: string;
  relativeArtifactPath: string;
  mtimeMs: number;
};

type RecoveryResult =
  | { recovered: true }
  | { recovered: false; strandedArtifacts: string[] };

const tasksHostilePattern = /bad-task|MALFORMED/i;
const tasksPartialPattern = /partial/i;

const expectedTasksPath = (featureDir: string, context: StepContractContext): string => {
  if (context.repositoryPath === undefined) {
    return 'tasks.md';
  }
  const featureRel = path.relative(context.repositoryPath, featureDir);
  return featureRel.length > 0 ? path.join(featureRel, 'tasks.md') : 'tasks.md';
};

const findSiblingTasksCandidates = async (
  featureDir: string,
  context: StepContractContext
): Promise<StrandedTasksCandidate[]> => {
  if (context.repositoryPath === undefined) {
    return [];
  }
  const specsDir = path.join(context.repositoryPath, 'specs');
  let entries: Dirent[];
  try {
    entries = await readdir(specsDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const candidates = await Promise.all(entries
    .filter((entry) => entry.isDirectory())
    .map(async (entry): Promise<StrandedTasksCandidate | undefined> => {
      const candidateFeatureDir = path.join(specsDir, entry.name);
      if (path.resolve(candidateFeatureDir) === path.resolve(featureDir)) {
        return undefined;
      }
      const artifactPath = path.join(candidateFeatureDir, 'tasks.md');
      try {
        const artifactStat = await stat(artifactPath);
        if (!artifactStat.isFile()) {
          return undefined;
        }
        return {
          featureDir: candidateFeatureDir,
          artifactPath,
          relativeArtifactPath: path.relative(context.repositoryPath ?? '', artifactPath),
          mtimeMs: artifactStat.mtimeMs
        };
      } catch {
        return undefined;
      }
    }));

  return candidates
    .filter((candidate): candidate is StrandedTasksCandidate => candidate !== undefined)
    .sort((left, right) => right.mtimeMs - left.mtimeMs);
};

const recoverWrongDirTasks = async (
  featureDir: string,
  context: StepContractContext
): Promise<RecoveryResult> => {
  const candidates = await findSiblingTasksCandidates(featureDir, context);
  const strandedArtifacts = candidates.map((candidate) => candidate.relativeArtifactPath);

  for (const candidate of candidates) {
    const invalid = await validateRequiredMarkdown('tasks', candidate.featureDir, tasksHostilePattern, tasksPartialPattern);
    if (invalid !== undefined) {
      continue;
    }
    await mkdir(featureDir, { recursive: true });
    await rename(candidate.artifactPath, path.join(featureDir, 'tasks.md'));
    return { recovered: true };
  }

  return { recovered: false, strandedArtifacts };
};

export const validateTasksArtifacts = async (
  featureDir: string,
  context: StepContractContext = {}
): Promise<StepContractResult> => {
  const existingTasks = await readRequiredArtifact(featureDir, 'tasks.md');
  if (existingTasks !== undefined) {
    const invalid = validateMarkdownContents(existingTasks, tasksHostilePattern, tasksPartialPattern);
    if (invalid !== undefined) {
      return invalid;
    }
    return { ok: true, commit: commitCandidate('tasks', [...STEP_ARTIFACT_MANIFEST.tasks.requiredFiles], context) };
  }

  const recovery = await recoverWrongDirTasks(featureDir, context);
  if (!recovery.recovered) {
    const expected = expectedTasksPath(featureDir, context);
    const failureReason = recovery.strandedArtifacts.length > 0
      ? `factory-rejected: expected ${expected}; found stranded invalid tasks.md at ${recovery.strandedArtifacts.join(', ')}`
      : `factory-rejected: expected ${expected}`;
    return factoryEscape('factory-rejected', {
      failureReason,
      strandedArtifacts: recovery.strandedArtifacts
    });
  }

  return { ok: true, commit: commitCandidate('tasks', [...STEP_ARTIFACT_MANIFEST.tasks.requiredFiles], context) };
};
