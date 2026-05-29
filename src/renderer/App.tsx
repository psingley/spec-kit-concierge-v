import React from 'react';
import { RouterProvider } from 'react-router';
import type { createMemoryRouter } from 'react-router';
import { useAppSelector } from './hooks/store';
import { selectAuthGateOpen } from './slices/auth.selectors';
import { selectWorkspaceBranch, selectWorkspaceSelectedRepo } from './slices/workspace.selectors';
import { RepoBrowseScreenContainer } from './components/RepoBrowseScreenContainer';
import { SignInScreenContainer } from './components/SignInScreenContainer';
import { TitlebarContainer } from './components/TitlebarContainer';
import { WorkspaceContainer } from './components/WorkspaceContainer';
import { ModalHost } from './components/ModalHost';

type AppProps = {
  router: ReturnType<typeof createMemoryRouter>;
};

export const App = ({ router }: AppProps): React.ReactElement => {
  return <RouterProvider router={router} />;
export const App = (): React.ReactElement => {
  const gateOpen = useAppSelector(selectAuthGateOpen);
  const repo = useAppSelector(selectWorkspaceSelectedRepo);
  const branch = useAppSelector(selectWorkspaceBranch);
  if (!gateOpen) {
    return <SignInScreenContainer />;
  }
  if (repo === null || branch === null) {
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
