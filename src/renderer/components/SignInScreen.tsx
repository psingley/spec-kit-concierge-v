import React, { useState } from 'react';
import type { AuthIdentity, AuthProviderStatus } from '../slices/auth';
import type { JiraAuthState, JiraCredentialSaveResponse } from '../slices/jira';
import { Ico } from './Icons';
import { JiraCredentialForm, type JiraCredentialFormValue } from './JiraCredentialForm';

export type SignInScreenProps = {
  github: AuthProviderStatus;
  copilot: AuthProviderStatus;
  atlassian: AuthProviderStatus;
  identity: AuthIdentity | null;
  jiraAuthState: JiraAuthState;
  onGitHub: () => void;
  onCopilot: () => void;
  onAtlassian: () => void;
  onSaveJiraCredential: (value: JiraCredentialFormValue) => Promise<JiraCredentialSaveResponse | void> | JiraCredentialSaveResponse | void;
  onOpenJiraTokenPage: () => void;
};

const actionLabel = (status: AuthProviderStatus, starting = 'Signing in...'): string => (status === 'starting' ? starting : 'Sign in');

const daysUntilExpiry = (expiryDate?: string): number | null => {
  if (expiryDate === undefined) return null;
  const expiry = new Date(`${expiryDate}T00:00:00Z`).getTime();
  if (!Number.isFinite(expiry)) return null;
  return Math.ceil((expiry - Date.now()) / (24 * 60 * 60 * 1000));
};

const jiraSubtitle = (authState: JiraAuthState): React.ReactNode => {
  if (authState.state === 'expired') return <span className="jira-auth-bad">Connection expired, reconnect</span>;
  if (authState.state === 'warm') {
    const days = daysUntilExpiry(authState.expiryDate);
    return (
      <>
        <span>Connected as {authState.displayName ?? authState.emailAddress ?? authState.accountId ?? 'JIRA user'}</span>
        {days !== null && days >= 0 && days <= 7 ? <span className="jira-auth-warn">token expires in {days} {days === 1 ? 'day' : 'days'}</span> : null}
      </>
    );
  }
  return 'Connect to file tickets, fast and deterministic';
};

const jiraActionLabel = (authState: JiraAuthState): string =>
  authState.state === 'warm' ? 'Manage' : authState.state === 'expired' ? 'Reconnect' : 'Connect';

export const SignInScreen = ({ github, copilot, atlassian, identity, jiraAuthState, onGitHub, onCopilot, onAtlassian, onSaveJiraCredential, onOpenJiraTokenPage }: SignInScreenProps): React.ReactElement => {
  const [jiraPanelOpen, setJiraPanelOpen] = useState(false);
  const [localJiraAuthState, setLocalJiraAuthState] = useState<JiraAuthState | null>(null);
  const effectiveJiraAuthState = localJiraAuthState ?? jiraAuthState;
  return (
    <main className="screen signin signin-stage" data-testid="sign-in-screen">
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
              <div className="signin-row-sub">{github === 'ok' ? `Signed in as ${identity?.login ?? 'github-user'}` : 'Required to discover org repositories'}</div>
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

          <div className={`signin-row jira-signin-row ${effectiveJiraAuthState.state === 'warm' ? 'is-on' : ''}`} data-vd-role="signin-jira-row">
            <div className="signin-row-icon"><Ico.Jira size={15} /></div>
            <div className="signin-row-main">
              <div className="signin-row-title">JIRA</div>
              <div className="signin-row-sub jira-auth-sub">{jiraSubtitle(effectiveJiraAuthState)}</div>
            </div>
            {effectiveJiraAuthState.state === 'warm' ? <span className="signin-row-status"><span className="signin-dot ok" />Connected</span> : null}
            <button type="button" className="btn primary" data-vd-role="signin-jira-action" onClick={() => setJiraPanelOpen((open) => !open)}>
              <Ico.Jira size={12} />{jiraActionLabel(effectiveJiraAuthState)}
            </button>
          </div>
          {jiraPanelOpen ? (
            <div className="signin-inline-panel" role="region" aria-label="JIRA Direct connect" data-vd-role="signin-jira-panel">
              <JiraCredentialForm
                authState={effectiveJiraAuthState}
                onOpenTokenPage={onOpenJiraTokenPage}
                onSave={onSaveJiraCredential}
                onSaved={(authState) => {
                  setLocalJiraAuthState(authState);
                  if (authState.state === 'warm') setJiraPanelOpen(false);
                }}
              />
              {effectiveJiraAuthState.state === 'none' && atlassian === 'ok' ? (
                <button type="button" className="jira-text-link" data-vd-role="signin-jira-mcp-fallback" onClick={onAtlassian}>Use Copilot MCP instead</button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="signin-foot"><span>Trouble signing in? Use the gear menu to report a bug.</span></div>
      </section>
    </main>
  );
};
