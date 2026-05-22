// === Step views ===

// ---- Specify ----
function SpecifyStep({ prompt, setPrompt, md, setMd, onAdvance, requireScroll = true }) {
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

  return (
    <div className="specify-shell">
      <div className="prompt-card">
        <div className="label">Specify prompt</div>
        <div className="prompt-text">{prompt}</div>
      </div>

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
            {readComplete ? <Ico.Check /> : <span style={{ fontSize: 9, fontFamily: "var(--mono)" }}>{Math.round(progress)}%</span>}
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
              <button className="icon-btn" title={`View ${it.evidence}`}>
                <Ico.File /> {it.evidence}
              </button>
            )}
            {it.status === "done" && (
              <button className="icon-btn" title="View diff">
                <Ico.Eye />
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
    </div>
  );
}

// ---- Final tasks summary ----
function FinalStep({ repo, answers, onJira, onImplement }) {
  const [implementOk, setImplementOk] = React.useState(false);
  const [sentJira, setSentJira] = React.useState(false);

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
            <a href="#"><Ico.File /> spec.md <span className="sz">4.1 KB</span></a>
            <a href="#"><Ico.File /> clarifications.md <span className="sz">1.8 KB</span></a>
            <a href="#"><Ico.File /> plan.md <span className="sz">6.3 KB</span></a>
            <a href="#"><Ico.File /> research.md <span className="sz">3.2 KB</span></a>
            <a href="#"><Ico.File /> data-model.md <span className="sz">2.0 KB</span></a>
            <a href="#"><Ico.File /> analysis.md <span className="sz">2.4 KB</span></a>
            <a href="#"><Ico.File /> contracts/rebook.proto <span className="sz">1.1 KB</span></a>
            <a href="#"><Ico.File /> tasks.md <span className="sz">2.9 KB</span></a>
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
          <div key={t.id} className="task-item">
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
          Implementation is disabled until you sync to JIRA. Verify the task breakdown first.
        </span>
        <button
          className="btn"
          onClick={() => {
            setSentJira(true);
            setImplementOk(true);
            onJira();
          }}
          disabled={sentJira}
        >
          {sentJira ? <React.Fragment><Ico.Check /> Sent to JIRA</React.Fragment>
                    : <React.Fragment><Ico.Jira /> Send to JIRA</React.Fragment>}
        </button>
        <button
          className="btn primary"
          disabled={!implementOk}
          onClick={onImplement}
          title={!implementOk ? "Send to JIRA first to unlock implementation" : ""}
        >
          <Ico.Play /> Implement <span className="kbd">⌘↵</span>
        </button>
      </div>
    </div>
  );
}

window.SpecifyStep = SpecifyStep;
window.ClarifyStep = ClarifyStep;
window.StatusStep = StatusStep;
window.FinalStep = FinalStep;
