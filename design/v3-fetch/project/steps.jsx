// === Step views ===

// ---- Specify ----
function SpecifyStep({ prompt, setPrompt, md, setMd, onAdvance, requireScroll = true, started, complete, onBegin, busy }) {
  const [mode, setMode] = React.useState("preview"); // preview | edit | split
  const [progress, setProgress] = React.useState(0);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const scrollRef = React.useRef(null);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    const pct = max > 0 ? Math.min(100, (el.scrollTop / max) * 100) : 100;
    setProgress(pct);
  };

  React.useEffect(() => { handleScroll(); }, [md, mode]);

  const readComplete = !requireScroll || progress >= 98;

  // ---- Not-yet-started: prompt is an editable input ----
  if (!started) {
    return (
      <div className="specify-shell">
        <div className="prompt-input-card">
          <textarea
            className="prompt-input"
            placeholder="What do you want to build today?"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            autoFocus
            spellCheck={true}
          />
          <div className="prompt-input-foot">
            <button
              className="btn ghost"
              onClick={() => setPrompt("")}
              disabled={!prompt}
            >
              Clear
            </button>
            <span style={{ flex: 1 }} />
            <button
              className="btn primary"
              onClick={onBegin}
              disabled={!prompt.trim() || busy}
            >
              {busy ? <React.Fragment><div className="spinner sm" /> Specifying…</React.Fragment>
                    : <React.Fragment><Ico.Sparkles /> Begin specify</React.Fragment>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Started but pipeline still running: spinner only ----
  if (!complete) {
    return (
      <div className="specify-shell">
        <div className="spec-loading">
          <div className="spec-loading-ring">
            <div className="spinner" />
          </div>
          <div className="spec-loading-h">Specifying…</div>
          <div className="spec-loading-sub">
            Drafting <span className="mono">spec.md</span> from your prompt. Grounding against the codebase, generating goals and acceptance criteria, flagging ambiguities for the next step.
          </div>
          <div className="spec-loading-stream">
            <span className="dot" />
            <span>Watch progress in the activity stream.</span>
          </div>
        </div>
      </div>
    );
  }

  // ---- Complete: spec.md visible ----
  return (
    <div className="specify-shell">

      <div className="md-panel">
        <div className="md-tabs">
          <button
            className={"md-tab " + (mode === "preview" ? "is-active" : "")}
            onClick={() => setMode("preview")}
          >
            <Ico.Eye /> Preview
          </button>
          <button
            className={"md-tab " + (mode === "edit" ? "is-active" : "")}
            onClick={() => setMode("edit")}
          >
            <Ico.Edit /> Edit
          </button>
          <div className="spacer" />
          <span className="meta">spec.md · {md.split("\n").length} lines</span>
          <button className="md-tab" onClick={() => setEditorOpen(true)} title="Pop out editor">
            <Ico.Pop />
          </button>
        </div>

        <div className="read-progress">
          <div className="bar" style={{ width: `${progress}%` }} />
        </div>

        {mode === "preview" ? (
          <div className="md-scroll" ref={scrollRef} onScroll={handleScroll}>
            <div className="md-preview" dangerouslySetInnerHTML={{ __html: renderMarkdown(md) }} />
          </div>
        ) : (
          <textarea
            className="md-editor"
            value={md}
            onChange={e => setMd(e.target.value)}
            spellCheck={false}
          />
        )}
      </div>

      <div className="advance-row">
        <div className="gate">
          <span className={"gate-icon " + (readComplete ? "done" : "")}>
            {readComplete ? <Ico.Check /> : <React.Fragment>{Math.round(progress)}</React.Fragment>}
          </span>
          <span>
            {!requireScroll
              ? "Read-gate disabled — Clarify is unlocked."
              : readComplete
                ? "You've reviewed the full spec. Ready to clarify ambiguities."
                : "Scroll to the end of the spec to unlock the Clarify step."}
          </span>
        </div>
        <button
          className="btn ghost"
          onClick={() => {
            if (mode === "preview" && scrollRef.current) {
              scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
            } else {
              setProgress(100);
            }
          }}
        >
          Jump to end
        </button>
        <button
          className="btn primary"
          disabled={!readComplete}
          onClick={onAdvance}
        >
          Clarify <Ico.Right />
        </button>
      </div>

      {editorOpen && (
        <div className="modal-veil" onClick={() => setEditorOpen(false)}>
          <div className="modal" style={{ width: "min(900px, 100%)" }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <Ico.Edit />
              <h3>spec.md — popped-out editor</h3>
              <button className="icon-btn" onClick={() => setEditorOpen(false)}><Ico.X /></button>
            </div>
            <textarea
              className="md-editor"
              style={{ minHeight: "60vh", border: "none" }}
              value={md}
              onChange={e => setMd(e.target.value)}
              spellCheck={false}
            />
            <div className="modal-foot">
              <span style={{ flex: 1, fontSize: 11.5, color: "var(--text-faint)" }} className="mono">{md.length} chars</span>
              <button className="btn ghost" onClick={() => setEditorOpen(false)}>Close</button>
              <button className="btn primary" onClick={() => setEditorOpen(false)}>
                <Ico.Check /> Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Clarify ----
function ClarifyStep({ answers, setAnswers, onAdvance, onAskMore, addLog }) {
  const [idx, setIdx] = React.useState(0);
  const [extraCount, setExtraCount] = React.useState(0);

  const total = CLARIFY_QUESTIONS.length + extraCount;
  const isExtra = idx >= CLARIFY_QUESTIONS.length;

  const q = isExtra
    ? {
        id: `Q${idx + 1}`,
        text: "Should the new flow gracefully degrade on poor connectivity (offline retry, queued submit)?",
        context: "Generated on request — pulled from spec.md 'Open risks' section.",
        choices: [
          { key: "A", label: "Yes — queue submits and retry up to 3× over 5 minutes", sub: "Best UX. Adds an offline-aware state machine to mobile." },
          { key: "B", label: "No — fail-fast with a 'Try again' prompt",            sub: "Simplest. Maps to current concierge-app behavior." },
        ],
      }
    : CLARIFY_QUESTIONS[idx];

  const ans = answers[q.id] || {};
  const setAns = (patch) => setAnswers(a => ({ ...a, [q.id]: { ...a[q.id], ...patch } }));

  const canNext = !!ans.choice;
  const isLast = idx === total - 1;

  const next = () => {
    addLog("ok", "✓", `Captured answer for <strong>${q.id}</strong>: <em>${ans.choice}</em>`);
    if (isLast) { onAdvance(); return; }
    setIdx(i => i + 1);
  };

  const askMore = () => {
    setExtraCount(c => c + 1);
    setIdx(total); // jump to the new one
    addLog("info", "?", "User requested an additional clarification question.");
    onAskMore();
  };

  return (
    <div className="clarify-shell">
      <div className="clarify-progress">
        <span>Question {idx + 1} of {total}</span>
        <span style={{ color: "var(--text-faint)" }}>·</span>
        <span>{Object.keys(answers).length} answered</span>
        <div className="pips" style={{ marginLeft: "auto" }}>
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={"pip " + (i < idx ? "done" : i === idx ? "current" : "")}
            />
          ))}
        </div>
      </div>

      <div className="question-card">
        <div className="qtag">{q.id}</div>
        <p className="question-text">{q.text}</p>
        <p className="question-context">↳ {q.context}</p>

        <div className="choices">
          {q.choices.map(c => (
            <div
              key={c.key}
              className={"choice " + (ans.choice === c.key ? "is-selected" : "")}
              onClick={() => setAns({ choice: c.key })}
            >
              <div className="radio" />
              <div className="ckey">{c.key}</div>
              <div className="ctext">
                {c.label}
                <small>{c.sub}</small>
              </div>
            </div>
          ))}
        </div>

        <div className="short-answer-wrap">
          <div className="label">Or add detail / override</div>
          <textarea
            className="short-answer"
            placeholder="Optional — explain nuance, edge cases, or a preferred wording…"
            value={ans.note || ""}
            onChange={e => setAns({ note: e.target.value })}
          />
        </div>

        <div className="clarify-actions">
          <button
            className="btn ghost"
            disabled={idx === 0}
            onClick={() => setIdx(i => Math.max(0, i - 1))}
          >
            ← Previous
          </button>
          <span className="spacer" />
          <button className="btn" onClick={askMore}>
            <Ico.Sparkles /> Ask another question
          </button>
          <button
            className="btn primary"
            disabled={!canNext}
            onClick={next}
          >
            {isLast ? <React.Fragment>Finish clarify <Ico.Check /></React.Fragment>
                    : <React.Fragment>Next question <Ico.Right /></React.Fragment>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Plan / Tasks status board ----
function StatusStep({ stepName, items, onContinue, continueLabel }) {
  // items: { title, sub, status: done|active|wait|fail }
  const allDone = items.every(i => i.status === "done");
  const [viewArtifact, setViewArtifact] = React.useState(null);
  return (
    <div className="evidence-grid">
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>{stepName}</h2>
        <span className="mono" style={{ color: "var(--text-faint)", fontSize: 11.5 }}>
          {items.filter(i => i.status === "done").length} / {items.length} complete
        </span>
        <span style={{ flex: 1 }} />
        {!allDone && <span className="tag warn"><div className="spinner sm" /> running</span>}
        {allDone && <span className="tag ok"><Ico.Check /> complete</span>}
      </div>

      {items.map((it, i) => (
        <div key={i} className={"ev-row " + (it.status === "active" ? "active" : "")}>
          <div className={"ev-status " + it.status}>
            {it.status === "done" && <Ico.Check />}
            {it.status === "active" && <div className="spinner sm" />}
            {it.status === "fail" && <Ico.X />}
            {it.status === "wait" && <span style={{ fontFamily: "var(--mono)", fontSize: 10 }}>·</span>}
          </div>
          <div className="ev-main">
            <div className="ev-title">{it.title}</div>
            <div className="ev-sub">{it.sub}</div>
          </div>
          <div className="ev-actions">
            {it.evidence && (
              <button
                className="icon-btn"
                onClick={() => setViewArtifact(it.evidence)}
                disabled={it.status !== "done"}
                title={it.status === "done" ? `View ${it.evidence}` : `${it.evidence} (pending)`}
              >
                <Ico.File /> {it.evidence}
              </button>
            )}
          </div>
        </div>
      ))}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
        <button className="btn primary" disabled={!allDone} onClick={onContinue}>
          {continueLabel || "Continue"} <Ico.Right />
        </button>
      </div>

      {viewArtifact && <ArtifactViewer filename={viewArtifact} onClose={() => setViewArtifact(null)} />}
    </div>
  );
}

// ---- Artifact viewer modal — markdown or code preview ----
function ArtifactViewer({ filename, onClose }) {
  const file = EVIDENCE_FILES[filename];
  if (!file) return null;

  const copyToClipboard = () => {
    navigator.clipboard?.writeText(file.content);
  };

  const downloadFile = () => {
    const blob = new Blob([file.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.replace(/\//g, "-");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-veil" onClick={onClose}>
      <div className="modal artifact-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <Ico.File />
          <h3 className="mono">{filename}</h3>
          <span className="tag">{file.size}</span>
          <button className="icon-btn" onClick={copyToClipboard} title="Copy contents">
            <span style={{ fontSize: 11, fontFamily: "var(--mono)" }}>copy</span>
          </button>
          <button className="icon-btn" onClick={downloadFile} title="Download">
            <Ico.Download />
          </button>
          <button className="icon-btn" onClick={onClose} title="Close">
            <Ico.X />
          </button>
        </div>
        <div className="artifact-body">
          {file.kind === "markdown" ? (
            <div className="md-preview" dangerouslySetInnerHTML={{ __html: renderMarkdown(file.content) }} />
          ) : (
            <pre className="code-preview"><code>{file.content}</code></pre>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Task viewer modal ----
function TaskViewer({ taskId, onClose }) {
  const t = TASKS.find(x => x.id === taskId);
  const d = TASK_DETAILS[taskId];
  if (!t) return null;

  return (
    <div className="modal-veil" onClick={onClose}>
      <div className="modal task-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <span className={"task-pill pill " + t.area}>{t.area.toUpperCase()}</span>
          <h3 className="mono">{t.id}</h3>
          <span className="tag">{t.est}</span>
          <span style={{ flex: 1 }} />
          <button className="icon-btn" onClick={onClose} title="Close">
            <Ico.X />
          </button>
        </div>
        <div className="modal-body task-body">
          <h4 className="task-title">{t.title}</h4>
          {d ? (
            <React.Fragment>
              <p className="task-desc">{d.desc}</p>

              <div className="task-section">
                <div className="task-section-h">Files to touch</div>
                <div className="task-files">
                  {d.files.map(f => (
                    <span key={f} className="mono task-file"><Ico.File size={10} /> {f}</span>
                  ))}
                </div>
              </div>

              <div className="task-section">
                <div className="task-section-h">Acceptance criteria</div>
                <ul className="task-acceptance">
                  {d.acceptance.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>

              {d.blocks?.length > 0 && (
                <div className="task-section">
                  <div className="task-section-h">Blocked on</div>
                  <div className="task-blocks">
                    {d.blocks.map(b => <span key={b} className="mono task-block-pill">{b}</span>)}
                  </div>
                </div>
              )}
            </React.Fragment>
          ) : (
            <p className="task-desc" style={{ color: "var(--text-faint)" }}>
              No detail captured for this task yet.
            </p>
          )}
        </div>
        <div className="modal-foot">
          <span style={{ flex: 1, fontSize: 11, color: "var(--text-faint)" }} className="mono">
            from tasks.md
          </span>
          <button className="btn ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ---- JIRA syncing state (in-progress, before the success splash) ----
function JiraSyncingView({ tasks, onComplete }) {
  // Build the ticket queue: epic first, then each child issue.
  const queue = React.useMemo(() => {
    const items = [
      { kind: "epic", id: "CC-2420", title: "Self-serve flight-change for loyalty guests", task: null },
      ...tasks.map((t, i) => ({
        kind: "issue",
        id: `CC-${2421 + i}`,
        title: t.title,
        task: t,
      })),
    ];
    // Assign each ticket a realistic file-time. JIRA cloud round-trips run
    // anywhere from ~2s to ~12s depending on field load; epics are slower
    // than child issues, and there's a small head-of-queue spike.
    let i = 0;
    return items.map((it) => {
      const epicCost = it.kind === "epic" ? 4500 : 0;
      // Deterministic-ish jitter per index so the demo feels organic across
      // reloads without being truly random.
      const seed = (it.id.charCodeAt(it.id.length - 1) * 7) % 4000;
      const cost = 1800 + epicCost + seed;
      i++;
      return { ...it, cost };
    });
  }, [tasks]);

  const [states, setStates] = React.useState(() => queue.map(() => "queued"));
  // Smooth overall progress in [0, 1]. Drives both the progress bar and the
  // C spinner's pixelation / speed.
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    let i = 0;
    let alive = true;
    let raf = null;
    let ticketStart = 0;

    // Pre-compute the total weighted duration so per-ticket progress
    // contributes proportionally to overall progress.
    const totalCost = queue.reduce((s, q) => s + q.cost, 0);
    let costSoFar = 0;

    const tickWithin = () => {
      if (!alive) return;
      const item = queue[i];
      const now = performance.now();
      const elapsed = now - ticketStart;
      const localPct = Math.min(1, elapsed / item.cost);
      const overall = (costSoFar + localPct * item.cost) / totalCost;
      setProgress(overall);
      if (localPct < 1) {
        raf = requestAnimationFrame(tickWithin);
      } else {
        // Mark this one filed.
        setStates(s => s.map((v, idx) => idx === i ? "filed" : v));
        costSoFar += item.cost;
        i++;
        if (i >= queue.length) {
          setProgress(1);
          setTimeout(() => alive && onComplete?.(), 600);
          return;
        }
        startNext();
      }
    };

    const startNext = () => {
      if (!alive) return;
      const idx = i;
      setStates(s => s.map((v, k) => k === idx ? "filing" : v));
      ticketStart = performance.now();
      raf = requestAnimationFrame(tickWithin);
    };

    const startTimer = setTimeout(startNext, 350);
    return () => {
      alive = false;
      clearTimeout(startTimer);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [queue.length, onComplete]);

  const filed = states.filter(s => s === "filed").length;
  const total = queue.length;
  const pct = Math.round(progress * 100);

  // As progress climbs, the C refines toward perfection and speeds up.
  const pixelation = Math.max(0, 1 - progress) * 0.85 + 0.02;
  const speed = 1 + progress * 2.5;

  return (
    <div className="jira-syncing">
      <div className="jira-syncing-hero">
        <div className="jira-syncing-spinner">
          <PixelCSpinner
            size={9} cell={9}
            busy={true}
            speed={speed}
            pixelation={pixelation}
          />
        </div>
        <h1 className="jira-syncing-h">Syncing to JIRA</h1>
        <p className="jira-syncing-sub">
          The <em>ticket filer agent</em> is creating your epic and child issues.
          Don't close the app — URLs will resolve back as each ticket is filed.
        </p>
      </div>

      <div className="jira-syncing-progress">
        <div className="jsp-track">
          <div className="jsp-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="jsp-counts">
          <span className="jsp-pct mono">{pct}%</span>
        </div>
      </div>

      <div className="jira-syncing-list">
        {queue.map((item, idx) => {
          const state = states[idx];
          return (
            <div key={item.id} className={"jst-row jst-" + state + " jst-kind-" + item.kind}>
              <div className="jst-status">
                {state === "filed" && (
                  <svg viewBox="0 0 14 14" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7.2 5.8 10 11 4.2" />
                  </svg>
                )}
                {state === "filing" && (
                  <div className="jst-spinner">
                    <PixelCSpinner size={9} cell={1} busy={true} speed={2.4} pixelation={Math.max(0.15, pixelation)} />
                  </div>
                )}
                {state === "queued" && <span className="jst-dot" />}
              </div>
              <div className="jst-id mono">{item.id}</div>
              {item.kind === "epic" && <span className="jst-kind-tag">EPIC</span>}
              {item.kind === "issue" && item.task && (
                <span className={`pill ${item.task.area}`}>{item.task.area.toUpperCase()}</span>
              )}
              <div className="jst-title">{item.title}</div>
              <div className="jst-meta mono">
                {state === "filed" && "filed"}
                {state === "filing" && "filing…"}
                {state === "queued" && "queued"}
              </div>
            </div>
          );
        })}
      </div>

      <div className="jira-syncing-foot">
        <span className="jira-syncing-foot-note">
          Evidence committed. Waiting on the ticket filer agent to confirm URLs.
        </span>
      </div>
    </div>
  );
}

// ---- JIRA synced splash (post-sync success state) ----
function JiraSyncedSplash({ tasks, onBack }) {
  // Flat list of created issues; no special-casing of any single ticket.
  const issues = [
    { id: "CC-2420", kind: "epic", title: "Self-serve flight-change for loyalty guests" },
    ...tasks.map((t, i) => ({
      id: `CC-${2421 + i}`,
      kind: t.area,
      title: t.title,
    })),
  ];

  return (
    <div className="jira-splash">
      <div className="jira-splash-stage">
        <div className="jira-splash-hero">
          <div className="jira-rings">
            <span className="ring r1" />
            <span className="ring r2" />
            <span className="ring r3" />
          </div>
          <div className="jira-check">
            <svg viewBox="0 0 64 64" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 33 L28 43 L46 23" pathLength="1" />
            </svg>
          </div>
        </div>

        <h1 className="jira-splash-h">Synced to JIRA</h1>
        <p className="jira-splash-sub">Ready for engineering.</p>

        <div className="jira-tasks-h">
          <span>{issues.length} issues created</span>
          <span style={{ flex: 1 }} />
          <span className="jira-tasks-host mono">jira.collette-travel.io</span>
        </div>

        <div className="jira-tasks">
          {issues.map((iss, i) => (
            <a
              key={iss.id}
              href="#"
              className="jira-task"
              onClick={e => e.preventDefault()}
              style={{ animationDelay: `${300 + i * 40}ms` }}
              title={`Open ${iss.id} in JIRA`}
            >
              <span className="jira-task-link mono">
                <Ico.Pop size={10} />
                {iss.id}
              </span>
              <span className={`pill ${iss.kind}`}>{iss.kind.toUpperCase()}</span>
              <span className="jira-task-title">{iss.title}</span>
            </a>
          ))}
        </div>

        <div className="jira-foot">
          <button className="btn ghost" onClick={onBack}>← Back to review</button>
          <span style={{ flex: 1 }} />
        </div>
      </div>
    </div>
  );
}

// ---- Final tasks summary ----
function FinalStep({ repo, answers, onJira }) {
  const [syncState, setSyncState] = React.useState("idle");  // idle | syncing | synced
  const [viewArtifact, setViewArtifact] = React.useState(null);
  const [viewTask, setViewTask] = React.useState(null);

  if (syncState === "synced") {
    return <JiraSyncedSplash tasks={TASKS} onBack={() => setSyncState("idle")} />;
  }
  if (syncState === "syncing") {
    return (
      <JiraSyncingView
        tasks={TASKS}
        onComplete={() => setSyncState("synced")}
      />
    );
  }

  const evidence = [
    "spec.md", "clarifications.md", "plan.md",
    "research.md", "data-model.md", "analysis.md",
    "contracts/rebook.proto", "tasks.md",
  ];

  return (
    <div className="final-summary">
      <div className="summary-head">
        <h2>Ready for implementation</h2>
        <span className="badge"><Ico.Check size={9} /> ALL GATES PASSED</span>
        <span style={{ flex: 1 }} />
        <span className="mono" style={{ fontSize: 11.5, color: "var(--text-faint)" }}>
          0042-self-serve-flight-change
        </span>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <div className="h">
            <Ico.Folder />
            <span>Evidence artifacts</span>
            <span style={{ flex: 1 }} />
            <Ico.Check className="check" size={10} />
          </div>
          <div className="files">
            {evidence.map(f => (
              <a
                key={f} href="#"
                onClick={e => { e.preventDefault(); setViewArtifact(f); }}
              >
                <Ico.File /> {f}
                <span className="sz">{EVIDENCE_FILES[f]?.size}</span>
              </a>
            ))}
          </div>
        </div>

        <div className="summary-card">
          <div className="h">
            <Ico.Sparkles />
            <span>Resolved clarifications</span>
            <span style={{ flex: 1 }} />
            <Ico.Check className="check" size={10} />
          </div>
          <div className="kv">
            {Object.entries(answers).map(([qid, a]) => (
              <React.Fragment key={qid}>
                <div className="k">{qid}</div>
                <div className="v">
                  Chose <strong style={{ color: "var(--text)" }}>{a.choice}</strong>
                  {a.note ? <span style={{ color: "var(--text-faint)" }}> · note attached</span> : null}
                </div>
              </React.Fragment>
            ))}
            {Object.keys(answers).length === 0 && (
              <div style={{ gridColumn: "1/-1", color: "var(--text-faint)", fontSize: 11.5 }}>
                (No clarifications captured in this session)
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="task-list">
        <div className="task-list-head">
          <Ico.Folder />
          <span>Generated tasks</span>
          <span className="count">{TASKS.length} tasks · est. 22d</span>
          <span style={{ flex: 1 }} />
          <span className="tag info"><Ico.Github size={10} /> {repo}</span>
        </div>
        {TASKS.map(t => (
          <div
            key={t.id}
            className="task-item is-clickable"
            onClick={() => setViewTask(t.id)}
            title="View task details"
          >
            <div className="tnum">{t.id.split("-")[1]}</div>
            <div className="tid">{t.id}</div>
            <div>{t.title}</div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span className={`pill ${t.area}`}>{t.area.toUpperCase()}</span>
              <span className="tag">{t.est}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="final-actions">
        <span className="note">
          Review the evidence and task breakdown, then sync to JIRA when ready.
        </span>
        <button
          className="btn primary"
          onClick={() => {
            setSyncState("syncing");
            onJira();
          }}
          disabled={syncState !== "idle"}
        >
          {syncState === "syncing"
            ? <React.Fragment><div className="spinner sm" /> Syncing…</React.Fragment>
            : <React.Fragment><Ico.Jira /> Send to JIRA</React.Fragment>}
        </button>
      </div>

      {viewArtifact && <ArtifactViewer filename={viewArtifact} onClose={() => setViewArtifact(null)} />}
      {viewTask && <TaskViewer taskId={viewTask} onClose={() => setViewTask(null)} />}
    </div>
  );
}

window.SpecifyStep = SpecifyStep;
window.ClarifyStep = ClarifyStep;
window.StatusStep = StatusStep;
window.FinalStep = FinalStep;
