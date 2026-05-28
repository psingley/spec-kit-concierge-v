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
import { SpecifyStepContainer } from './SpecifyStepContainer';
import { Stepper, stepOrder } from './Stepper';
import { TitlebarContainer } from './TitlebarContainer';
import { selectSessionSpecMarkdown } from '../slices/session.selectors';

export const WorkspaceContainer = (): React.ReactElement => {
  const dispatch = useAppDispatch();
  const viewedStep = useAppSelector(selectWorkspaceViewedStep);
  const specMarkdown = useAppSelector(selectSessionSpecMarkdown);
  const repo = useAppSelector(selectWorkspaceSelectedRepo);
  const branch = useAppSelector(selectWorkspaceBranch);
  const states = stepOrder.reduce((acc, step) => {
    acc[step] = step === 'specify' ? (specMarkdown.length > 0 ? 'complete' : 'pending') : step === 'clarify' && specMarkdown.length > 0 ? 'pending' : 'not_available';
    return acc;
  }, {} as Record<StepName, StepState>);
  return (
    <div className="workspace">
      <TitlebarContainer />
      <Stepper states={states} viewedStep={viewedStep} onSelectStep={(step) => dispatch(workspaceStepViewed(step))} />
      <main className="workspace-main">
        {viewedStep === 'specify' ? <SpecifyStepContainer /> : <section className="placeholder">Run 7-9 placeholder for {viewedStep}. ArtifactViewer, TaskViewer, and JIRA sync are not implemented in Run 6.</section>}
      </main>
      <ActivityRailContainer />
      <ActivityPillContainer />
      <CustomizeModalContainer />
      <AboutModal open={useAppSelector(selectUiShowAbout)} onClose={() => dispatch(modalClosed('showAbout'))} repo={repo?.name ?? 'No repo'} branch={branch ?? 'No branch'} />
      <RequestModal open={useAppSelector(selectUiShowRequest)} onClose={() => dispatch(modalClosed('showRequest'))} />
    </div>
  );
};
