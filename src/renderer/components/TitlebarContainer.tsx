import React from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/store';
import { selectAuthAtlassianStatus, selectAuthCopilotStatus, selectAuthGithubStatus, selectAuthIdentity } from '../slices/auth.selectors';
import { selectPreferencesSelectedCopilotModel } from '../slices/preferences.selectors';
import { selectSessionSpecMarkdown, selectSessionSpecifyRunning } from '../slices/session.selectors';
import { modalOpened } from '../slices/ui';
import { selectWorkspaceBranch, selectWorkspaceSelectedRepo } from '../slices/workspace.selectors';
import { Titlebar } from './Titlebar';

export const TitlebarContainer = (): React.ReactElement => {
  const dispatch = useAppDispatch();
  const specifyRunning = useAppSelector(selectSessionSpecifyRunning);
  const specMarkdown = useAppSelector(selectSessionSpecMarkdown);
  return (
    <Titlebar
      repo={useAppSelector(selectWorkspaceSelectedRepo)}
      branch={useAppSelector(selectWorkspaceBranch)}
      identity={useAppSelector(selectAuthIdentity)}
      github={useAppSelector(selectAuthGithubStatus)}
      copilot={useAppSelector(selectAuthCopilotStatus)}
      atlassian={useAppSelector(selectAuthAtlassianStatus)}
      model={useAppSelector(selectPreferencesSelectedCopilotModel)}
      showDraftBranch={specifyRunning || specMarkdown.trim().length > 0}
      onCustomize={() => dispatch(modalOpened('showCustomize'))}
      onAbout={() => dispatch(modalOpened('showAbout'))}
      onRequest={() => dispatch(modalOpened('showRequest'))}
    />
  );
};
