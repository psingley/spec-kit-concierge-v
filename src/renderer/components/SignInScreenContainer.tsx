import React from 'react';
import { authApi } from '../api/auth.endpoint';
import { jiraApi, prepareJiraCredentialSave } from '../api/jira.endpoint';
import { useAppSelector } from '../hooks/store';
import { selectAuthAtlassianStatus, selectAuthCopilotStatus, selectAuthGithubStatus, selectAuthIdentity } from '../slices/auth.selectors';
import { selectJiraAuthState } from '../slices/jira.selectors';
import { SignInScreen } from './SignInScreen';

export const SignInScreenContainer = (): React.ReactElement => {
  const [loginGitHub] = authApi.useLoginGitHubMutation();
  const [loginCopilot] = authApi.useLoginCopilotMutation();
  const [loginAtlassianStub] = authApi.useLoginAtlassianStubMutation();
  const [saveCredential] = jiraApi.useSaveCredentialMutation();
  jiraApi.useGetAuthStateQuery();
  return (
    <SignInScreen
      github={useAppSelector(selectAuthGithubStatus)}
      copilot={useAppSelector(selectAuthCopilotStatus)}
      atlassian={useAppSelector(selectAuthAtlassianStatus)}
      identity={useAppSelector(selectAuthIdentity)}
      jiraAuthState={useAppSelector(selectJiraAuthState)}
      onGitHub={() => void loginGitHub()}
      onCopilot={() => void loginCopilot()}
      onAtlassian={() => void loginAtlassianStub()}
      onSaveJiraCredential={(value) => saveCredential(prepareJiraCredentialSave(value)).unwrap()}
      onOpenJiraTokenPage={() => window.open('https://id.atlassian.com/manage-profile/security/api-tokens', '_blank', 'noopener,noreferrer')}
    />
  );
};
