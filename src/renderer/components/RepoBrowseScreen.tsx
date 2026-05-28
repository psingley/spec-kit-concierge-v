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

export const RepoBrowseScreen = ({ repositories, sessions, selectedRepo, loading, onSelectRepo, onResume, onStartNew }: RepoBrowseScreenProps): React.ReactElement => {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => repositories.filter((repo) => repo.name.toLowerCase().includes(query.toLowerCase())), [query, repositories]);
  return (
    <main className="screen repo-browser" aria-labelledby="repo-heading">
      <section className="hero-card wide">
        <h1 id="repo-heading">{selectedRepo === null ? 'Pick a repository' : selectedRepo.name}</h1>
        <input aria-label="Search repositories" placeholder="Search repositories" value={query} onChange={(event) => setQuery(event.target.value)} />
        {loading ? <p>Loading repositories...</p> : null}
        {selectedRepo === null ? (
          <div className="repo-list">
            {filtered.map((repo) => (
              <button key={repo.id} type="button" className="repo-card" onClick={() => onSelectRepo(repo)}>
                <strong><Ico.Folder /> {repo.owner}/{repo.name}</strong>
                <small>{repo.defaultBranch} - {repo.language ?? 'mixed'}</small>
                <span>{repo.description ?? 'Spec-kit workspace'}</span>
              </button>
            ))}
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
