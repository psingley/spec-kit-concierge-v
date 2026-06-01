import React from 'react';
import { useAppSelector } from './hooks/store';
import { selectAuthGateOpen } from './slices/auth.selectors';
import { selectWorkspaceSelectedRepo } from './slices/workspace.selectors';
import { RepoBrowseScreenContainer } from './components/RepoBrowseScreenContainer';
import { SignInScreenContainer } from './components/SignInScreenContainer';
import { TitlebarContainer } from './components/TitlebarContainer';
import { WorkspaceContainer } from './components/WorkspaceContainer';
import { ModalHost } from './components/ModalHost';

export const App = (): React.ReactElement => {
  const gateOpen = useAppSelector(selectAuthGateOpen);
  const repo = useAppSelector(selectWorkspaceSelectedRepo);
  if (!gateOpen) {
    return <SignInScreenContainer />;
  }
  // ADR-0016 detached-worktree model: branch=null is legitimate for a freshly-entered
  // session (spec-kit names the branch on first specify run via before_specify hook).
  // Only gate on repo=null; downstream components handle branch=null safely.
  if (repo === null) {
    return (
      <div className="workspace">
        <TitlebarContainer />
        <div className="workspace-body no-activity">
          <RepoBrowseScreenContainer />
        </div>
        <ModalHost />
      </div>
    );
  }
  return <WorkspaceContainer />;
};
