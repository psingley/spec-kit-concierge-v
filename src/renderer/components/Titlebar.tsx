import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useClickOutside } from '../hooks/useClickOutside';
import type { AuthIdentity, AuthProviderStatus } from '../slices/auth';
import type { JiraAuthState, JiraBoardMapping, JiraBoardSuggestion, JiraCredentialSaveResponse, JiraProject } from '../slices/jira';
import type { RepositorySummary } from '../slices/workspace';
import { Ico } from './Icons';
import { JiraBoardPicker } from './JiraBoardPicker';
import { JiraCredentialForm, type JiraCredentialFormValue } from './JiraCredentialForm';

export type TitlebarProps = {
  repo: RepositorySummary | null;
  branch: string | null;
  identity: AuthIdentity | null;
  github: AuthProviderStatus;
  copilot: AuthProviderStatus;
  atlassian: AuthProviderStatus;
  model: string | null;
  models: CopilotModelOption[];
  repositories?: RepositorySummary[];
  repositoriesError?: boolean;
  jiraAuthState: JiraAuthState;
  jiraBoard: JiraBoardMapping;
  jiraBoardSuggestions: JiraBoardSuggestion[];
  jiraProjectResults: JiraProject[];
  jiraProjectSearchText?: string;
  modelDisabled?: boolean;
  onCustomize: () => void;
  onAbout: () => void;
  onRequest: () => void;
  onModelSelect: (modelId: string) => void;
  onSetJiraBoard: (projectKey: string) => void;
  onSearchJiraProjects: (query: string) => void;
  onSaveJiraCredential: (value: JiraCredentialFormValue) => Promise<JiraCredentialSaveResponse | void> | JiraCredentialSaveResponse | void;
  onClearJiraCredential: () => void;
  activityPill?: React.ReactNode;
};

type OpenMenu = 'repository' | 'branch' | 'board' | 'auth' | 'model' | 'settings' | null;

const authLabel = (status: AuthProviderStatus): string => (status === 'ok' ? 'connected' : status === 'starting' ? 'connecting' : status);

export type CopilotModelOption = {
  id: string;
  name: string;
  cost?: string;
  enablement?: string;
};

const FALLBACK_MODEL: CopilotModelOption = { id: 'unknown-model', name: 'Model unavailable' };

const modelTag = (model: CopilotModelOption): string => model.enablement ?? model.cost ?? '';

const getModelOption = (model: string | null, models: CopilotModelOption[]): CopilotModelOption =>
  models.find((entry) => entry.id === model) ?? models[0] ?? FALLBACK_MODEL;

const RepoMenuRow = ({ name, active = false }: { name: string; active?: boolean }): React.ReactElement => (
  <button type="button" aria-label={name} className={`tb-menu-row repo-menu-row ${active ? 'is-active' : ''}`}>
    <Ico.Folder size={12} />
    <span className="tb-menu-row-name">{name}</span>
  </button>
);

const MenuWrap = ({
  id,
  open,
  setOpen,
  label,
  buttonClassName = 'tb-chip',
  buttonAriaLabel,
  trailing = <span className="caret-down" />,
  onCustomize,
  onAbout,
  onRequest,
  onModelSelect,
  onSetJiraBoard,
  onSearchJiraProjects,
  onSaveJiraCredential,
  onClearJiraCredential,
  modelOptions,
  selectedModel,
  modelDisabled,
  github,
  copilot,
  atlassian,
  jiraAuthState,
  jiraBoard,
  jiraBoardSuggestions,
  jiraProjectResults,
  jiraProjectSearchText,
  repositories = [],
  repositoriesError = false,
  activeRepoName = null,
  accountLabel = 'this account',
  children
}: {
  id: Exclude<OpenMenu, null>;
  open: OpenMenu;
  setOpen: (menu: OpenMenu) => void;
  label: string;
  buttonClassName?: string;
  buttonAriaLabel?: string;
  trailing?: React.ReactNode;
  onCustomize: () => void;
  onAbout: () => void;
  onRequest: () => void;
  onModelSelect: (modelId: string) => void;
  onSetJiraBoard: (projectKey: string) => void;
  onSearchJiraProjects: (query: string) => void;
  onSaveJiraCredential: (value: JiraCredentialFormValue) => Promise<JiraCredentialSaveResponse | void> | JiraCredentialSaveResponse | void;
  onClearJiraCredential: () => void;
  modelOptions: CopilotModelOption[];
  selectedModel: CopilotModelOption;
  modelDisabled: boolean;
  github: AuthProviderStatus;
  copilot: AuthProviderStatus;
  atlassian: AuthProviderStatus;
  jiraAuthState: JiraAuthState;
  jiraBoard: JiraBoardMapping;
  jiraBoardSuggestions: JiraBoardSuggestion[];
  jiraProjectResults: JiraProject[];
  jiraProjectSearchText: string;
  repositories?: RepositorySummary[];
  repositoriesError?: boolean;
  activeRepoName?: string | null;
  accountLabel?: string;
  children: React.ReactNode;
}): React.ReactElement => {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [settingsCredentialOpen, setSettingsCredentialOpen] = useState(false);
  const active = open === id;
  const refs = useMemo(() => [buttonRef, menuRef] as const, []);
  const close = useCallback(() => setOpen(null), [setOpen]);
  useClickOutside(refs, active, close);
  const onMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(null);
      buttonRef.current?.focus();
      return;
    }
    if (event.key !== 'Tab') return;
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button, [role="menuitem"]'));
    const currentIndex = items.findIndex((item) => item === document.activeElement);
    if (items.length === 0) return;
    event.preventDefault();
    const nextIndex = event.shiftKey ? (currentIndex <= 0 ? items.length - 1 : currentIndex - 1) : (currentIndex + 1) % items.length;
    items[nextIndex]?.focus();
  };

  return (
    <div className="tb-chip-wrap">
      <button
        ref={buttonRef}
        type="button"
        className={`${buttonClassName} ${active ? 'is-open' : ''}`}
        aria-label={buttonAriaLabel}
        aria-haspopup="menu"
        aria-expanded={active}
        onClick={() => setOpen(active ? null : id)}
      >
        {children}
        {trailing}
      </button>
      {active ? (
        <div ref={menuRef} role={id === 'repository' || id === 'settings' ? 'dialog' : 'menu'} aria-label={label} className={`tb-menu ${id === 'settings' ? 'gear' : id}-menu`} tabIndex={-1} onKeyDown={onMenuKeyDown}>
          {id === 'repository' ? (
            <>
              <div className="tb-menu-search">
                <Ico.Search size={12} />
                <input aria-label="Filter repos" placeholder="Filter repos…" readOnly />
              </div>
              <div className="tb-menu-scroll" tabIndex={0} role="region" aria-label="Repository list">
                {repositoriesError ? (
                  <div className="tb-menu-empty">Could not load repositories</div>
                ) : repositories.length === 0 ? (
                  <div className="tb-menu-empty">No repositories found for {accountLabel}</div>
                ) : (
                  <>
                    <div className="tb-menu-group">All repos</div>
                    {repositories.map((entry) => (
                      <RepoMenuRow key={entry.id} name={entry.name} active={entry.name === activeRepoName} />
                    ))}
                  </>
                )}
              </div>
            </>
          ) : null}
          {id === 'branch' ? (
            <>
              <div className="tb-menu-h">Branch</div>
              <button type="button" role="menuitem" className="tb-menu-row">{label}</button>
              <button type="button" role="menuitem" className="tb-menu-row">Start new session</button>
            </>
          ) : null}
          {id === 'board' ? (
            <JiraBoardPicker
              board={jiraBoard}
              suggestions={jiraBoardSuggestions}
              projects={jiraProjectResults}
              searchText={jiraProjectSearchText}
              onSearch={onSearchJiraProjects}
              onPick={(projectKey) => {
                onSetJiraBoard(projectKey);
                setOpen(null);
              }}
            />
          ) : null}
          {id === 'auth' ? (
            <>
              <div className="tb-menu-h">Auth status</div>
              <button type="button" role="menuitem" className="tb-menu-row">GitHub {authLabel(github)}</button>
              <button type="button" role="menuitem" className="tb-menu-row">Copilot {authLabel(copilot)}</button>
              <button type="button" role="menuitem" className="tb-menu-row">Atlassian MCP {authLabel(atlassian)}</button>
            </>
          ) : null}
          {id === 'model' ? (
            <>
              <div className="tb-menu-h">Model</div>
              {modelOptions.map((entry) => {
                const tag = modelTag(entry);
                return (
                  <button
                    key={entry.id}
                    type="button"
                    role="menuitem"
                    className={`tb-menu-row ${entry.id === selectedModel.id ? 'is-active' : ''}`}
                    disabled={modelDisabled}
                    aria-current={entry.id === selectedModel.id ? 'true' : undefined}
                    onClick={() => {
                      if (!modelDisabled) {
                        onModelSelect(entry.id);
                        setOpen(null);
                      }
                    }}
                  >
                    <span className="tb-menu-row-name">{entry.name}</span>
                    {tag ? <span className="tb-menu-row-pill">{tag}</span> : null}
                  </button>
                );
              })}
            </>
          ) : null}
          {id === 'settings' ? (
            <>
              <button type="button" className="gear-item" onClick={onCustomize} data-vd-role="gear-menu-icons"><Ico.Gear size={13} /><span>Customize</span></button>
              <button type="button" className="gear-item" onClick={onRequest}><Ico.Bug size={13} /><span>Report a bug</span></button>
              <button type="button" className="gear-item"><Ico.Download size={13} /><span>Export activity log</span><span className="gear-item-sub mono">14 lines</span></button>
              <button type="button" className="gear-item" onClick={onAbout}><Ico.Info size={13} /><span>About</span></button>
              <div className="gear-section jira-settings-section" data-vd-role="settings-jira-section">
                <div className="gear-section-h">JIRA Integration</div>
                <div className="jira-settings-auth">
                  {jiraAuthState.state === 'warm' ? `Connected as ${jiraAuthState.displayName ?? jiraAuthState.emailAddress ?? jiraAuthState.accountId ?? 'JIRA user'}` : jiraAuthState.state === 'expired' ? 'Connection expired' : 'Not connected'}
                </div>
                {expiryWarning(jiraAuthState) !== null ? <div className="jira-auth-warn">{expiryWarning(jiraAuthState)}</div> : null}
                <button type="button" className="gear-item jira-manage-credential" onClick={() => setSettingsCredentialOpen((open) => !open)}>
                  <Ico.Edit size={13} /><span>Manage credential</span>
                </button>
                {settingsCredentialOpen ? <JiraCredentialForm authState={jiraAuthState} compact onSave={onSaveJiraCredential} /> : null}
                <button type="button" className="gear-item jira-clear-credential" onClick={onClearJiraCredential}>
                  <Ico.X size={13} /><span>Clear credential</span>
                </button>
                <div className="gear-section-h">Board for current repo</div>
                <JiraBoardPicker
                  compact
                  board={jiraBoard}
                  suggestions={jiraBoardSuggestions}
                  projects={jiraProjectResults}
                  searchText={jiraProjectSearchText}
                  onSearch={onSearchJiraProjects}
                  onPick={onSetJiraBoard}
                />
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

const AuthChipChildren = ({ authSummary }: { authSummary: string }): React.ReactElement => (
  <>
    <span className="auth-chip-dot" data-vd-role="auth-identity-dot" />
    <span className="auth-chip-label">{authSummary}</span>
  </>
);

const expiryWarning = (authState: JiraAuthState): string | null => {
  if (authState.expiryDate === undefined) return null;
  const days = Math.ceil((new Date(`${authState.expiryDate}T00:00:00Z`).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  return Number.isFinite(days) && days >= 0 && days <= 7 ? `Token expires in ${days} ${days === 1 ? 'day' : 'days'}` : null;
};

export const Titlebar = ({ repo, branch, identity, github, copilot, atlassian, model, models, repositories = [], repositoriesError = false, jiraAuthState, jiraBoard, jiraBoardSuggestions, jiraProjectResults, jiraProjectSearchText = '', modelDisabled = false, onCustomize, onAbout, onRequest, onModelSelect, onSetJiraBoard, onSearchJiraProjects, onSaveJiraCredential, onClearJiraCredential, activityPill = null }: TitlebarProps): React.ReactElement => {
  const [open, setOpen] = useState<OpenMenu>(null);
  const activeRepo = branch === null ? null : repo;
  const accountLabel = identity?.login ?? 'this account';
  const repoOwner = activeRepo?.owner ?? accountLabel;
  const repoName = activeRepo?.name ?? 'pick repo';
  const repoLabel = `${repoOwner}/${repoName}`;
  const branchLabel = branch ?? activeRepo?.defaultBranch ?? 'main';
  const modelOption = getModelOption(model, models);
  const selectedModelTag = modelTag(modelOption);
  const connectedCount = [github, copilot, atlassian].filter((status) => status === 'ok').length;
  const allOk = connectedCount === 3;
  const authSummary = github === 'ok' && identity !== null ? identity.login : connectedCount > 0 ? `${connectedCount} of 3` : 'Sign in';
  const boardConfigured = jiraBoard.projectKey !== undefined && jiraBoard.source !== 'none';
  const jiraReachable = activeRepo !== null && (jiraAuthState.state === 'warm' || boardConfigured);
  const boardLabel = boardConfigured ? jiraBoard.projectKey ?? 'Set board' : 'Set board';
  return (
    <header className="titlebar">
      <div className="titlebar-left">
        <div className="titlebar-brand">Spec-kit Concierge</div>
        <span className="tb-divider" />
        <MenuWrap id="auth" open={open} setOpen={setOpen} label="Authentication" buttonClassName={`tb-chip auth-chip status-${allOk ? 'ok' : 'partial'}`} onCustomize={onCustomize} onAbout={onAbout} onRequest={onRequest} onModelSelect={onModelSelect} onSetJiraBoard={onSetJiraBoard} onSearchJiraProjects={onSearchJiraProjects} onSaveJiraCredential={onSaveJiraCredential} onClearJiraCredential={onClearJiraCredential} modelOptions={models} selectedModel={modelOption} modelDisabled={modelDisabled} github={github} copilot={copilot} atlassian={atlassian} jiraAuthState={jiraAuthState} jiraBoard={jiraBoard} jiraBoardSuggestions={jiraBoardSuggestions} jiraProjectResults={jiraProjectResults} jiraProjectSearchText={jiraProjectSearchText}>
          <AuthChipChildren authSummary={authSummary} />
        </MenuWrap>
        <MenuWrap id="repository" open={open} setOpen={setOpen} label="Repository" buttonClassName="tb-chip repo" buttonAriaLabel={repoLabel} onCustomize={onCustomize} onAbout={onAbout} onRequest={onRequest} onModelSelect={onModelSelect} onSetJiraBoard={onSetJiraBoard} onSearchJiraProjects={onSearchJiraProjects} onSaveJiraCredential={onSaveJiraCredential} onClearJiraCredential={onClearJiraCredential} modelOptions={models} selectedModel={modelOption} modelDisabled={modelDisabled} github={github} copilot={copilot} atlassian={atlassian} jiraAuthState={jiraAuthState} jiraBoard={jiraBoard} jiraBoardSuggestions={jiraBoardSuggestions} jiraProjectResults={jiraProjectResults} jiraProjectSearchText={jiraProjectSearchText} repositories={repositories} repositoriesError={repositoriesError} activeRepoName={activeRepo?.name ?? null} accountLabel={accountLabel}>
          <span className="tb-chip-prefix mono">{repoOwner}</span>
          <span className="tb-chip-slash">/</span>
          <span className="tb-chip-name mono">{repoName}</span>
        </MenuWrap>
        <MenuWrap id="branch" open={open} setOpen={setOpen} label="Branch" buttonClassName="tb-chip tb-chip-branch" onCustomize={onCustomize} onAbout={onAbout} onRequest={onRequest} onModelSelect={onModelSelect} onSetJiraBoard={onSetJiraBoard} onSearchJiraProjects={onSearchJiraProjects} onSaveJiraCredential={onSaveJiraCredential} onClearJiraCredential={onClearJiraCredential} modelOptions={models} selectedModel={modelOption} modelDisabled={modelDisabled} github={github} copilot={copilot} atlassian={atlassian} jiraAuthState={jiraAuthState} jiraBoard={jiraBoard} jiraBoardSuggestions={jiraBoardSuggestions} jiraProjectResults={jiraProjectResults} jiraProjectSearchText={jiraProjectSearchText}>
          <Ico.Branch size={11} />
          <span className="tb-chip-name mono">{branchLabel}</span>
        </MenuWrap>
        {jiraReachable ? (
          <MenuWrap id="board" open={open} setOpen={setOpen} label="JIRA board for this repo" buttonClassName={`tb-chip tb-chip-board ${boardConfigured ? '' : 'status-warn'}`} buttonAriaLabel={`JIRA board ${boardLabel}`} onCustomize={onCustomize} onAbout={onAbout} onRequest={onRequest} onModelSelect={onModelSelect} onSetJiraBoard={onSetJiraBoard} onSearchJiraProjects={onSearchJiraProjects} onSaveJiraCredential={onSaveJiraCredential} onClearJiraCredential={onClearJiraCredential} modelOptions={models} selectedModel={modelOption} modelDisabled={modelDisabled} github={github} copilot={copilot} atlassian={atlassian} jiraAuthState={jiraAuthState} jiraBoard={jiraBoard} jiraBoardSuggestions={jiraBoardSuggestions} jiraProjectResults={jiraProjectResults} jiraProjectSearchText={jiraProjectSearchText}>
            <Ico.Jira size={11} />
            <span className="tb-chip-name mono">{boardLabel}</span>
          </MenuWrap>
        ) : null}
      </div>
      <div className="titlebar-right">
        <MenuWrap id="model" open={open} setOpen={setOpen} label="Model" buttonClassName="model-trigger" buttonAriaLabel={`${modelOption.name}${selectedModelTag}`} onCustomize={onCustomize} onAbout={onAbout} onRequest={onRequest} onModelSelect={onModelSelect} onSetJiraBoard={onSetJiraBoard} onSearchJiraProjects={onSearchJiraProjects} onSaveJiraCredential={onSaveJiraCredential} onClearJiraCredential={onClearJiraCredential} modelOptions={models} selectedModel={modelOption} modelDisabled={modelDisabled} github={github} copilot={copilot} atlassian={atlassian} jiraAuthState={jiraAuthState} jiraBoard={jiraBoard} jiraBoardSuggestions={jiraBoardSuggestions} jiraProjectResults={jiraProjectResults} jiraProjectSearchText={jiraProjectSearchText}>
          <Ico.Copilot size={11} />
          <span className="model-name">{modelOption.name}</span>
          {selectedModelTag ? <span className="model-tag">{selectedModelTag}</span> : null}
        </MenuWrap>
        <MenuWrap id="settings" open={open} setOpen={setOpen} label="Settings" buttonClassName="icon-btn" buttonAriaLabel="Settings" trailing={null} onCustomize={onCustomize} onAbout={onAbout} onRequest={onRequest} onModelSelect={onModelSelect} onSetJiraBoard={onSetJiraBoard} onSearchJiraProjects={onSearchJiraProjects} onSaveJiraCredential={onSaveJiraCredential} onClearJiraCredential={onClearJiraCredential} modelOptions={models} selectedModel={modelOption} modelDisabled={modelDisabled} github={github} copilot={copilot} atlassian={atlassian} jiraAuthState={jiraAuthState} jiraBoard={jiraBoard} jiraBoardSuggestions={jiraBoardSuggestions} jiraProjectResults={jiraProjectResults} jiraProjectSearchText={jiraProjectSearchText}>
          <Ico.Gear size={13} />
        </MenuWrap>
        {activityPill}
      </div>
    </header>
  );
};
