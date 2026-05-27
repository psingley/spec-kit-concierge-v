import { commitCandidate, factoryEscape, readRequiredArtifact } from './factoryUtils';
import type { StepContractContext, StepContractResult } from './types';

export const validateReviewArtifacts = async (
  featureDir: string,
  context: StepContractContext = {}
): Promise<StepContractResult> => {
  const review = await readRequiredArtifact(featureDir, 'review.md');
  if (review !== undefined && (/MALFORMED|bad-review/i.test(review) || /^---\r?\n[\s\S]*?\r?\n---/.test(review))) {
    return factoryEscape();
  }

  return { ok: true, commit: commitCandidate('review', [], context) };
};
