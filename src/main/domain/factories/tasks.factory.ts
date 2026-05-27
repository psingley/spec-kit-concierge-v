import { STEP_ARTIFACT_MANIFEST } from '../../hooks/manifest';
import { commitCandidate, validateRequiredMarkdown } from './factoryUtils';
import type { StepContractContext, StepContractResult } from './types';

export const validateTasksArtifacts = async (
  featureDir: string,
  context: StepContractContext = {}
): Promise<StepContractResult> => {
  const invalid = await validateRequiredMarkdown('tasks', featureDir, /bad-task|MALFORMED/i, /partial/i);
  if (invalid !== undefined) {
    return invalid;
  }

  return { ok: true, commit: commitCandidate('tasks', [...STEP_ARTIFACT_MANIFEST.tasks.requiredFiles], context) };
};
