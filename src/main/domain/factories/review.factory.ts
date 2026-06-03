import { commitCandidate, readRequiredArtifact, validateMarkdownContents } from './factoryUtils';
import type { StepContractContext, StepContractResult } from './types';

export const validateReviewArtifacts = async (
  featureDir: string,
  context: StepContractContext = {}
): Promise<StepContractResult> => {
  const review = await readRequiredArtifact(featureDir, 'review.md');
  if (review !== undefined) {
    const invalid = validateMarkdownContents(review);
    if (invalid !== undefined) {
      return invalid;
    }
  }

  return { ok: true, commit: commitCandidate('review', [], context) };
};
