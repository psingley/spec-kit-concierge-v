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
  showDraftBranch?: boolean;
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

const REPO_MENU_RECENT = [
  { name: 'concierge-api', branches: '4', meta: '2h ago' },
  { name: 'concierge-web', branches: '2', meta: 'yesterday' },
  { name: 'concierge-mobile', branches: '1', meta: '3d ago' },
  { name: 'booking-engine', branches: '', meta: '1w ago' }
] as const;

const REPO_MENU_ALL = [
  { name: 'itinerary-service', branches: 'main' },
  { name: 'pricing-rules', branches: '' },
  { name: 'guest-profile-svc', branches: '' },
  { name: 'supplier-sync', branches: '' },
  { name: 'loyalty-ledger', branches: '' },
  { name: 'ops-dashboard', branches: '' },
  { name: 'concierge-shared-ui', branches: '' },
  { name: 'incident-bot', branches: '' },
  { name: 'voucher-redeem', branches: '' },
  { name: 'data-warehouse-etl', branches: '' }
] as const;

const RepoMenuRow = ({ name, branches, meta, active = false }: { name: string; branches?: string; meta?: string; active?: boolean }): React.ReactElement => {
  const ariaLabel = `${name}${branches ?? ''}${meta ?? ''}`;
  return (
    <button type="button" aria-label={ariaLabel} className={`tb-menu-row repo-menu-row ${active ? 'is-active' : ''}`}>
      <Ico.Folder size={12} />
      <span className="tb-menu-row-name">{name}</span>
      {branches ? <span className="tb-menu-row-pill">{branches}</span> : null}
      {meta ? <span className="tb-menu-row-meta">{meta}</span> : null}
    </button>
  );
};

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
              <div className="tb-menu-scroll">
                <div className="tb-menu-group"><Ico.Clock size={10} />Recent</div>
                {REPO_MENU_RECENT.map((entry) => (
                  <RepoMenuRow key={entry.name} name={entry.name} branches={entry.branches} meta={entry.meta} active={entry.name === 'concierge-api'} />
                ))}
                <div className="tb-menu-group">All repos</div>
                {REPO_MENU_ALL.map((entry) => (
                  <RepoMenuRow key={entry.name} name={entry.name} branches={entry.branches} />
                ))}
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
              <button type="button" className="gear-item" onClick={onCustomize} data-vd-role="gear-menu-icons"><Ico.Gear size={13} /><span>Customize</span></button>
              <button type="button" className="gear-item" onClick={onRequest}><Ico.Bug size={13} /><span>Report a bug</span></button>
              <button type="button" className="gear-item"><Ico.Download size={13} /><span>Export activity log</span><span className="gear-item-sub mono">14 lines</span></button>
              <button type="button" className="gear-item" onClick={onAbout}><Ico.Info size={13} /><span>About</span></button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export const Titlebar = ({ repo, branch, identity, github, copilot, atlassian, model, showDraftBranch = false, onCustomize, onAbout, onRequest }: TitlebarProps): React.ReactElement => {
  const [open, setOpen] = useState<OpenMenu>(null);
  const activeRepo = branch === null ? null : repo;
  const repoOwner = activeRepo?.owner ?? 'collette-travel';
  const repoName = activeRepo?.name ?? 'pick repo';
  const repoLabel = `${repoOwner}/${repoName}`;
  const branchLabel = showDraftBranch && branch !== null ? branch : activeRepo?.defaultBranch ?? 'main';
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
