import React from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/store';
import { selectAuthAtlassianStatus, selectAuthCopilotStatus, selectAuthGithubStatus } from '../slices/auth.selectors';
import { selectPreferencesSelectedCopilotModel } from '../slices/preferences.selectors';
import { modalOpened } from '../slices/ui';
import { selectWorkspaceBranch, selectWorkspaceSelectedRepo } from '../slices/workspace.selectors';
import { Titlebar } from './Titlebar';

export const TitlebarContainer = (): React.ReactElement => {
  const dispatch = useAppDispatch();
  return (
    <Titlebar
      repo={useAppSelector(selectWorkspaceSelectedRepo)}
      branch={useAppSelector(selectWorkspaceBranch)}
      github={useAppSelector(selectAuthGithubStatus)}
      copilot={useAppSelector(selectAuthCopilotStatus)}
      atlassian={useAppSelector(selectAuthAtlassianStatus)}
      model={useAppSelector(selectPreferencesSelectedCopilotModel)}
      onCustomize={() => dispatch(modalOpened('showCustomize'))}
      onAbout={() => dispatch(modalOpened('showAbout'))}
      onRequest={() => dispatch(modalOpened('showRequest'))}
    />
  );
};
