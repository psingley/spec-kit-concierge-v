import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useClickOutside } from '../hooks/useClickOutside';
import type { AuthProviderStatus } from '../slices/auth';
import type { RepositorySummary } from '../slices/workspace';
import { Ico } from './Icons';

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

type OpenMenu = 'repository' | 'branch' | 'auth' | 'model' | 'settings' | null;

const authLabel = (status: AuthProviderStatus): string => (status === 'ok' ? 'connected' : status === 'starting' ? 'connecting' : status);

const MenuWrap = ({
  id,
  open,
  setOpen,
  label,
  onCustomize,
  onAbout,
  onRequest,
  children
}: {
  id: Exclude<OpenMenu, null>;
  open: OpenMenu;
  setOpen: (menu: OpenMenu) => void;
  label: string;
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
        className={`tb-chip ${active ? 'is-open' : ''}`}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={active}
        onClick={() => setOpen(active ? null : id)}
      >
        {children}
        <Ico.Down size={11} />
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

export const Titlebar = ({ repo, branch, github, copilot, atlassian, model, onCustomize, onAbout, onRequest }: TitlebarProps): React.ReactElement => {
  const [open, setOpen] = useState<OpenMenu>(null);
  const repoLabel = repo === null ? 'No repository' : `${repo.owner}/${repo.name}`;
  const branchLabel = branch ?? 'No branch';
  const modelLabel = model ?? 'default';
  const authSummary = `${github === 'ok' && copilot === 'ok' ? 'Ready' : 'Sign in'} · Atlassian ${atlassian === 'ok' ? 'connected' : 'Run 11'}`;

  return (
    <header className="titlebar">
      <strong>Concierge</strong>
      <MenuWrap id="repository" open={open} setOpen={setOpen} label={`Repository ${repoLabel}`} onCustomize={onCustomize} onAbout={onAbout} onRequest={onRequest}>
        <Ico.Repo /><span className="tb-chip-name">{repoLabel}</span>
      </MenuWrap>
      <MenuWrap id="branch" open={open} setOpen={setOpen} label={`Branch ${branchLabel}`} onCustomize={onCustomize} onAbout={onAbout} onRequest={onRequest}>
        <Ico.Branch /><span className="tb-chip-name">{branchLabel}</span>
      </MenuWrap>
      <MenuWrap id="auth" open={open} setOpen={setOpen} label={`Authentication ${authSummary}`} onCustomize={onCustomize} onAbout={onAbout} onRequest={onRequest}>
        <Ico.Check /><span className="tb-chip-name">{authSummary}</span>
      </MenuWrap>
      <MenuWrap id="model" open={open} setOpen={setOpen} label={`Model ${modelLabel}`} onCustomize={onCustomize} onAbout={onAbout} onRequest={onRequest}>
        <Ico.Copilot /><span className="tb-chip-name">{modelLabel}</span>
      </MenuWrap>
      <MenuWrap id="settings" open={open} setOpen={setOpen} label="Settings" onCustomize={onCustomize} onAbout={onAbout} onRequest={onRequest}>
        <Ico.Gear /><span className="tb-chip-name">Settings</span>
      </MenuWrap>
    </header>
  );
};
