import path from 'node:path';
import { STEP_ARTIFACT_MANIFEST } from '../../hooks/manifest';
import { commitCandidate, factoryEscape } from './factoryUtils';
import type { StepContractContext, StepContractResult } from './types';

const allowedRemediationFiles: ReadonlySet<string> = new Set(STEP_ARTIFACT_MANIFEST.analyze.remediationFiles);

const isAllowedRemediationFile = (file: string): boolean =>
  allowedRemediationFiles.has(file.split('/').at(-1) ?? file) &&
  !file.includes('..') &&
  !path.isAbsolute(file) &&
  !path.win32.isAbsolute(file) &&
  file.trim() === file;

export const validateAnalyzeArtifacts = async (
  featureDir: string,
  context: StepContractContext = {}
): Promise<StepContractResult> => {
  void featureDir;
  const remediationFiles = [...(context.remediationFiles ?? [])];
  if (!remediationFiles.every(isAllowedRemediationFile)) {
    return factoryEscape();
  }

  return { ok: true, commit: commitCandidate('analyze', remediationFiles, context) };
};
