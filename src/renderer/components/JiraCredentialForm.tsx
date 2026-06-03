import React, { useState } from 'react';
import type { JiraAuthState, JiraCredentialSaveResponse } from '../slices/jira';
import { Ico } from './Icons';

export type JiraCredentialFormValue = {
  email: string;
  token: string;
  baseUrl: string;
  expiryDate?: string;
};

export type JiraCredentialFormProps = {
  authState: JiraAuthState;
  compact?: boolean;
  onSave: (value: JiraCredentialFormValue) => Promise<JiraCredentialSaveResponse | void> | JiraCredentialSaveResponse | void;
  onSaved?: (authState: JiraAuthState) => void;
  onOpenTokenPage?: () => void;
};

const defaultBaseUrl = (authState: JiraAuthState): string => authState.baseUrl ?? 'https://example.atlassian.net';

export const JiraCredentialForm = ({ authState, compact = false, onSave, onSaved, onOpenTokenPage }: JiraCredentialFormProps): React.ReactElement => {
  const [email, setEmail] = useState(authState.emailAddress ?? '');
  const [token, setToken] = useState('');
  const [baseUrl, setBaseUrl] = useState(defaultBaseUrl(authState));
  const [expiryDate, setExpiryDate] = useState(authState.expiryDate ?? '');
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const result = await onSave({
        email: email.trim(),
        token,
        baseUrl: baseUrl.trim(),
        expiryDate: expiryDate === '' ? undefined : expiryDate
      });
      if (result !== undefined) onSaved?.(result.authState);
    } catch {
      setError("Couldn't connect. Check the email and token.");
    } finally {
      setSaving(false);
      setToken('');
    }
  };

  return (
    <form className={`jira-credential-form ${compact ? 'is-compact' : ''}`} onSubmit={(event) => void submit(event)} data-vd-role="jira-credential-form">
      {!compact ? (
        <div className="jira-connect-steps">
          <div className="jira-connect-step">
            <div className="jira-connect-step-title">Create an API token</div>
            <button type="button" className="jira-text-link" onClick={onOpenTokenPage}>Open token page</button>
          </div>
          <p className="jira-form-note">Use 'Create API token' (the plain one, not 'with scopes').</p>
        </div>
      ) : null}
      <div className="jira-form-grid">
        <label className="field">
          <span className="label">JIRA site URL</span>
          <input aria-label="JIRA site URL" value={baseUrl} onChange={(event) => setBaseUrl(event.currentTarget.value)} placeholder="https://example.atlassian.net" autoComplete="url" required />
        </label>
        <label className="field">
          <span className="label">Email</span>
          <input aria-label="Email" value={email} onChange={(event) => setEmail(event.currentTarget.value)} type="email" autoComplete="email" required />
        </label>
        <label className="field jira-token-field">
          <span className="label">API token</span>
          <span className="jira-token-input">
            <input aria-label="API token" value={token} onChange={(event) => setToken(event.currentTarget.value)} type={showToken ? 'text' : 'password'} autoComplete="off" required />
            <button type="button" className="icon-btn" aria-label={showToken ? 'Hide API token' : 'Show API token'} onClick={() => setShowToken((value) => !value)}>
              <Ico.Eye size={13} />
            </button>
          </span>
        </label>
        <label className="field">
          <span className="label">Expires</span>
          <input aria-label="Expires" value={expiryDate} onChange={(event) => setExpiryDate(event.currentTarget.value)} type="date" />
          <span className="jira-field-help">Shown on the token page, lets us warn you before it lapses.</span>
        </label>
      </div>
      <p className="jira-secret-note">Stored in your OS keychain. Never sent to any AI agent. We can't recover it, so keep a copy.</p>
      {error !== null ? <p className="jira-form-error" role="alert">{error}</p> : null}
      <button type="submit" className="btn primary" disabled={saving || email.trim() === '' || token === '' || baseUrl.trim() === ''}>
        {saving ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
};
