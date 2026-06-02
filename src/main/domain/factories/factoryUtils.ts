import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { STEP_ARTIFACT_MANIFEST, type StepName } from '../../hooks/manifest';
import type { ConciergeStepCommit, StepContractContext, StepContractResult } from './types';
import type { StepEscapeHatchReason } from '../../hooks/types';

type FactoryEscapeDetails = {
  failureReason?: string;
  strandedArtifacts?: string[];
};

export const factoryEscape = (
  escapeHatchReason: StepEscapeHatchReason = 'factory-rejected',
  details: FactoryEscapeDetails = {}
): StepContractResult => ({
  ok: false,
  kind: 'escape-hatch',
  escapeHatchReason,
  ...details
});

const frontmatterPattern = /^---\r?\n([\s\S]*?)\r?\n---/;

const rejectFrontmatterKeys = (contents: string): boolean => {
  const match = frontmatterPattern.exec(contents);
  if (match === null) {
    return false;
  }

  const body = match[1] ?? '';
  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .some((line) => /^[A-Za-z0-9_-]+\s*:/.test(line));
};

export const readRequiredArtifact = async (
  featureDir: string,
  file: string
): Promise<string | undefined> => {
  try {
    return await readFile(path.join(featureDir, file), 'utf8');
  } catch {
    return undefined;
  }
};

export const validateMarkdownContents = (
  contents: string,
  hostilePattern: RegExp,
  partialPattern?: RegExp
): StepContractResult | undefined => {
  if (contents.trim().length === 0) {
    return factoryEscape();
  }
  if (rejectFrontmatterKeys(contents) || hostilePattern.test(contents)) {
    return factoryEscape();
  }
  if (partialPattern?.test(contents)) {
    return factoryEscape();
  }
  return undefined;
};

export const validateRequiredMarkdown = async (
  step: StepName,
  featureDir: string,
  hostilePattern: RegExp,
  partialPattern?: RegExp
): Promise<StepContractResult | undefined> => {
  const requiredFiles = STEP_ARTIFACT_MANIFEST[step].requiredFiles;
  for (const file of requiredFiles) {
    const contents = await readRequiredArtifact(featureDir, file);
    if (contents === undefined) {
      return factoryEscape();
    }
    const invalid = validateMarkdownContents(contents, hostilePattern, partialPattern);
    if (invalid !== undefined) return invalid;
  }

  return undefined;
};

export const discoverOptionalArtifacts = async (
  featureDir: string,
  step: StepName
): Promise<string[]> => {
  const discovered: string[] = [];

  for (const artifact of STEP_ARTIFACT_MANIFEST[step].optionalFiles) {
    if (artifact.endsWith('/')) {
      try {
        const entries = await readdir(path.join(featureDir, artifact), { withFileTypes: true });
        discovered.push(
          ...entries
            .filter((entry) => entry.isFile())
            .map((entry) => `${artifact}${entry.name}`)
            .sort()
        );
      } catch {
        // Optional directories are evidence discovery only; missing directories never gate completion.
      }
      continue;
    }

    const contents = await readRequiredArtifact(featureDir, artifact);
    if (contents !== undefined) {
      discovered.push(artifact);
    }
  }

  return discovered;
};

const featureDirRelativePrefix = (context: StepContractContext): string => {
  if (context.repositoryPath === undefined || context.featureDir === undefined) {
    return '';
  }

  return path.relative(context.repositoryPath, context.featureDir);
};

export const commitCandidate = (
  step: StepName,
  files: string[],
  context: StepContractContext = {}
): ConciergeStepCommit => {
  const planFiles =
    step === 'plan' && context.contextFilePath !== undefined ? [...files, context.contextFilePath] : files;

  // analyze remediation targets already arrive repo-root-relative (sourced from `git diff --name-only`),
  // so they must not be re-prefixed; every other step yields feature-dir basenames.
  const prefix = step === 'analyze' ? '' : featureDirRelativePrefix(context);
  const resolvedFiles =
    prefix.length === 0 ? planFiles : planFiles.map((file) => path.join(prefix, file));

  return {
    step,
    status: 'pass',
    files: [...resolvedFiles, ...(context.additionalCommitFiles ?? [])],
    message: `Concierge ${step} step`,
    ...(step === 'analyze' ? { allowEmptyCommit: true } : {})
  };
};
