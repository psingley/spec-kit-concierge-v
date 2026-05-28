// Repo browse screen — two-step picker:
//   1. Pick a repo. If it has prior sessions, advance to step 2; else start new directly.
//   2. Pick a branch to resume, or start a new session.

function RepoBrowseScreen({ onResume, onNewSession }) {
  const [query, setQuery] = React.useState("");
  const [pickedRepo, setPickedRepo] = React.useState(null);

  if (pickedRepo) {
    return (
      <BranchPickerView
        repo={pickedRepo}
        onBack={() => setPickedRepo(null)}
        onResume={(b) => onResume(pickedRepo, b)}
        onNewSession={() => onNewSession(pickedRepo)}
      />
    );
  }

  const recent = REPOS.filter(r => r.lastUsed);
  const others = REPOS.filter(r => !r.lastUsed);
  const filtered = query
    ? REPOS.filter(r => r.name.toLowerCase().includes(query.toLowerCase()))
    : null;

  const handlePick = (repoName) => {
    const branches = BRANCHES[repoName] || [];
    if (branches.length === 0) {
      onNewSession(repoName);
    } else {
      setPickedRepo(repoName);
    }
  };

  const RepoRow = ({ r, showAge }) => {
    const branches = BRANCHES[r.name] || [];
    return (
      <button
        className={"rb-repo " + (r.lastUsed ? "is-recent" : "")}
        onClick={() => handlePick(r.name)}
      >
        <Ico.Folder size={13} />
        <span className="rb-repo-name">{r.name}</span>
        {branches.length > 0 ? (
          <span className="rb-repo-count">{branches.length} session{branches.length === 1 ? "" : "s"}</span>
        ) : (
          <span className="rb-repo-count rb-repo-count-new">new</span>
        )}
        <span className="rb-repo-meta">
          {showAge && r.lastUsed ? r.lastUsed : r.meta}
        </span>
        <Ico.Right size={11} />
      </button>
    );
  };

  return (
    <div className="rb-stage">
      <div className="rb-card">
        <div className="rb-mark">
          <Ico.Folder size={24} />
        </div>

        <h1 className="rb-h">Pick a repository</h1>
        <p className="rb-sub">
          Choose a Collette-travel repo to scope spec-kit to.
        </p>

        <div className="rb-search">
          <Ico.Search />
          <input
            autoFocus
            placeholder="Filter repos…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        <div className="rb-list">
          {filtered ? (
            filtered.length > 0 ? (
              filtered.map(r => <RepoRow key={r.name} r={r} />)
            ) : (
              <div className="rb-empty">No repos match "{query}"</div>
            )
          ) : (
            <React.Fragment>
              {recent.length > 0 && (
                <React.Fragment>
                  <div className="rb-group-h"><Ico.Clock /> Recent</div>
                  {recent.map(r => <RepoRow key={r.name} r={r} showAge />)}
                  <div className="rb-group-h">All repos</div>
                </React.Fragment>
              )}
              {others.map(r => <RepoRow key={r.name} r={r} />)}
            </React.Fragment>
          )}
        </div>
      </div>
    </div>
  );
}

function BranchPickerView({ repo, onBack, onResume, onNewSession }) {
  const branches = BRANCHES[repo] || [];

  return (
    <div className="rb-stage">
      <div className="rb-card">
        <button className="rb-back" onClick={onBack}>
          ← All repos
        </button>

        <div className="rb-mark">
          <Ico.Branch size={20} />
        </div>

        <h1 className="rb-h">{repo}</h1>
        <p className="rb-sub">
          Resume a prior session or start fresh from main.
        </p>

        <div className="rb-branches-h">
          {branches.length} prior {branches.length === 1 ? "session" : "sessions"}
        </div>

        <div className="rb-branch-list">
          {branches.map(b => {
            const stepIdx = STEP_ORDER.indexOf(b.step);
            return (
              <button
                key={b.name}
                className="rb-branch-card"
                onClick={() => onResume(b)}
              >
                <span className="rb-branch-glyph" />
                <div className="rb-branch-card-main">
                  <div className="rb-branch-name mono">{b.name}</div>
                  <div className="rb-branch-meta">
                    <span className="rb-branch-step">{STEP_LABEL[b.step]}</span>
                    <span className="rb-branch-pips">
                      {STEP_ORDER.map((_, i) => (
                        <span key={i} className={"pip " + (i <= stepIdx ? "done" : "")} />
                      ))}
                    </span>
                  </div>
                </div>
                <span className="rb-branch-time">{b.timestamp}</span>
                <Ico.Right size={11} />
              </button>
            );
          })}
        </div>

        <button className="rb-new-session-cta" onClick={onNewSession}>
          <Ico.Plus size={12} />
          <span className="rb-new-label">Start a new session</span>
          <span className="mono rb-from-main">from main</span>
        </button>
      </div>
    </div>
  );
}

window.RepoBrowseScreen = RepoBrowseScreen;
