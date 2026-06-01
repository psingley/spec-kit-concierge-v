import React from 'react';
import { api } from '../api';
import { useAppDispatch, useAppSelector } from '../hooks/store';
import { selectAuthAtlassianStatus, selectAuthCopilotStatus, selectAuthGithubStatus, selectAuthIdentity } from '../slices/auth.selectors';
import { preferencesUpdated } from '../slices/preferences';
import { selectPreferencesSelectedCopilotModel } from '../slices/preferences.selectors';
import { selectSessionAnyStepRunning } from '../slices/session.selectors';
import { modalOpened } from '../slices/ui';
import { selectWorkspaceBranch, selectWorkspaceSelectedRepo } from '../slices/workspace.selectors';
import { ActivityPillContainer } from './ActivityPillContainer';
import { Titlebar } from './Titlebar';

export const TitlebarContainer = (): React.ReactElement => {
  const dispatch = useAppDispatch();
  const stepRunning = useAppSelector(selectSessionAnyStepRunning);
  const selectedModel = useAppSelector(selectPreferencesSelectedCopilotModel);
  const { data: capabilities } = api.endpoints.getBoundCLICapabilities.useQuery();
  const models = capabilities?.models.available ?? [];
  const model = selectedModel ?? capabilities?.models.current ?? models[0]?.id ?? null;
  return (
    <Titlebar
      repo={useAppSelector(selectWorkspaceSelectedRepo)}
      branch={useAppSelector(selectWorkspaceBranch)}
      identity={useAppSelector(selectAuthIdentity)}
      github={useAppSelector(selectAuthGithubStatus)}
      copilot={useAppSelector(selectAuthCopilotStatus)}
      atlassian={useAppSelector(selectAuthAtlassianStatus)}
      model={model}
      models={models}
      modelDisabled={stepRunning}
      onCustomize={() => dispatch(modalOpened('showCustomize'))}
      onAbout={() => dispatch(modalOpened('showAbout'))}
      onRequest={() => dispatch(modalOpened('showRequest'))}
      onModelSelect={(modelId) => dispatch(preferencesUpdated({ selectedCopilotModel: modelId }))}
      activityPill={<ActivityPillContainer />}
    />
  );
};
