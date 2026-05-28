import React from 'react';
import type { AuthProviderStatus } from '../slices/auth';
import { Ico } from './Icons';

export type SignInScreenProps = {
  github: AuthProviderStatus;
  copilot: AuthProviderStatus;
  atlassian: AuthProviderStatus;
  onGitHub: () => void;
  onCopilot: () => void;
  onAtlassian: () => void;
};

const label = (status: AuthProviderStatus): string => (status === 'ok' ? 'Connected' : status === 'starting' ? 'Connecting...' : status === 'locked' ? 'Locked' : 'Connect');

export const SignInScreen = ({ github, copilot, atlassian, onGitHub, onCopilot, onAtlassian }: SignInScreenProps): React.ReactElement => (
  <main className="screen signin">
    <section className="hero-card" aria-labelledby="signin-heading">
      <p className="eyebrow">Spec-kit Concierge</p>
      <h1 id="signin-heading">Connect your tools</h1>
      <p>GitHub and Copilot unlock Specify. Atlassian remains visible for the Run 11 JIRA path.</p>
      <div className="auth-list">
        <button type="button" className="auth-row" onClick={onGitHub} disabled={github === 'starting'}>
          <Ico.Github /><span>GitHub CLI</span><strong>{label(github)}</strong>
        </button>
        <button type="button" className="auth-row" onClick={onCopilot} disabled={github !== 'ok' || copilot === 'starting'}>
          <Ico.Copilot /><span>Copilot CLI</span><strong>{github === 'ok' ? label(copilot) : 'Locked until GitHub'}</strong>
        </button>
        <button type="button" className="auth-row" onClick={onAtlassian} disabled={atlassian === 'starting'}>
          <Ico.Atlassian /><span>Atlassian (coming in Run 11)</span><strong>{label(atlassian)}</strong>
        </button>
      </div>
    </section>
  </main>
);
