import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useClickOutside } from '../hooks/useClickOutside';
import type { AuthIdentity, AuthProviderStatus } from '../slices/auth';
import type { RepositorySummary } from '../slices/workspace';
import { Ico } from './Icons';

export type TitlebarProps = {
  repo: RepositorySummary | null;
  branch: string | null;
  identity: AuthIdentity | null;
  github: AuthProviderStatus;
  copilot: AuthProviderStatus;
  atlassian: AuthProviderStatus;
  model: string | null;
  onCustomize: () => void;
  onAbout: () => void;
  onRequest: () => void;
};

type OpenMenu = 'repository' | 'branch' | 'auth' | 'model' | 'settings' | null;

const authLabel = (status: AuthProviderStatus): string => (status === 'ok' ? 'connected' : status === 'starting' ? 'connecting' : status);

const COPILOT_MODELS = [
  { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5', tag: 'default' },
  { id: 'claude-opus-4-1', label: 'Claude Opus 4.1', tag: 'premium' },
  { id: 'gpt-5', label: 'GPT-5', tag: '' },
  { id: 'gpt-5-mini', label: 'GPT-5 mini', tag: 'fast' },
  { id: 'gpt-5-codex', label: 'GPT-5 Codex', tag: 'code' },
  { id: 'o3', label: 'o3', tag: 'reason' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', tag: '' }
] as const;

const getModelOption = (model: string | null): (typeof COPILOT_MODELS)[number] => COPILOT_MODELS.find((entry) => entry.id === model) ?? COPILOT_MODELS[0];

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
  children: React.ReactNode;
}): React.ReactElement => {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
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
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'));
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
        <div ref={menuRef} role="menu" aria-label={label} className={`tb-menu ${id}-menu`} tabIndex={-1} onKeyDown={onMenuKeyDown}>
          {id === 'repository' ? (
            <>
              <div className="tb-menu-h">Repository</div>
              <button type="button" role="menuitem" className="tb-menu-row">Open repository browser</button>
              <button type="button" role="menuitem" className="tb-menu-row">Refresh repositories</button>
            </>
          ) : null}
          {id === 'branch' ? (
            <>
              <div className="tb-menu-h">Branch</div>
              <button type="button" role="menuitem" className="tb-menu-row">{label}</button>
              <button type="button" role="menuitem" className="tb-menu-row">Start new session</button>
            </>
          ) : null}
          {id === 'auth' ? (
            <>
              <div className="tb-menu-h">Auth status</div>
              <button type="button" role="menuitem" className="tb-menu-row">GitHub {authLabel('ok')}</button>
              <button type="button" role="menuitem" className="tb-menu-row">Copilot {authLabel('ok')}</button>
              <button type="button" role="menuitem" className="tb-menu-row">Atlassian visible, not required</button>
            </>
          ) : null}
          {id === 'model' ? (
            <>
              <div className="tb-menu-h">Model</div>
              <button type="button" role="menuitem" className="tb-menu-row">{label}</button>
              <button type="button" role="menuitem" className="tb-menu-row">Change between steps</button>
            </>
          ) : null}
          {id === 'settings' ? (
            <>
              <button type="button" role="menuitem" className="gear-item" onClick={onCustomize}><Ico.Gear />Customize</button>
              <button type="button" role="menuitem" className="gear-item" onClick={onAbout}><Ico.Info />About</button>
              <button type="button" role="menuitem" className="gear-item" onClick={onRequest}><Ico.Mail />Request access</button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export const Titlebar = ({ repo, branch, identity, github, copilot, atlassian, model, onCustomize, onAbout, onRequest }: TitlebarProps): React.ReactElement => {
  const [open, setOpen] = useState<OpenMenu>(null);
  const activeRepo = branch === null ? null : repo;
  const repoOwner = activeRepo?.owner ?? 'collette-travel';
  const repoName = activeRepo?.name ?? 'pick repo';
  const repoLabel = `${repoOwner}/${repoName}`;
  const branchLabel = branch?.startsWith('spec/draft-') ? activeRepo?.defaultBranch ?? 'main' : branch ?? activeRepo?.defaultBranch ?? 'main';
  const modelOption = getModelOption(model);
  const allOk = github === 'ok' && copilot === 'ok';
  const authSummary = allOk ? identity?.login ?? 'a.kim' : github === 'ok' || copilot === 'ok' || atlassian === 'ok' ? '2 of 3' : 'Sign in';

  return (
    <header className="titlebar">
      <div className="titlebar-left">
        <div className="titlebar-dots" data-vd-role="brand-orb" aria-hidden="true">
          <span /><span /><span />
        </div>
        <div className="titlebar-brand">Spec-kit Concierge</div>
        <span className="tb-divider" />
        <MenuWrap id="auth" open={open} setOpen={setOpen} label="Authentication" buttonClassName={`tb-chip auth-chip status-${allOk ? 'ok' : 'partial'}`} onCustomize={onCustomize} onAbout={onAbout} onRequest={onRequest}>
          <span className="auth-chip-dot" data-vd-role="auth-identity-dot" />
          <span className="auth-chip-label">{authSummary}</span>
        </MenuWrap>
        <MenuWrap id="repository" open={open} setOpen={setOpen} label="Repository" buttonClassName="tb-chip repo" buttonAriaLabel={repoLabel} onCustomize={onCustomize} onAbout={onAbout} onRequest={onRequest}>
          <span className="tb-chip-prefix mono">{repoOwner}</span>
          <span className="tb-chip-slash">/</span>
          <span className="tb-chip-name mono">{repoName}</span>
        </MenuWrap>
        <MenuWrap id="branch" open={open} setOpen={setOpen} label="Branch" buttonClassName="tb-chip tb-chip-branch" onCustomize={onCustomize} onAbout={onAbout} onRequest={onRequest}>
          <Ico.Branch size={11} />
          <span className="tb-chip-name mono">{branchLabel}</span>
        </MenuWrap>
      </div>
      <div className="titlebar-right">
        <MenuWrap id="model" open={open} setOpen={setOpen} label="Model" buttonClassName="model-trigger" buttonAriaLabel={`${modelOption.label}${modelOption.tag}`} onCustomize={onCustomize} onAbout={onAbout} onRequest={onRequest}>
          <Ico.Copilot size={11} />
          <span className="model-name">{modelOption.label}</span>
          {modelOption.tag ? <span className="model-tag">{modelOption.tag}</span> : null}
        </MenuWrap>
        <MenuWrap id="settings" open={open} setOpen={setOpen} label="Settings" buttonClassName="icon-btn" buttonAriaLabel="Settings" trailing={null} onCustomize={onCustomize} onAbout={onAbout} onRequest={onRequest}>
          <Ico.Gear size={13} />
        </MenuWrap>
        <button type="button" className="titlebar-activity-pill" aria-label="Activity">
          <Ico.Terminal size={12} />
          <span className="activity-glyph" />
        </button>
      </div>
    </header>
  );
};
