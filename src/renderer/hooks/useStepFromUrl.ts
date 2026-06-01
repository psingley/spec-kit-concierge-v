import { useSearchParams } from 'react-router';
import { useAppSelector } from './store';
import { selectWorkspaceActiveStep, selectWorkspaceMaxReachedStep } from '../slices/workspace.selectors';
import type { StepName } from '../slices/steps';
import { stepOrder } from '../slices/steps';

const validSteps: ReadonlySet<string> = new Set(stepOrder);

/**
 * Reads the `?step=` query parameter from the URL and validates it.
 * Falls back to `activeStep` from Redux if the param is missing, invalid,
 * or references a step beyond `maxReachedStep`.
 */
export const useStepFromUrl = (): StepName => {
  const [searchParams] = useSearchParams();
  const activeStep = useAppSelector(selectWorkspaceActiveStep);
  const maxReachedStep = useAppSelector(selectWorkspaceMaxReachedStep);

  const stepParam = searchParams.get('step');

  if (stepParam === null || !validSteps.has(stepParam)) {
    return activeStep;
  }

  const requestedIndex = stepOrder.indexOf(stepParam as StepName);
  const maxIndex = stepOrder.indexOf(maxReachedStep);

  if (requestedIndex > maxIndex) {
    return activeStep;
  }

  return stepParam as StepName;
};
