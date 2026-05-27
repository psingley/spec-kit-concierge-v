import { STEP_ARTIFACT_MANIFEST } from '../../hooks/manifest';
import { commitCandidate, validateRequiredMarkdown } from './factoryUtils';
import type { StepContractContext, StepContractResult } from './types';

export const validateAnalyzeArtifacts = async (
  featureDir: string,
  context: StepContractContext = {}
): Promise<StepContractResult> => {
  const invalid = await validateRequiredMarkdown('analyze', featureDir, /bad-analysis|MALFORMED/i, /partial/i);
  if (invalid !== undefined) {
    return invalid;
  }

  return { ok: true, commit: commitCandidate('analyze', [...STEP_ARTIFACT_MANIFEST.analyze.requiredFiles], context) };
};
