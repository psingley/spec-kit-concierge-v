import React from 'react';
import type { AuthProviderStatus } from '../slices/auth';
import type { RepositorySummary } from '../slices/workspace';

export type TitlebarProps = {
  repo: RepositorySummary | null;
  branch: string | null;
  github: AuthProviderStatus;
  copilot: AuthProviderStatus;
  atlassian: AuthProviderStatus;
  model: string | null;
  onCustomize: () => void;
  onAbout: () => void;
  onRequest: () => void;
};

export const Titlebar = ({ repo, branch, github, copilot, atlassian, model, onCustomize, onAbout, onRequest }: TitlebarProps): React.ReactElement => (
  <header className="titlebar">
    <strong>Concierge</strong>
    <span>{repo?.name ?? 'No repo'}</span>
    <span>{branch ?? 'No branch'}</span>
    <span>GitHub {github}</span>
    <span>Copilot {copilot}</span>
    <span>Atlassian {atlassian} stub</span>
    <span>Model {model ?? 'default'}</span>
    <button type="button" onClick={onCustomize}>Customize</button>
    <button type="button" onClick={onAbout}>About</button>
    <button type="button" onClick={onRequest}>Request</button>
  </header>
);
