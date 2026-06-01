import React from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/store';
import { useStepFromUrl } from '../hooks/useStepFromUrl';
import type { StepName, StepState } from '../slices/steps';
import { stepOrder } from '../slices/steps';
import { workspaceStepViewed } from '../slices/workspace';
import { selectUiShowActivity } from '../slices/ui.selectors';
import { ActivityRailContainer } from './ActivityRailContainer';
import { ClarifyStepContainer } from './ClarifyStepContainer';
import { ModalHost } from './ModalHost';
import { PassiveStepContainer } from './PassiveStepContainer';
import { ReviewStepContainer } from './ReviewStepContainer';
import { SpecifyStepContainer } from './SpecifyStepContainer';
import { Stepper } from './Stepper';
import { selectSessionClarifyCompletion, selectSessionPassiveSteps, selectSessionSpecMarkdown } from '../slices/session.selectors';
import { selectPreferencesActivitySide } from '../slices/preferences.selectors';
import { selectStepEntities } from '../slices/steps.selectors';

export const WorkspaceContainer = (): React.ReactElement => {
  const dispatch = useAppDispatch();
  const viewedStep = useStepFromUrl();
  const specMarkdown = useAppSelector(selectSessionSpecMarkdown);
  const clarifyCompletion = useAppSelector(selectSessionClarifyCompletion);
  const passiveSteps = useAppSelector(selectSessionPassiveSteps);
  const restoredStepEntities = useAppSelector(selectStepEntities);
  const showActivity = useAppSelector(selectUiShowActivity);
  const activitySide = useAppSelector(selectPreferencesActivitySide);
  const bodyClassName = `workspace-body ${!showActivity || activitySide === 'hidden' ? 'no-activity' : ''}${showActivity && activitySide === 'left' ? ' activity-left' : ''}`;
  const clarifyComplete = clarifyCompletion !== null;
  const sessionDerivedStates = stepOrder.reduce((acc, step) => {
    acc[step] = step === 'specify'
      ? (specMarkdown.length > 0 ? 'complete' : 'pending')
      : step === 'clarify' && specMarkdown.length > 0
        ? (clarifyComplete ? 'complete' : 'pending')
        : step === 'plan'
          ? (passiveSteps.plan.commitSha !== null ? 'complete' : passiveSteps.plan.running || clarifyComplete ? 'pending' : 'not_available')
          : step === 'tasks'
            ? (passiveSteps.tasks.commitSha !== null ? 'complete' : passiveSteps.tasks.running || passiveSteps.plan.commitSha !== null ? 'pending' : 'not_available')
            : step === 'analyze'
              ? (passiveSteps.analyze.commitSha !== null ? 'complete' : passiveSteps.analyze.running || passiveSteps.tasks.commitSha !== null ? 'pending' : 'not_available')
              : step === 'review' && passiveSteps.analyze.commitSha !== null
                ? 'pending'
              : 'not_available';
    return acc;
  }, {} as Record<StepName, StepState>);
  const hasFullRestoredSnapshot = stepOrder.every((step) => restoredStepEntities[step] !== undefined);
  const states = hasFullRestoredSnapshot
    ? stepOrder.reduce((acc, step) => {
      acc[step] = restoredStepEntities[step]?.status ?? 'not_available';
      return acc;
    }, {} as Record<StepName, StepState>)
    : sessionDerivedStates;
  return (
    <div className="workspace">
      <div className={bodyClassName}>
        {showActivity && activitySide === 'left' ? <ActivityRailContainer /> : null}
        <main className="workspace-main">
          <Stepper states={states} viewedStep={viewedStep} onSelectStep={(step) => dispatch(workspaceStepViewed(step))} />
          <div className="workspace-step">
            {viewedStep === 'specify' ? <SpecifyStepContainer /> : viewedStep === 'clarify' ? <ClarifyStepContainer /> : viewedStep === 'plan' || viewedStep === 'tasks' || viewedStep === 'analyze' ? <PassiveStepContainer step={viewedStep} /> : <ReviewStepContainer />}
          </div>
        </main>
        {showActivity && activitySide !== 'left' && activitySide !== 'hidden' ? <ActivityRailContainer /> : null}
      </div>
      <ModalHost />
    </div>
  );
};
