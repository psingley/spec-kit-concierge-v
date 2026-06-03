import { STEP_ARTIFACT_MANIFEST } from '../../hooks/manifest';
import { commitCandidate, factoryEscape, readRequiredArtifact, validateRequiredMarkdown } from './factoryUtils';
import type { StepContractContext, StepContractResult } from './types';

export const validateSpecifyArtifacts = async (
  featureDir: string,
  context: StepContractContext = {}
): Promise<StepContractResult> => {
  const invalid = await validateRequiredMarkdown('specify', featureDir);
  if (invalid !== undefined) {
    return invalid;
  }
  const spec = await readRequiredArtifact(featureDir, 'spec.md');
  if (spec === undefined || !/#/.test(spec)) {
    return factoryEscape();
  }

  return { ok: true, commit: commitCandidate('specify', [...STEP_ARTIFACT_MANIFEST.specify.requiredFiles], context) };
};
