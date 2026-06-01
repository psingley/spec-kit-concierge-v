import React from 'react';
import { useAppSelector } from './hooks/store';
import { selectAuthGateOpen } from './slices/auth.selectors';
import { selectSessionEntered } from './slices/workspace.selectors';
import { RepoBrowseScreenContainer } from './components/RepoBrowseScreenContainer';
import { SignInScreenContainer } from './components/SignInScreenContainer';
import { TitlebarContainer } from './components/TitlebarContainer';
import { WorkspaceContainer } from './components/WorkspaceContainer';
import { ModalHost } from './components/ModalHost';

export const App = (): React.ReactElement => {
  const gateOpen = useAppSelector(selectAuthGateOpen);
  const entered = useAppSelector(selectSessionEntered);
  if (!gateOpen) {
    return <SignInScreenContainer />;
  }
  // Render the workspace only after workspaceEntered is dispatched (Resume or
  // Start new session). Merely selecting a repo card (repositorySelected) is not
  // enough — the intermediate browse screen (prior-session list + Start CTA) must
  // stay visible until the user explicitly enters a session. This also supports
  // ADR-0016 detached-worktree sessions where branch=null is legitimate.
  if (!entered) {
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
