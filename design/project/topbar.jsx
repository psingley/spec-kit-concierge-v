// Top-bar pickers: repo chip, branch chip, gear menu, about modal

function useClickOutside(open, onClose) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  return ref;
}

// --- Repo chip ---
function RepoChip({ repo, onPick }) {
  const [open, setOpen] = React.useState(false);
  const ref = useClickOutside(open, () => setOpen(false));
  const [query, setQuery] = React.useState("");

  const recent = REPOS.filter(r => r.lastUsed);
  const others = REPOS.filter(r => !r.lastUsed);
  const filtered = query
    ? REPOS.filter(r => r.name.toLowerCase().includes(query.toLowerCase()))
    : null;

  return (
    <div className="tb-chip-wrap" ref={ref}>
      <button
        className={"tb-chip " + (open ? "is-open" : "")}
        onClick={() => setOpen(v => !v)}
      >
        <span className="tb-chip-prefix mono">collette-travel</span>
        <span className="tb-chip-slash">/</span>
        <span className="tb-chip-name mono">{repo || "pick repo"}</span>
        <span className="caret-down" />
      </button>

      {open && (
        <div className="tb-menu repo-menu">
          <div className="tb-menu-search">
            <Ico.Search />
            <input
              autoFocus
              placeholder="Filter repos…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>

          <div className="tb-menu-scroll">
            {filtered ? (
              filtered.length > 0 ? filtered.map(r => (
                <RepoMenuRow
                  key={r.name} r={r} active={r.name === repo}
                  onClick={() => { onPick(r.name); setOpen(false); setQuery(""); }}
                />
              )) : (
                <div className="tb-menu-empty">No repos match "{query}"</div>
              )
            ) : (
              <React.Fragment>
                {recent.length > 0 && (
                  <React.Fragment>
                    <div className="tb-menu-group"><Ico.Clock /> Recent</div>
                    {recent.map(r => (
                      <RepoMenuRow
                        key={r.name} r={r} active={r.name === repo}
                        showAge
                        onClick={() => { onPick(r.name); setOpen(false); }}
                      />
                    ))}
                    <div className="tb-menu-group">All repos</div>
                  </React.Fragment>
                )}
                {others.map(r => (
                  <RepoMenuRow
                    key={r.name} r={r} active={r.name === repo}
                    onClick={() => { onPick(r.name); setOpen(false); }}
                  />
                ))}
              </React.Fragment>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RepoMenuRow({ r, active, showAge, onClick }) {
  const branches = BRANCHES[r.name] || [];
  return (
    <button
      className={"tb-menu-row repo-menu-row " + (active ? "is-active" : "")}
      onClick={onClick}
    >
      <Ico.Folder size={12} />
      <span className="tb-menu-row-name">{r.name}</span>
      {branches.length > 0 && (
        <span className="tb-menu-row-pill">{branches.length}</span>
      )}
      <span className="tb-menu-row-meta">
        {showAge && r.lastUsed ? r.lastUsed : r.meta}
      </span>
    </button>
  );
}

// --- Branch chip ---
function BranchChip({ repo, branch, onResume, onNewSession }) {
  const [open, setOpen] = React.useState(false);
  const ref = useClickOutside(open, () => setOpen(false));

  const branches = BRANCHES[repo] || [];
  const hasBranches = branches.length > 0;

  // If no branches and no active branch, render a "New session" pill instead
  if (!branch && !hasBranches) {
    return (
      <button
        className="tb-chip tb-chip-new"
        onClick={() => onNewSession()}
        title="No prior sessions — start a new one"
      >
        <Ico.Plus size={11} />
        <span>New session</span>
      </button>
    );
  }

  return (
    <div className="tb-chip-wrap" ref={ref}>
      <button
        className={"tb-chip tb-chip-branch " + (open ? "is-open" : "")}
        onClick={() => setOpen(v => !v)}
      >
        <Ico.Branch size={11} />
        <span className="mono tb-chip-name">{branch || "main"}</span>
        <span className="caret-down" />
      </button>

      {open && (
        <div className="tb-menu branch-menu">
          <div className="tb-menu-h">
            {hasBranches ? `Sessions on ${repo}` : "No prior sessions"}
          </div>

          {hasBranches && (
            <div className="tb-menu-scroll">
              {branches.map(b => (
                <BranchMenuRow
                  key={b.name} b={b} active={b.name === branch}
                  onClick={() => { onResume(b); setOpen(false); }}
                />
              ))}
            </div>
          )}

          <button
            className="tb-menu-new"
            onClick={() => { onNewSession(); setOpen(false); }}
          >
            <Ico.Plus size={10} />
            Start new session
            <span className="mono branch-hint">from main</span>
          </button>
        </div>
      )}
    </div>
  );
}

function BranchMenuRow({ b, active, onClick }) {
  const stepIdx = STEP_ORDER.indexOf(b.step);
  return (
    <button
      className={"tb-menu-row branch-menu-row " + (active ? "is-active" : "")}
      onClick={onClick}
    >
      <span className="branch-glyph" />
      <span className="branch-row-main">
        <span className="branch-name mono">{b.name}</span>
        <span className="branch-meta">
          <span className="branch-step-label">{STEP_LABEL[b.step]}</span>
          <span className="branch-pips">
            {STEP_ORDER.map((_, i) => (
              <span key={i} className={"pip " + (i <= stepIdx ? "done" : "")} />
            ))}
          </span>
        </span>
      </span>
      <span className="branch-time">{b.timestamp}</span>
    </button>
  );
}

const STEP_ORDER = ["specify", "clarify", "plan", "analyze", "tasks", "final"];
const STEP_LABEL = { specify: "Specify", clarify: "Clarify", plan: "Plan", analyze: "Analyze", tasks: "Tasks", final: "Review" };

// --- Gear menu ---
function GearMenu({ log, onAbout, onFileRequest }) {
  const [open, setOpen] = React.useState(false);
  const ref = useClickOutside(open, () => setOpen(false));

  const exportLog = () => {
    const text = log.map(l => {
      const msg = l.m.replace(/<[^>]+>/g, "");
      return `${l.t}  ${l.g}  ${msg}`;
    }).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `spec-kit-log-${new Date().toISOString().slice(0,19).replace(/[T:]/g, "-")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  return (
    <div className="tb-chip-wrap" ref={ref}>
      <button
        className={"icon-btn " + (open ? "is-active" : "")}
        onClick={() => setOpen(v => !v)}
        title="Settings"
      >
        <Ico.Gear size={13} />
      </button>

      {open && (
        <div className="tb-menu gear-menu">
          <button className="gear-item" onClick={() => { setOpen(false); onFileRequest(); }}>
            <Ico.Bug />
            <span>Report a bug</span>
          </button>
          <button className="gear-item" onClick={exportLog}>
            <Ico.Download />
            <span>Export activity log</span>
            <span className="gear-item-sub mono">{log.length} lines</span>
          </button>
          <button className="gear-item" onClick={() => { setOpen(false); onAbout(); }}>
            <Ico.Info />
            <span>About</span>
          </button>
        </div>
      )}
    </div>
  );
}

// --- About modal ---
function AboutModal({ onClose, model, repo, branch }) {
  return (
    <div className="modal-veil" onClick={onClose}>
      <div className="modal about-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <Ico.Sparkles />
          <h3>Spec-kit Concierge</h3>
          <button className="icon-btn" onClick={onClose}><Ico.X /></button>
        </div>
        <div className="modal-body">
          <div className="about-tagline">
            An Electron wrapper around GitHub Copilot CLI driving the spec-kit workflow,
            tuned for the Collette-travel concierge team.
          </div>
          <div className="kv about-kv">
            <div className="k">Version</div><div className="v">2.0.0 (2026.05.20)</div>
            <div className="k">Org</div><div className="v">collette-travel</div>
            <div className="k">Repo</div><div className="v">{repo || "—"}</div>
            <div className="k">Branch</div><div className="v">{branch || "—"}</div>
            <div className="k">Copilot model</div><div className="v">{model}</div>
            <div className="k">spec-kit</div><div className="v">v0.9.4</div>
            <div className="k">Concierge team</div><div className="v">#concierge-triage</div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={() => window.open("#docs", "_blank")}>Documentation</button>
          <span style={{ flex: 1 }} />
          <button className="btn primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// --- Model picker ---
function ModelPicker({ value, onChange, compact }) {
  const [open, setOpen] = React.useState(false);
  const ref = useClickOutside(open, () => setOpen(false));
  const current = COPILOT_MODELS.find(m => m.id === value) || COPILOT_MODELS[0];

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

// --- Auth chip ---
function AuthChip({ auth, setAuth }) {
  const [open, setOpen] = React.useState(false);
  const ref = useClickOutside(open, () => setOpen(false));
  const ghOk = auth.gh === "ok";
  const copOk = auth.copilot === "ok";
  const bothOk = ghOk && copOk;
  const neither = !ghOk && !copOk;
  const partial = !bothOk && !neither;

  const status = bothOk ? "ok" : neither ? "off" : "partial";
  const label = bothOk
    ? "a.kim"
    : partial
      ? `${(ghOk ? 1 : 0) + (copOk ? 1 : 0)} of 2`
      : "Sign in";

  return (
    <div className="tb-chip-wrap" ref={ref}>
      <button
        className={"tb-chip auth-chip status-" + status + (open ? " is-open" : "")}
        onClick={() => setOpen(v => !v)}
        title={
          bothOk ? "Authenticated · click to manage"
          : partial ? "Partial sign-in · click to finish"
          : "Sign in to GitHub + Copilot CLI"
        }
      >
        <span className="auth-chip-dot" />
        <span className="auth-chip-label">{label}</span>
        <span className="caret-down" />
      </button>

      {open && (
        <div className="tb-menu auth-menu">
          <div className="tb-menu-h">Authentication</div>
          <div className="auth-menu-body">
            <AuthMiniRow
              icon={<Ico.Github size={12} />}
              label="GitHub CLI"
              sub={ghOk ? "a.kim" : "not logged in"}
              state={auth.gh}
              onToggle={() => setAuth(a => ({ ...a, gh: a.gh === "ok" ? "out" : "ok" }))}
            />
            <AuthMiniRow
              icon={<Ico.Copilot size={12} />}
              label="Copilot CLI"
              sub={copOk ? "active subscription" : !ghOk ? "requires GitHub CLI" : "not authorized"}
              state={auth.copilot}
              disabled={!ghOk}
              onToggle={() => setAuth(a => ({ ...a, copilot: a.copilot === "ok" ? "out" : "ok" }))}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function AuthMiniRow({ icon, label, sub, state, disabled, onToggle }) {
  const isOn = state === "ok";
  return (
    <button
      className={"auth-mini " + (isOn ? "is-on" : "is-off") + (disabled ? " is-disabled" : "")}
      onClick={disabled ? undefined : onToggle}
      disabled={disabled}
      type="button"
    >
      <span className="auth-mini-icon">{icon}</span>
      <span className="auth-mini-name">
        {label}
        <small>{sub}</small>
      </span>
      <span className="auth-mini-action">
        <span className="auth-dot" />
        {isOn
          ? <React.Fragment><span className="default">Connected</span><span className="hover">Sign out</span></React.Fragment>
          : <span className="default">{disabled ? "Locked" : "Login"}</span>}
      </span>
    </button>
  );
}

Object.assign(window, { RepoChip, BranchChip, GearMenu, AboutModal, AuthChip, ModelPicker });
