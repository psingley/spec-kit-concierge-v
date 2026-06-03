import React, { useState } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';
import { api } from '../api';
import { jiraApi, prepareJiraCredentialSave } from '../api/jira.endpoint';
import { repositoriesApi } from '../api/repositories.endpoint';
import { useAppDispatch, useAppSelector } from '../hooks/store';
import { selectAuthAtlassianStatus, selectAuthCopilotStatus, selectAuthGithubStatus, selectAuthIdentity } from '../slices/auth.selectors';
import { DEFAULT_COPILOT_MODEL_ID, preferencesUpdated } from '../slices/preferences';
import { selectPreferencesSelectedCopilotModel } from '../slices/preferences.selectors';
import { selectJiraAuthState, selectJiraBoard } from '../slices/jira.selectors';
import { selectSessionAnyStepRunning } from '../slices/session.selectors';
import { modalOpened } from '../slices/ui';
import { selectWorkspaceBranch, selectWorkspaceSelectedRepo } from '../slices/workspace.selectors';
import { ActivityPillContainer } from './ActivityPillContainer';
import { Titlebar, type CopilotModelOption } from './Titlebar';

export const deriveEffectiveCopilotModel = (
  savedModel: string | null,
  currentModel: string | null | undefined,
  availableModels: CopilotModelOption[]
): string | null =>
  savedModel ??
  (availableModels.some((entry) => entry.id === DEFAULT_COPILOT_MODEL_ID) ? DEFAULT_COPILOT_MODEL_ID : undefined) ??
  currentModel ??
  availableModels[0]?.id ??
  null;

export const TitlebarContainer = (): React.ReactElement => {
  const dispatch = useAppDispatch();
  const [jiraSearch, setJiraSearch] = useState('');
  const stepRunning = useAppSelector(selectSessionAnyStepRunning);
  const selectedModel = useAppSelector(selectPreferencesSelectedCopilotModel);
  const selectedRepo = useAppSelector(selectWorkspaceSelectedRepo);
  const branch = useAppSelector(selectWorkspaceBranch);
  const identity = useAppSelector(selectAuthIdentity);
  const github = useAppSelector(selectAuthGithubStatus);
  const copilot = useAppSelector(selectAuthCopilotStatus);
  const atlassian = useAppSelector(selectAuthAtlassianStatus);
  const jiraAuthState = useAppSelector(selectJiraAuthState);
  const jiraBoard = useAppSelector(selectJiraBoard);
  const { data: capabilities } = api.endpoints.getBoundCLICapabilities.useQuery();
  const models = capabilities?.models.available ?? [];
  const model = deriveEffectiveCopilotModel(selectedModel, capabilities?.models.current, models);
  const repos = repositoriesApi.useListReposQuery();
  const activeRepositoryPath = branch === null ? null : selectedRepo?.path ?? null;
  jiraApi.useGetAuthStateQuery();
  jiraApi.useGetBoardQuery(activeRepositoryPath === null ? skipToken : { repositoryPath: activeRepositoryPath });
  const suggestions = jiraApi.useSuggestBoardsQuery(undefined, { skip: jiraAuthState.state !== 'warm' });
  const projectResults = jiraApi.useSearchProjectsQuery({ query: jiraSearch }, { skip: jiraSearch.trim() === '' || jiraAuthState.state !== 'warm' });
  const [saveCredential] = jiraApi.useSaveCredentialMutation();
  const [clearCredential] = jiraApi.useClearCredentialMutation();
  const [setBoard] = jiraApi.useSetBoardMutation();
  return (
    <Titlebar
      repo={selectedRepo}
      branch={branch}
      identity={identity}
      github={github}
      copilot={copilot}
      atlassian={atlassian}
      model={model}
      models={models}
      repositories={repos.data?.repositories ?? []}
      repositoriesError={repos.isError}
      jiraAuthState={jiraAuthState}
      jiraBoard={jiraBoard}
      jiraBoardSuggestions={suggestions.data ?? []}
      jiraProjectResults={projectResults.data ?? []}
      jiraProjectSearchText={jiraSearch}
      modelDisabled={stepRunning}
      onCustomize={() => dispatch(modalOpened('showCustomize'))}
      onAbout={() => dispatch(modalOpened('showAbout'))}
      onRequest={() => dispatch(modalOpened('showRequest'))}
      onModelSelect={(modelId) => dispatch(preferencesUpdated({ selectedCopilotModel: modelId }))}
      onSetJiraBoard={(projectKey) => {
        if (activeRepositoryPath !== null) void setBoard({ repositoryPath: activeRepositoryPath, projectKey });
      }}
      onSearchJiraProjects={setJiraSearch}
      onSaveJiraCredential={(value) => saveCredential(prepareJiraCredentialSave(value)).unwrap()}
      onClearJiraCredential={() => {
        if (window.confirm('Clear the stored JIRA credential?')) void clearCredential();
      }}
      activityPill={<ActivityPillContainer />}
    />
  );
};
