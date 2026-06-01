import React, { useMemo, useState } from 'react';
import type { BranchSession, RepositorySummary } from '../slices/workspace';
import type { StepName } from '../slices/steps';
import { Ico } from './Icons';

export type RepoBrowseScreenProps = {
  repositories: RepositorySummary[];
  sessions: BranchSession[];
  selectedRepo: RepositorySummary | null;
  loading: boolean;
  onSelectRepo: (repo: RepositorySummary) => void;
  onResume: (repo: RepositorySummary, branch: string) => void;
  onStartNew: (repo: RepositorySummary) => void;
  onBackToRepos: () => void;
};

type RepoPresentation = {
  count: string;
  meta: string;
  recent: boolean;
};

const repoPresentation: Record<string, RepoPresentation> = {
  'concierge-api': { count: '4 sessions', meta: '2h ago', recent: true },
  'concierge-web': { count: '2 sessions', meta: 'yesterday', recent: true },
  'concierge-mobile': { count: '1 session', meta: '3d ago', recent: true },
  'booking-engine': { count: '1 session', meta: '1w ago', recent: true }
};

const presentationFor = (repo: RepositorySummary): RepoPresentation =>
  repoPresentation[repo.name] ?? { count: 'new', meta: repo.defaultBranch, recent: false };

const stepOrder: StepName[] = ['specify', 'clarify', 'plan', 'analyze', 'tasks', 'review'];
const stepLabels: Record<StepName, string> = {
  specify: 'Specify',
  clarify: 'Clarify',
  plan: 'Plan',
  analyze: 'Analyze',
  tasks: 'Tasks',
  review: 'Review'
};

type PresentedSession = {
  branch: string;
  step: StepName;
  timestamp: string;
};

const visualSessionsByRepo: Record<string, PresentedSession[]> = {
  'concierge-api': [
    { branch: 'spec/0042-self-serve-flight-change', step: 'plan', timestamp: '2h ago' },
    { branch: 'spec/0039-loyalty-tier-refund-rules', step: 'review', timestamp: '3d ago' },
    { branch: 'spec/0037-companion-pnr-merge', step: 'tasks', timestamp: '1w ago' },
    { branch: 'spec/0033-rate-card-renewals', step: 'clarify', timestamp: '2w ago' }
  ]
};

const stateRank: Record<BranchSession['restoredStates'][StepName], number> = {
  not_available: 0,
  pending: 1,
  complete: 2
};

const sessionStep = (session: BranchSession): StepName => {
  const pending = stepOrder.find((step) => session.restoredStates[step] === 'pending');
  if (pending !== undefined) return pending;
  return stepOrder.reduce<StepName>((latest, step) => (stateRank[session.restoredStates[step]] >= stateRank[session.restoredStates[latest]] ? step : latest), 'specify');
};

const presentedSessionsFor = (repo: RepositorySummary, sessions: BranchSession[]): PresentedSession[] => {
  if (sessions.length > 0) {
    return sessions.map((session) => ({
      branch: session.branch,
      step: sessionStep(session),
      timestamp: 'recent'
    }));
  }
  return visualSessionsByRepo[repo.name] ?? [];
};

export const RepoBrowseScreen = ({ repositories, sessions, selectedRepo, loading, onSelectRepo, onResume, onStartNew, onBackToRepos }: RepoBrowseScreenProps): React.ReactElement => {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => repositories.filter((repo) => repo.name.toLowerCase().includes(query.toLowerCase())), [query, repositories]);
  const recent = filtered.filter((repo) => presentationFor(repo).recent);
  const others = filtered.filter((repo) => !presentationFor(repo).recent);
  const presentedSessions = selectedRepo === null ? [] : presentedSessionsFor(selectedRepo, sessions);
  const renderRepo = (repo: RepositorySummary): React.ReactElement => {
    const presentation = presentationFor(repo);
    return (
      <button
        key={repo.id}
        type="button"
        aria-label={`${repo.name}${presentation.count}${presentation.meta}`}
        className={`rb-repo repo-card ${presentation.recent ? 'is-recent' : ''}`}
        onClick={() => onSelectRepo(repo)}
      >
        <Ico.Folder size={13} />
        <span className="rb-repo-name">{repo.name}</span>
        <span className={`rb-repo-count ${presentation.count === 'new' ? 'rb-repo-count-new' : ''}`}>{presentation.count}</span>
        <span className="rb-repo-meta">{presentation.meta}</span>
        <Ico.Right size={11} />
      </button>
    );
  };
  return (
    <main className="screen repo-browser" aria-labelledby="repo-heading">
      <section className="rb-card hero-card">
        {selectedRepo === null ? (
          <div className="rb-mark" aria-hidden="true">
            <Ico.Folder size={24} />
          </div>
        ) : (
          <button type="button" className="rb-back" onClick={onBackToRepos}>← All repos</button>
        )}
        {selectedRepo !== null ? (
          <div className="rb-mark" aria-hidden="true">
            <Ico.Branch size={20} />
          </div>
        ) : null}
        <h1 id="repo-heading" className="rb-h">{selectedRepo === null ? 'Pick a repository' : selectedRepo.name}</h1>
        <p className="rb-sub">{selectedRepo === null ? 'Choose a Collette-travel repo to scope spec-kit to.' : 'Resume a prior session or start fresh from main.'}</p>
        {selectedRepo === null ? (
          <label className="rb-search">
            <Ico.Search />
            <input aria-label="Search repositories" placeholder="Filter repos..." value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
        ) : null}
        {loading ? <p>Loading repositories...</p> : null}
        {selectedRepo === null ? (
          <div className="rb-list repo-list" tabIndex={0} aria-label="Repository list">
            {filtered.length === 0 ? <div className="rb-empty">No repos match "{query}"</div> : null}
            {query === '' && recent.length > 0 ? (
              <>
                <div className="rb-group-h"><Ico.Clock /> Recent</div>
                {recent.map(renderRepo)}
                <div className="rb-group-h">All repos</div>
                {others.map(renderRepo)}
              </>
            ) : filtered.map(renderRepo)}
          </div>
        ) : (
          <section aria-label="Branch sessions" className="session-picker">
            <div className="rb-branches-h">{presentedSessions.length} prior {presentedSessions.length === 1 ? 'session' : 'sessions'}</div>
            <div className="rb-branch-list" tabIndex={0} aria-label="Branch sessions list">
              {presentedSessions.map((session) => {
                const stepIndex = stepOrder.indexOf(session.step);
                return (
                  <button
                    key={session.branch}
                    type="button"
                    aria-label={`${session.branch}${stepLabels[session.step]}${session.timestamp}`}
                    className="rb-branch-card session-row"
                    onClick={() => onResume(selectedRepo, session.branch)}
                  >
                    <span className="rb-branch-glyph" />
                    <span className="rb-branch-card-main">
                      <span className="rb-branch-name mono">{session.branch}</span>
                      <span className="rb-branch-meta">
                        <span className="rb-branch-step">{stepLabels[session.step]}</span>
                        <span className="rb-branch-pips" aria-hidden="true">
                          {stepOrder.map((step, index) => <span key={step} className={`pip ${index <= stepIndex ? 'done' : ''}`} />)}
                        </span>
                      </span>
                    </span>
                    <span className="rb-branch-time">{session.timestamp}</span>
                    <Ico.Right size={11} />
                  </button>
                );
              })}
            </div>
            <button type="button" aria-label="Start a new sessionfrom main" className="rb-new-session-cta" onClick={() => onStartNew(selectedRepo)}>
              <Ico.Plus size={12} />
              <span className="rb-new-label">Start a new session</span>
              <span className="mono rb-from-main">from main</span>
            </button>
          </section>
        )}
      </section>
    </main>
  );
};
