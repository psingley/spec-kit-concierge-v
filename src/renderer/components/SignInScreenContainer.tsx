import React from 'react';
import { authApi } from '../api/auth.endpoint';
import { useAppSelector } from '../hooks/store';
import { selectAuthAtlassianStatus, selectAuthCopilotStatus, selectAuthGithubStatus, selectAuthIdentity } from '../slices/auth.selectors';
import { SignInScreen } from './SignInScreen';

export const SignInScreenContainer = (): React.ReactElement => {
  const [loginGitHub] = authApi.useLoginGitHubMutation();
  const [loginCopilot] = authApi.useLoginCopilotMutation();
  const [loginAtlassianStub] = authApi.useLoginAtlassianStubMutation();
  return (
    <SignInScreen
      github={useAppSelector(selectAuthGithubStatus)}
      copilot={useAppSelector(selectAuthCopilotStatus)}
      atlassian={useAppSelector(selectAuthAtlassianStatus)}
      identity={useAppSelector(selectAuthIdentity)}
      onGitHub={() => void loginGitHub()}
      onCopilot={() => void loginCopilot()}
      onAtlassian={() => void loginAtlassianStub()}
    />
  );
};
