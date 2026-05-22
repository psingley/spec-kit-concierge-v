// Sidebar: auth status, repo picker, user footer

function AuthRow({ label, subOn, subOff, state, disabled, onToggle }) {
  const isOn = state === "ok";
  return (
    <button
      className={"auth-row " + (isOn ? "is-on" : "is-off") + (disabled ? " is-disabled" : "")}
      onClick={disabled ? undefined : onToggle}
      disabled={disabled}
      type="button"
    >
      <div className="name">
        {label}
        <small>{isOn ? subOn : subOff}</small>
      </div>
      <span className="auth-action">
        <span className="auth-dot" />
        {isOn
          ? <React.Fragment><span className="default">Connected</span><span className="hover">Sign out</span></React.Fragment>
          : <span className="default">{disabled ? "Locked" : "Login"}</span>}
      </span>
    </button>
  );
}

function ModelPicker({ value, onChange, compact }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  const current = COPILOT_MODELS.find(m => m.id === value) || COPILOT_MODELS[0];

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (compact) {
    return (
      <div className="model-picker compact" ref={ref}>
        <button className="model-trigger" onClick={() => setOpen(v => !v)} title={`Model: ${current.label}`}>
          <Ico.Copilot size={11} />
          <span style={{ width: 6, height: 6, borderRadius: 3, background: "var(--accent)" }} />
        </button>
        {open && <ModelMenu value={value} onChange={(v) => { onChange(v); setOpen(false); }} />}
      </div>
    );
  }

  return (
    <div className="model-picker" ref={ref}>
      <button className="model-trigger" onClick={() => setOpen(v => !v)}>
        <Ico.Copilot size={11} />
        <span className="model-name">{current.label}</span>
        {current.tag && <span className="model-tag">{current.tag}</span>}
        <span className="caret-down" />
      </button>
      {open && <ModelMenu value={value} onChange={(v) => { onChange(v); setOpen(false); }} />}
    </div>
  );
}

function ModelMenu({ value, onChange }) {
  return (
    <div className="model-menu">
      <div className="model-menu-h">Copilot CLI model</div>
      {COPILOT_MODELS.map(m => (
        <button
          key={m.id}
          className={"model-option " + (m.id === value ? "is-selected" : "")}
          onClick={() => onChange(m.id)}
        >
          <span className="model-check">{m.id === value ? <Ico.Check size={10} /> : null}</span>
          <span className="model-name">{m.label}</span>
          {m.tag && <span className="model-tag">{m.tag}</span>}
        </button>
      ))}
      <div className="model-menu-foot">
        <Ico.Term size={10} /> <span className="mono">copilot config set model</span>
      </div>
    </div>
  );
}

// derive 2-char identifier from a repo name like "concierge-api" → "CA"
function initials(name) {
  const parts = name.split(/[-_]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function Sidebar({ auth, setAuth, repo, setRepo, collapsed, onToggleCollapse, onFileRequest, model, setModel, onResumeBranch }) {
  const [query, setQuery] = React.useState("");
  const [expanded, setExpanded] = React.useState(null);  // name of expanded repo

  const recent = React.useMemo(() => REPOS.filter(r => r.lastUsed), []);
  const others = React.useMemo(() => REPOS.filter(r => !r.lastUsed), []);

  const filtered = React.useMemo(() => {
    if (!query) return REPOS;
    return REPOS.filter(r => r.name.toLowerCase().includes(query.toLowerCase()));
  }, [query]);

  const bothReady = auth.gh === "ok" && auth.copilot === "ok";

  const onRepoClick = (name) => {
    if (collapsed) {
      onToggleCollapse(); // expand sidebar first
    }
    setExpanded(prev => prev === name ? null : name);
  };

  const newSession = (name) => {
    setRepo(name);
    setExpanded(null);
    onResumeBranch?.(name, null);
  };

  const resumeBranch = (name, branch) => {
    setRepo(name);
    setExpanded(null);
    onResumeBranch?.(name, branch);
  };

  if (collapsed) {
    return (
      <aside className="sidebar is-collapsed">
        <button
          className="sb-collapse-btn"
          onClick={onToggleCollapse}
          title="Expand sidebar"
        >
          <span className="caret-right" />
        </button>

        <div className="sb-rail">
          <div className="rail-group" title="Authentication">
            <div className={"rail-auth " + (auth.gh === "ok" ? "ok" : "warn")} title={"GitHub CLI: " + (auth.gh === "ok" ? "connected" : "logged out")}>
              <Ico.Github size={14} />
            </div>
            <div className={"rail-auth " + (auth.copilot === "ok" ? "ok" : auth.gh !== "ok" ? "locked" : "warn")} title={"Copilot CLI: " + (auth.copilot === "ok" ? "connected" : "logged out")}>
              <Ico.Copilot size={14} />
            </div>
          </div>

          <div className="rail-sep" />

          <div className="rail-group">
            {bothReady ? (
              <React.Fragment>
                {recent.map(r => (
                  <button
                    key={r.name}
                    className={"rail-repo is-recent " + (repo === r.name ? "is-active" : "")}
                    onClick={() => onRepoClick(r.name)}
                    title={`${r.name} · ${r.lastUsed}`}
                  >
                    <span className="rail-initials">{initials(r.name)}</span>
                  </button>
                ))}
                {recent.length > 0 && <div className="rail-sep" />}
                {others.slice(0, 8 - Math.min(recent.length, 4)).map(r => (
                  <button
                    key={r.name}
                    className={"rail-repo " + (repo === r.name ? "is-active" : "")}
                    onClick={() => onRepoClick(r.name)}
                    title={r.name}
                  >
                    <span className="rail-initials">{initials(r.name)}</span>
                  </button>
                ))}
                <button className="rail-repo more" onClick={onToggleCollapse} title="Show all repos">
                  +{REPOS.length - (recent.length + others.slice(0, 8 - Math.min(recent.length, 4)).length)}
                </button>
              </React.Fragment>
            ) : (
              <div className="rail-empty" title="Sign in to load repos">—</div>
            )}
          </div>
          <div className="rail-sep" />

          {auth.copilot === "ok" && (
            <ModelPicker value={model} onChange={setModel} compact />
          )}
        </div>

        <button
          className="rail-foot-btn"
          onClick={onFileRequest}
          title="File a request to the concierge team"
        >
          <Ico.Mail size={14} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="sidebar">
      <div className="sb-section">
        <div className="sb-h">
          <span>Authentication</span>
          <button className="sb-collapse-inline" onClick={onToggleCollapse} title="Collapse sidebar">
            <span className="caret-left" />
          </button>
        </div>

        <AuthRow
          label="GitHub CLI"
          subOn="logged in as a.kim"
          subOff="not logged in"
          state={auth.gh}
          onToggle={() => setAuth(a => ({ ...a, gh: a.gh === "ok" ? "out" : "ok" }))}
        />
        <AuthRow
          label="Copilot CLI"
          subOn="active subscription"
          subOff={auth.gh !== "ok" ? "requires GitHub CLI" : "not authorized"}
          state={auth.copilot}
          disabled={auth.gh !== "ok"}
          onToggle={() => setAuth(a => ({ ...a, copilot: a.copilot === "ok" ? "out" : "ok" }))}
        />

        {auth.copilot === "ok" && (
          <ModelPicker value={model} onChange={setModel} />
        )}
      </div>

      <div className="sb-section flex">
        <div className="sb-h">
          <span>Collette-travel repos</span>
          <span className="mono" style={{ color: "var(--text-faint)", textTransform: "none", letterSpacing: 0 }}>
            {bothReady ? `${REPOS.length}` : "—"}
          </span>
        </div>

        {bothReady ? (
          <React.Fragment>
            <div className="repo-search-wrap">
              <span className="repo-search-icon"><Ico.Search /></span>
              <input
                className="repo-search"
                placeholder="Filter repos…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
            <div className="repo-list">
              {query ? (
                <React.Fragment>
                  {filtered.map(r => (
                    <RepoRow
                      key={r.name} r={r}
                      active={repo === r.name}
                      expanded={expanded === r.name}
                      onClick={() => onRepoClick(r.name)}
                      onResume={(b) => resumeBranch(r.name, b)}
                      onNew={() => newSession(r.name)}
                    />
                  ))}
                  {filtered.length === 0 && (
                    <div style={{ padding: "16px 10px", color: "var(--text-faint)", fontSize: 11.5 }}>
                      No repos match "{query}"
                    </div>
                  )}
                </React.Fragment>
              ) : (
                <React.Fragment>
                  {recent.length > 0 && (
                    <React.Fragment>
                      <div className="repo-group-h"><Ico.Clock /> Recent</div>
                      {recent.map(r => (
                        <RepoRow
                          key={r.name} r={r}
                          active={repo === r.name}
                          expanded={expanded === r.name}
                          onClick={() => onRepoClick(r.name)}
                          onResume={(b) => resumeBranch(r.name, b)}
                          onNew={() => newSession(r.name)}
                          showAge
                        />
                      ))}
                      <div className="repo-group-h">All repos</div>
                    </React.Fragment>
                  )}
                  {others.map(r => (
                    <RepoRow
                      key={r.name} r={r}
                      active={repo === r.name}
                      expanded={expanded === r.name}
                      onClick={() => onRepoClick(r.name)}
                      onResume={(b) => resumeBranch(r.name, b)}
                      onNew={() => newSession(r.name)}
                    />
                  ))}
                </React.Fragment>
              )}
            </div>
          </React.Fragment>
        ) : (
          <div style={{
            padding: "24px 4px", color: "var(--text-faint)",
            fontSize: 11.5, lineHeight: 1.55,
          }}>
            Sign in to both CLIs above to load the Collette-travel organization repos.
          </div>
        )}
      </div>

      <button className="sb-foot-btn" onClick={onFileRequest}>
        <Ico.Mail size={13} />
        <span>File a request</span>
      </button>
    </aside>
  );
}

function RepoRow({ r, active, expanded, onClick, onResume, onNew, showAge }) {
  const branches = BRANCHES[r.name] || [];
  return (
    <React.Fragment>
      <div
        className={"repo "
          + (active ? "is-active " : "")
          + (expanded ? "is-expanded " : "")
          + (r.lastUsed ? "is-recent" : "")}
        onClick={onClick}
      >
        <Ico.Folder size={12} />
        <span className="repo-name">{r.name}</span>
        {branches.length > 0 && <span className="repo-branch-count">{branches.length}</span>}
        <span className="repo-meta">{showAge && r.lastUsed ? r.lastUsed : r.meta}</span>
        <span className={"repo-caret " + (expanded ? "is-open" : "")} />
      </div>
      {expanded && (
        <div className="repo-tree">
          {branches.map(b => (
            <BranchRow key={b.name} b={b} onClick={() => onResume(b)} />
          ))}
          {branches.length === 0 && (
            <div className="repo-tree-empty">No prior sessions</div>
          )}
          <button className="repo-tree-new" onClick={onNew}>
            <span className="plus"><Ico.Plus size={10} /></span>
            Start new session
          </button>
        </div>
      )}
    </React.Fragment>
  );
}

const STEP_ORDER = ["specify", "clarify", "plan", "analyze", "tasks", "final"];
const STEP_LABEL = { specify: "Specify", clarify: "Clarify", plan: "Plan", analyze: "Analyze", tasks: "Tasks", final: "Review" };

function BranchRow({ b, onClick }) {
  const stepIdx = STEP_ORDER.indexOf(b.step);
  return (
    <button className="branch-row" onClick={onClick}>
      <span className="branch-glyph" />
      <span className="branch-name mono">{b.name}</span>
      <span className="branch-step">
        <span className="branch-step-label">{STEP_LABEL[b.step]}</span>
        <span className="branch-pips">
          {STEP_ORDER.map((_, i) => (
            <span key={i} className={"pip " + (i <= stepIdx ? "done" : "")} />
          ))}
        </span>
      </span>
      <span className="branch-time">{b.timestamp}</span>
    </button>
  );
}

window.Sidebar = Sidebar;
