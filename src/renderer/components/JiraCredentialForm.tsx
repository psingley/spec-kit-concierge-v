import React, { useRef, useState } from 'react';
import type { JiraAuthState, JiraCredentialSaveResponse } from '../slices/jira';
import { Ico } from './Icons';

export type JiraCredentialFormValue = {
  email: string;
  token: string;
  baseUrl?: string;
};

export type JiraCredentialFormProps = {
  authState: JiraAuthState;
  compact?: boolean;
  onSave: (value: JiraCredentialFormValue) => Promise<JiraCredentialSaveResponse | void> | JiraCredentialSaveResponse | void;
  onSaved?: (authState: JiraAuthState) => void;
  onOpenTokenPage?: () => void;
};

const defaultBaseUrl = (authState: JiraAuthState): string => authState.baseUrl ?? '';

export const JiraCredentialForm = ({ authState, compact = false, onSave, onSaved, onOpenTokenPage }: JiraCredentialFormProps): React.ReactElement => {
  const [email, setEmail] = useState(authState.emailAddress ?? '');
  const tokenRef = useRef<HTMLInputElement>(null);
  const [tokenPresent, setTokenPresent] = useState(false);
  const [baseUrl, setBaseUrl] = useState(defaultBaseUrl(authState));
  const [siteFallbackVisible, setSiteFallbackVisible] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    let keepToken = false;
    try {
      const token = tokenRef.current?.value ?? '';
      const result = await onSave({
        email: email.trim(),
        token,
        ...(siteFallbackVisible ? { baseUrl: baseUrl.trim() } : {})
      });
      if (result !== undefined) {
        if (result.ok) {
          onSaved?.(result.authState);
        } else if (result.status === 'site_not_found') {
          keepToken = true;
          setSiteFallbackVisible(true);
          setError(null);
        } else {
          setError("Couldn't connect. Check the email and token.");
        }
      }
    } catch {
      setError("Couldn't connect. Check the email and token.");
    } finally {
      setSaving(false);
      if (!keepToken && tokenRef.current !== null) {
        tokenRef.current.value = '';
        setTokenPresent(false);
      }
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
          <span className="label">Email</span>
          <input aria-label="Email" value={email} onChange={(event) => setEmail(event.currentTarget.value)} type="email" autoComplete="email" required />
        </label>
        <label className="field jira-token-field">
          <span className="label">API token</span>
          <span className="jira-token-input">
            <input ref={tokenRef} aria-label="API token" onChange={(event) => setTokenPresent(event.currentTarget.value !== '')} type={showToken ? 'text' : 'password'} autoComplete="off" required />
            <button type="button" className="icon-btn" aria-label={showToken ? 'Hide API token' : 'Show API token'} onClick={() => setShowToken((value) => !value)}>
              <Ico.Eye size={13} />
            </button>
          </span>
        </label>
        {siteFallbackVisible ? (
          <label className="field">
            <span className="label">JIRA site URL</span>
            <input aria-label="JIRA site URL" value={baseUrl} onChange={(event) => setBaseUrl(event.currentTarget.value)} placeholder="https://yourcompany.atlassian.net" autoComplete="url" required />
            <span className="jira-field-help">We couldn't find your Jira site automatically. Paste it (e.g. https://yourcompany.atlassian.net).</span>
          </label>
        ) : null}
      </div>
      <p className="jira-secret-note">Stored in your OS keychain. Never sent to any AI agent. We can't recover it, so keep a copy.</p>
      {error !== null ? <p className="jira-form-error" role="alert">{error}</p> : null}
      <button type="submit" className="btn primary" disabled={saving || email.trim() === '' || !tokenPresent || (siteFallbackVisible && baseUrl.trim() === '')}>
        {saving ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
};
