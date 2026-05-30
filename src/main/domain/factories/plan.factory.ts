import { STEP_ARTIFACT_MANIFEST } from '../../hooks/manifest';
import { commitCandidate, discoverOptionalArtifacts, validateRequiredMarkdown } from './factoryUtils';
import type { StepContractContext, StepContractResult } from './types';

export const validatePlanArtifacts = async (
  featureDir: string,
  context: StepContractContext = {}
): Promise<StepContractResult> => {
  const invalid = await validateRequiredMarkdown('plan', featureDir, /bad-plan|MALFORMED/i, /research\s*:\s*missing/i);
  if (invalid !== undefined) {
    return invalid;
  }

  const optionalFiles = await discoverOptionalArtifacts(featureDir, 'plan');

  return { ok: true, commit: commitCandidate('plan', [...STEP_ARTIFACT_MANIFEST.plan.requiredFiles, ...optionalFiles], context) };
};
