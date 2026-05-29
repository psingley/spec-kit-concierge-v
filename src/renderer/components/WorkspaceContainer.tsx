import React from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/store';
import type { StepName, StepState } from '../slices/steps';
import { workspaceStepViewed } from '../slices/workspace';
import { selectWorkspaceBranch, selectWorkspaceSelectedRepo, selectWorkspaceViewedStep } from '../slices/workspace.selectors';
import { selectUiShowAbout, selectUiShowRequest } from '../slices/ui.selectors';
import { modalClosed } from '../slices/ui';
import { ActivityPillContainer } from './ActivityPillContainer';
import { ActivityRailContainer } from './ActivityRailContainer';
import { AboutModal } from './AboutModal';
import { CustomizeModalContainer } from './CustomizeModalContainer';
import { RequestModal } from './RequestModal';
import { ClarifyStepContainer } from './ClarifyStepContainer';
import { PassiveStepContainer } from './PassiveStepContainer';
import { SpecifyStepContainer } from './SpecifyStepContainer';
import { Stepper, stepOrder } from './Stepper';
import { TitlebarContainer } from './TitlebarContainer';
import { selectSessionPassiveSteps, selectSessionSpecMarkdown } from '../slices/session.selectors';

export const WorkspaceContainer = (): React.ReactElement => {
  const dispatch = useAppDispatch();
  const viewedStep = useAppSelector(selectWorkspaceViewedStep);
  const specMarkdown = useAppSelector(selectSessionSpecMarkdown);
  const passiveSteps = useAppSelector(selectSessionPassiveSteps);
  const repo = useAppSelector(selectWorkspaceSelectedRepo);
  const branch = useAppSelector(selectWorkspaceBranch);
  const states = stepOrder.reduce((acc, step) => {
    acc[step] = step === 'specify'
      ? (specMarkdown.length > 0 ? 'complete' : 'pending')
      : step === 'clarify' && specMarkdown.length > 0
        ? 'pending'
        : step === 'plan' || step === 'tasks' || step === 'analyze'
          ? (passiveSteps[step].commitSha !== null ? 'complete' : passiveSteps[step].running ? 'pending' : 'not_available')
          : 'not_available';
    return acc;
  }, {} as Record<StepName, StepState>);
  return (
    <div className="workspace">
      <TitlebarContainer />
      <Stepper states={states} viewedStep={viewedStep} onSelectStep={(step) => dispatch(workspaceStepViewed(step))} />
      <main className="workspace-main">
        {viewedStep === 'specify' ? <SpecifyStepContainer /> : viewedStep === 'clarify' ? <ClarifyStepContainer /> : viewedStep === 'plan' || viewedStep === 'tasks' || viewedStep === 'analyze' ? <PassiveStepContainer step={viewedStep} /> : <section className="placeholder">Review is not implemented in Run 8.</section>}
      </main>
      <ActivityRailContainer />
      <ActivityPillContainer />
      <CustomizeModalContainer />
      <AboutModal open={useAppSelector(selectUiShowAbout)} onClose={() => dispatch(modalClosed('showAbout'))} repo={repo?.name ?? 'No repo'} branch={branch ?? 'No branch'} />
      <RequestModal open={useAppSelector(selectUiShowRequest)} onClose={() => dispatch(modalClosed('showRequest'))} />
    </div>
  );
};
