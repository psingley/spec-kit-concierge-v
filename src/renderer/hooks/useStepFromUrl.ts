import { useSearchParams } from 'react-router';
import { useAppSelector } from './store';
import { selectWorkspaceActiveStep, selectWorkspaceMaxReachedStep } from '../slices/workspace.selectors';
import type { StepName } from '../slices/steps';
import { stepOrder } from '../slices/steps';

const validSteps: ReadonlySet<string> = new Set(stepOrder);

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
