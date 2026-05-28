import React, { useMemo, useState } from 'react';
import type { BranchSession, RepositorySummary } from '../slices/workspace';
import { Ico } from './Icons';

export type RepoBrowseScreenProps = {
  repositories: RepositorySummary[];
  sessions: BranchSession[];
  selectedRepo: RepositorySummary | null;
  loading: boolean;
  onSelectRepo: (repo: RepositorySummary) => void;
  onResume: (repo: RepositorySummary, branch: string) => void;
  onStartNew: (repo: RepositorySummary) => void;
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

export const RepoBrowseScreen = ({ repositories, sessions, selectedRepo, loading, onSelectRepo, onResume, onStartNew }: RepoBrowseScreenProps): React.ReactElement => {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => repositories.filter((repo) => repo.name.toLowerCase().includes(query.toLowerCase())), [query, repositories]);
  const recent = filtered.filter((repo) => presentationFor(repo).recent);
  const others = filtered.filter((repo) => !presentationFor(repo).recent);
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
        ) : null}
        <h1 id="repo-heading" className="rb-h">{selectedRepo === null ? 'Pick a repository' : selectedRepo.name}</h1>
        {selectedRepo === null ? <p className="rb-sub">Choose a Collette-travel repo to scope spec-kit to.</p> : null}
        {selectedRepo === null ? (
          <label className="rb-search">
            <Ico.Search />
            <input aria-label="Search repositories" placeholder="Filter repos..." value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
        ) : null}
        {loading ? <p>Loading repositories...</p> : null}
        {selectedRepo === null ? (
          <div className="rb-list repo-list">
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
            <h2>{selectedRepo.name} sessions</h2>
            {sessions.map((session) => (
              <button key={session.branch} type="button" onClick={() => onResume(selectedRepo, session.branch)}>
                <span><Ico.Branch /> Resume {session.branch}</span>
              </button>
            ))}
            <button type="button" className="primary" onClick={() => onStartNew(selectedRepo)}>Start a new session</button>
          </section>
        )}
      </section>
    </main>
  );
};
