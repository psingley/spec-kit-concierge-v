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

const actionLabel = (status: AuthProviderStatus, starting = 'Signing in...'): string => (status === 'starting' ? starting : 'Sign in');

const atlassianSubtitle = (status: AuthProviderStatus): string => {
  if (status === 'ok') return 'Ready through GitHub Copilot CLI';
  if (status === 'unknown') return 'Configured; reauthorize in Copilot';
  if (status === 'error') return 'Configuration needs attention';
  return 'Required before JIRA submission';
};

export const SignInScreen = ({ github, copilot, atlassian, onGitHub, onCopilot, onAtlassian }: SignInScreenProps): React.ReactElement => (
  <main className="screen signin signin-stage">
    <section className="signin-card" aria-labelledby="signin-heading">
      <div className="signin-mark" data-vd-role="signin-mark" aria-hidden="true">
        <span className="ring" />
        <span className="ring" />
        <span className="ring" />
        <span className="dot" />
      </div>

      <h1 id="signin-heading" className="signin-h">Spec-kit Concierge</h1>
      <p className="signin-sub">Spec-driven feature work, with Copilot CLI in the loop. Sign in to load your organization.</p>

      <div className="signin-rows">
        <div className={`signin-row ${github === 'ok' ? 'is-on' : ''}`}>
          <div className="signin-row-icon"><Ico.Github size={16} /></div>
          <div className="signin-row-main">
            <div className="signin-row-title">GitHub CLI</div>
            <div className="signin-row-sub">{github === 'ok' ? 'Signed in as a.kim' : 'Required to discover org repositories'}</div>
          </div>
          {github === 'ok' ? <span className="signin-row-status"><span className="signin-dot ok" />Connected</span> : (
            <button type="button" className="btn primary" data-vd-role="signin-provider-action" onClick={onGitHub} disabled={github === 'starting'}>
              <Ico.Github size={12} />{actionLabel(github)}
            </button>
          )}
        </div>

        <div className={`signin-row ${copilot === 'ok' ? 'is-on ' : ''}${github !== 'ok' ? 'is-disabled' : ''}`}>
          <div className="signin-row-icon"><Ico.Copilot size={16} /></div>
          <div className="signin-row-main">
            <div className="signin-row-title">GitHub Copilot CLI</div>
            <div className="signin-row-sub">{copilot === 'ok' ? 'Active subscription' : github !== 'ok' ? 'Requires GitHub CLI first' : 'Drives the spec-kit workflow'}</div>
          </div>
          {copilot === 'ok' ? <span className="signin-row-status"><span className="signin-dot ok" />Connected</span> : (
            <button type="button" className="btn primary" data-vd-role="signin-provider-action" onClick={onCopilot} disabled={github !== 'ok' || copilot === 'starting'}>
              <Ico.Copilot size={12} />{actionLabel(copilot)}
            </button>
          )}
        </div>

        <div className={`signin-row ${atlassian === 'ok' ? 'is-on' : ''}`}>
          <div className="signin-row-icon"><Ico.Atlassian size={15} /></div>
          <div className="signin-row-main">
            <div className="signin-row-title">Atlassian MCP</div>
            <div className="signin-row-sub">{atlassianSubtitle(atlassian)}</div>
          </div>
          {atlassian === 'ok' ? <span className="signin-row-status"><span className="signin-dot ok" />Connected</span> : (
            <button type="button" className="btn primary" data-vd-role="signin-provider-action" onClick={onAtlassian} disabled={atlassian === 'starting'}>
              <Ico.Atlassian size={12} />{atlassian === 'unknown' ? 'Open Copilot' : actionLabel(atlassian, 'Configuring...')}
            </button>
          )}
        </div>
      </div>

      <div className="signin-foot"><span>Trouble signing in? Use the gear menu to report a bug.</span></div>
    </section>
  </main>
);
