// === Main app shell ===

const STEPS = [
  { id: "specify",   label: "Specify",   sub: "draft spec.md",            mode: "human" },
  { id: "clarify",   label: "Clarify",   sub: "resolve ambiguities",      mode: "human" },
  { id: "plan",      label: "Plan",      sub: "research + architecture",  mode: "ai"    },
  { id: "analyze",   label: "Analyze",   sub: "cross-check spec vs plan", mode: "ai"    },
  { id: "tasks",     label: "Tasks",     sub: "break into work units",    mode: "ai"    },
  { id: "final",     label: "Review",    sub: "ship to JIRA / implement", mode: "human" },
];

const PLAN_ITEMS_SEED = [
  { title: "Research existing rebook contracts",     sub: "scanning booking-engine/rebook-rules-v3.go", status: "wait" },
  { title: "Pull schema from itinerary-service",     sub: "REST v2 OpenAPI · loyalty-ledger append log", status: "wait" },
  { title: "Draft data-model.md",                    sub: "entities, transitions, invariants",          status: "wait", evidence: "data-model.md" },
  { title: "Draft research.md",                      sub: "supplier APIs, throttling, prior incidents", status: "wait", evidence: "research.md" },
  { title: "Draft architecture in plan.md",          sub: "sequence diagram + rollback strategy",       status: "wait", evidence: "plan.md" },
  { title: "Verify against constitution.md",         sub: "no banned dependencies · auth invariants",   status: "wait" },
  { title: "Commit plan branch",                     sub: "spec/0042-self-serve-flight-change",         status: "wait" },
];

const ANALYZE_ITEMS_SEED = [
  { title: "Diff spec.md against plan.md",              sub: "section-by-section consistency check",               status: "wait" },
  { title: "Verify acceptance criteria → plan coverage", sub: "5 criteria · all mapped to architecture decisions",  status: "wait" },
  { title: "Scan for unresolved clarifications",        sub: "any remaining [NEEDS CLARIFICATION] markers",         status: "wait" },
  { title: "Detect contradictions",                     sub: "rebook-rules v3 vs award-ticket exclusion",           status: "wait" },
  { title: "Check coverage gaps",                       sub: "non-functional reqs · observability · rollback",      status: "wait" },
  { title: "Draft analysis.md",                         sub: "findings, severities, recommended fixes",             status: "wait", evidence: "analysis.md" },
  { title: "Resolve 2 medium findings",                 sub: "auto-applied to plan.md",                             status: "wait" },
  { title: "Commit analyze branch",                     sub: "spec/0042-self-serve-flight-change",                  status: "wait" },
];

const TASK_ITEMS_SEED = [
  { title: "Generate task graph from plan.md",       sub: "topological order · parallelizable groups", status: "wait" },
  { title: "Estimate per-task effort",               sub: "calibrated against last 6 epics",           status: "wait" },
  { title: "Map tasks to repo ownership",            sub: "9 fe · 4 be · 1 db · 2 qa",                 status: "wait" },
  { title: "Cross-check against existing roadmap",   sub: "no conflict with Q3 OKRs",                  status: "wait" },
  { title: "Draft tasks.md",                         sub: "12 atomic, testable units",                 status: "wait", evidence: "tasks.md" },
  { title: "Commit tasks branch",                    sub: "spec/0042-self-serve-flight-change",        status: "wait" },
];

function ModeBadge({ mode, busy }) {
  if (mode === "ai") {
    return (
      <span className="mode-badge mode-ai">
        {busy ? <div className="spinner sm" /> : <Ico.Sparkles size={10} />}
        <span>Concierge working</span>
      </span>
    );
  }
  return (
    <span className="mode-badge mode-human">
      <span className="dot" />
      <span>Your turn</span>
    </span>
  );
}

function App() {
  const [t, setTweak] = useTweaks(/*EDITMODE-BEGIN*/{
    "accent": ["#3a7e9a", "#132f3b"],
    "activitySide": "right",
    "density": "regular",
    "requireScrollToUnlock": true
  }/*EDITMODE-END*/);

  const accent = Array.isArray(t.accent) ? t.accent[0] : t.accent;
  const accentDim = Array.isArray(t.accent) ? t.accent[1] : t.accent;

  const [auth, setAuth] = React.useState({ gh: "out", copilot: "out", atlassian: "out" });
  const [repo, setRepo] = React.useState(null);
  const [branch, setBranch] = React.useState(null);
  const [step, setStep] = React.useState("specify");
  const [maxStep, setMaxStep] = React.useState("specify");  // furthest progressed
  const [model, setModel] = React.useState("claude-sonnet-4-5");

  const [prompt, setPrompt] = React.useState(SAMPLE_PROMPT);
  const [md, setMd] = React.useState(SPEC_MD);
  const [answers, setAnswers] = React.useState({});
  const [specStarted, setSpecStarted] = React.useState(false);
  const [specComplete, setSpecComplete] = React.useState(false);

  const [planItems, setPlanItems] = React.useState(PLAN_ITEMS_SEED);
  const [analyzeItems, setAnalyzeItems] = React.useState(ANALYZE_ITEMS_SEED);
  const [taskItems, setTaskItems] = React.useState(TASK_ITEMS_SEED);

  const [log, setLog] = React.useState(INITIAL_LOG);
  const [busy, setBusy] = React.useState(false);
  const [current, setCurrent] = React.useState("Idle.");
  const [showActivity, setShowActivity] = React.useState(false);
  const [showRequest, setShowRequest] = React.useState(false);

  const stepIndex = STEPS.findIndex(s => s.id === step);
  const maxStepIndex = STEPS.findIndex(s => s.id === maxStep);

  const addLog = React.useCallback((k, g, m) => {
    const now = new Date();
    const t = now.toTimeString().slice(0, 8);
    setLog(L => [...L, { t, k, g, m }]);
  }, []);

  const clearLog = () => setLog(INITIAL_LOG);

  // Auth side-effects → activity log
  React.useEffect(() => {
    if (auth.gh === "ok") {
      addLog("cmd", "$", "<strong>gh auth login</strong> --hostname github.com --web");
      addLog("info", "→", "Opening browser for device code…");
      setTimeout(() => addLog("ok", "✓", "Authenticated as <em>a.kim</em> · scopes: repo, read:org"), 250);
    }
  }, [auth.gh]);

  React.useEffect(() => {
    if (auth.copilot === "ok") {
      addLog("cmd", "$", "<strong>gh copilot auth</strong>");
      setTimeout(() => addLog("ok", "✓", "Copilot CLI active · model: <em>gpt-5-codex</em>"), 200);
      setTimeout(() => addLog("info", "→", "Fetching collette-travel org repos…"), 400);
      setTimeout(() => addLog("ok", "✓", `Loaded <strong>${REPOS.length}</strong> repositories`), 700);
    }
  }, [auth.copilot]);

  // Log model switches
  React.useEffect(() => {
    if (auth.copilot !== "ok") return;
    const m = COPILOT_MODELS.find(x => x.id === model);
    addLog("cmd", "$", `<strong>copilot</strong> config set model <em>${model}</em>`);
    addLog("ok", "✓", `Model switched to <strong>${m?.label || model}</strong>`);
  }, [model]);

  React.useEffect(() => {
    if (auth.atlassian === "ok") {
      addLog("cmd", "$", "<strong>atlassian mcp</strong> connect");
      addLog("ok", "✓", "Atlassian MCP connected · <em>collette-travel.atlassian.net</em>");
    }
  }, [auth.atlassian]);

  // Repo selection
  React.useEffect(() => {
    if (!repo) return;
    addLog("cmd", "$", `<strong>cd</strong> ~/work/${repo} &amp;&amp; <strong>git pull</strong>`);
    addLog("ok", "✓", `Workspace mounted: <em>${repo}</em>`);
    setCurrent(`Workspace: <span>${repo}</span> · awaiting prompt`);
  }, [repo]);

  // Kick off the specify pipeline. Called explicitly when user clicks Begin.
  const runSpecifyPipeline = () => {
    setSpecStarted(true);
    setSpecComplete(false);
    setBusy(true);

    // Branch is created at specify time (matching real spec-kit behavior),
    // not when the user clicks "New session". Until then, they're on main.
    let activeBranch = branch;
    if (!activeBranch) {
      activeBranch = `spec/draft-${Date.now().toString(36).slice(-4)}`;
      setBranch(activeBranch);
      addLog("cmd", "$", `<strong>git checkout -b</strong> <em>${activeBranch}</em>`);
    }

    setCurrent(`Drafting <span>spec.md</span> from prompt…`);
    addLog("cmd", "$", `<strong>copilot</strong> specify`);

    const ticks = [
      ["info", "→", "Grounding against <em>booking-engine</em> conventions"],
      ["info", "→", "Pulling glossary from <em>concierge-shared-ui</em>"],
      ["info", "→", "Generating problem · goals · acceptance criteria"],
      ["info", "→", "Detecting open ambiguities for clarify step"],
      ["ok",   "✓", "Drafted <strong>spec.md</strong> (32 lines, 5 ambiguities flagged)"],
    ];
    ticks.forEach((l, i) => setTimeout(() => addLog(...l), 400 + i * 280));
    setTimeout(() => {
      setBusy(false);
      setSpecComplete(true);
      setCurrent("Awaiting spec review.");
    }, 400 + ticks.length * 280);
  };

  // ---- Run the plan step pipeline ----
  const runPlanPipeline = () => {
    setBusy(true);
    setCurrent("Plan step running…");
    addLog("cmd", "$", "<strong>copilot</strong> plan --spec spec.md --clarifications clarifications.md");

    PLAN_ITEMS_SEED.forEach((it, i) => {
      setTimeout(() => {
        setPlanItems(items => items.map((x, idx) =>
          idx === i ? { ...x, status: "active" }
          : idx < i ? { ...x, status: "done" }
          : x
        ));
        setCurrent(`<span>plan</span> · ${it.title}`);
        addLog("info", "→", it.title);
      }, i * 700);
    });

    setTimeout(() => {
      setPlanItems(items => items.map(x => ({ ...x, status: "done" })));
      addLog("ok", "✓", "Plan step complete · 3 artifacts written");
      setCurrent("Plan complete. Awaiting tasks step.");
      setBusy(false);
    }, PLAN_ITEMS_SEED.length * 700 + 100);
  };

  const runAnalyzePipeline = () => {
    setBusy(true);
    setCurrent("Analyze step running…");
    addLog("cmd", "$", "<strong>copilot</strong> analyze --spec spec.md --plan plan.md");

    ANALYZE_ITEMS_SEED.forEach((it, i) => {
      setTimeout(() => {
        setAnalyzeItems(items => items.map((x, idx) =>
          idx === i ? { ...x, status: "active" }
          : idx < i ? { ...x, status: "done" }
          : x
        ));
        setCurrent(`<span>analyze</span> · ${it.title}`);
        addLog("info", "→", it.title);
      }, i * 700);
    });

    setTimeout(() => {
      setAnalyzeItems(items => items.map(x => ({ ...x, status: "done" })));
      addLog("ok", "✓", "Analyze step complete · 0 blocking findings");
      setCurrent("Analysis clean. Awaiting tasks step.");
      setBusy(false);
    }, ANALYZE_ITEMS_SEED.length * 700 + 100);
  };

  const runTasksPipeline = () => {    setBusy(true);
    setCurrent("Tasks step running…");
    addLog("cmd", "$", "<strong>copilot</strong> tasks --plan plan.md");

    TASK_ITEMS_SEED.forEach((it, i) => {
      setTimeout(() => {
        setTaskItems(items => items.map((x, idx) =>
          idx === i ? { ...x, status: "active" }
          : idx < i ? { ...x, status: "done" }
          : x
        ));
        setCurrent(`<span>tasks</span> · ${it.title}`);
        addLog("info", "→", it.title);
      }, i * 700);
    });

    setTimeout(() => {
      setTaskItems(items => items.map(x => ({ ...x, status: "done" })));
      addLog("ok", "✓", `Tasks step complete · <strong>${TASKS.length}</strong> tasks generated`);
      setCurrent("Ready for review.");
      setBusy(false);
    }, TASK_ITEMS_SEED.length * 700 + 100);
  };

  // Helpers to advance maxStep monotonically
  const stepOrder = STEPS.map(s => s.id);
  const advanceTo = (id) => {
    const next = stepOrder.indexOf(id);
    const cur = stepOrder.indexOf(maxStep);
    if (next > cur) setMaxStep(id);
    setStep(id);
  };

  // Advance handlers
  const goClarify = () => {
    advanceTo("clarify");
    addLog("ok", "✓", "Spec accepted. Entering <em>clarify</em> step.");
    addLog("cmd", "$", "<strong>copilot</strong> clarify --spec spec.md");
    setCurrent("Awaiting clarification answers.");
  };
  const goPlan = () => {
    advanceTo("plan");
    addLog("ok", "✓", "Clarifications captured. Entering <em>plan</em> step.");
    setTimeout(runPlanPipeline, 200);
  };
  const goAnalyze = () => {
    advanceTo("analyze");
    addLog("info", "→", "Entering <em>analyze</em> step.");
    setTimeout(runAnalyzePipeline, 200);
  };
  const goTasks = () => {
    advanceTo("tasks");
    addLog("info", "→", "Entering <em>tasks</em> step.");
    setTimeout(runTasksPipeline, 200);
  };
  const goFinal = () => {
    advanceTo("final");
    addLog("ok", "✓", "All spec-kit steps complete. Ready for human review.");
    setCurrent("Awaiting JIRA sync and implementation approval.");
  };

  // Final actions
  const onJira = () => {
    setBusy(true);
    setCurrent("Pushing tasks to JIRA project <span>CC</span>…");
    addLog("cmd", "$", "<strong>copilot</strong> jira sync --project CC --epic 0042");
    [
      ["info", "→", "Authenticated to JIRA via OAuth"],
      ["info", "→", `Creating epic <em>CC-2420: Self-serve flight-change</em>`],
      ["info", "→", `Creating ${TASKS.length} child issues with estimates…`],
      ["ok",   "✓", "Synced 12 issues · epic <strong>CC-2420</strong> updated"],
    ].forEach((l, i) => setTimeout(() => addLog(...l), 250 * (i + 1)));
    setTimeout(() => {
      setCurrent("JIRA synced. Implementation gate unlocked.");
      setBusy(false);
    }, 1300);
  };

  const onImplement = () => {};  // implement button removed

  // Allow free navigation between steps. Auto-set up prerequisites so a
  // mid-flow step has something to render.
  const jumpToStep = (id) => {
    if (auth.gh !== "ok") setAuth(a => ({ ...a, gh: "ok" }));
    if (auth.copilot !== "ok") setAuth(a => ({ ...a, copilot: "ok" }));
    if (!repo) setRepo("concierge-api");

    advanceTo(id);

    if (id === "plan" || id === "analyze" || id === "tasks" || id === "final") {
      setPlanItems(items => items.map(x => ({ ...x, status: "done" })));
    }
    if (id === "analyze" || id === "tasks" || id === "final") {
      setAnalyzeItems(items => items.map(x => ({ ...x, status: "done" })));
    }
    if (id === "tasks" || id === "final") {
      setTaskItems(items => items.map(x => ({ ...x, status: "done" })));
    }
    if (id === "plan" && planItems.every(x => x.status === "wait")) {
      setTimeout(runPlanPipeline, 200);
    }
    if (id === "analyze" && analyzeItems.every(x => x.status === "wait")) {
      setTimeout(runAnalyzePipeline, 200);
    }
    if (id === "tasks" && taskItems.every(x => x.status === "wait")) {
      setTimeout(runTasksPipeline, 200);
    }
  };

  // titlebar progress / current step label
  const stepLabel = STEPS[stepIndex]?.label || "—";

  // gate: no repo selected → empty workspace
  const showEmpty = !repo;

  // Resume / new session handler — used by sidebar AND the top-bar branch chip
  const handleResume = (repoName, branchObj) => {
    setRepo(repoName);
    if (branchObj) {
      setBranch(branchObj.name);
      setSpecStarted(true);
      setSpecComplete(true);
      addLog("cmd", "$", `<strong>git checkout</strong> <em>${branchObj.name}</em>`);
      addLog("ok", "✓", `Resumed branch <strong>${branchObj.name}</strong> at step <em>${branchObj.step}</em>`);
      setTimeout(() => jumpToStep(branchObj.step), 50);
    } else {
      // Don't create the branch yet — that happens when specify runs.
      setBranch(null);
      setSpecStarted(false);
      setSpecComplete(false);
      addLog("cmd", "$", `<strong>git checkout</strong> <em>main</em>`);
      addLog("ok", "✓", "On <em>main</em> · ready to start a new session");
      setStep("specify");
      setMaxStep("specify");
    }
  };

  const [showAbout, setShowAbout] = React.useState(false);
  const [showCustomize, setShowCustomize] = React.useState(false);

  return (
    <div
      className={"app density-" + t.density + " activity-" + t.activitySide}
      style={{
        "--accent": accent,
        "--accent-dim": accentDim,
        "--accent-bg": accent + "1f",
      }}
    >
      <div className="titlebar">
        <div className="titlebar-left">
          <div className="titlebar-dots">
            <span /><span /><span />
          </div>
          <div className="titlebar-brand">Spec-kit Concierge</div>
          <span className="tb-divider" />
          <AuthChip auth={auth} setAuth={setAuth} />
          {auth.gh === "ok" && auth.copilot === "ok" && auth.atlassian === "ok" && (
            <React.Fragment>
              <RepoChip
                repo={repo}
                onPick={(name) => {
                  setRepo(name);
                  setBranch(null);
                  setStep("specify");
                  setMaxStep("specify");
                  setSpecStarted(false);
                  setSpecComplete(false);
                  addLog("cmd", "$", `<strong>cd</strong> ~/work/${name}`);
                }}
              />
              {repo && (
                <BranchChip
                  repo={repo}
                  branch={branch}
                  onResume={(b) => handleResume(repo, b)}
                  onNewSession={() => handleResume(repo, null)}
                />
              )}
            </React.Fragment>
          )}
        </div>

        <div className="titlebar-right">
          {auth.copilot === "ok" && (
            <ModelPicker value={model} onChange={setModel} />
          )}
          <GearMenu
            log={log}
            onAbout={() => setShowAbout(true)}
            onFileRequest={() => setShowRequest(true)}
            onCustomize={() => setShowCustomize(true)}
          />
          <ActivityPill
            open={showActivity}
            busy={busy}
            log={log}
            step={step}
            maxStep={maxStep}
            onToggle={() => setShowActivity(v => !v)}
          />
        </div>
      </div>

      <div className={"app-body "
        + (t.activitySide === "hidden" || !showActivity ? "no-activity" : "")
        + (t.activitySide === "left" ? " activity-left" : "")
      }>
        {t.activitySide === "left" && showActivity && (
          <Activity log={log} busy={busy} current={current} onClear={clearLog} />
        )}

        <main className="workspace">
          {!(auth.gh === "ok" && auth.copilot === "ok" && auth.atlassian === "ok") ? (
            <SignInScreen auth={auth} setAuth={setAuth} />
          ) : showEmpty ? (
            <RepoBrowseScreen
              onResume={(repoName, branchObj) => handleResume(repoName, branchObj)}
              onNewSession={(repoName) => handleResume(repoName, null)}
            />
          ) : (
            <React.Fragment>
              <div className="ws-header">
                <div className={"stepper mode-" + STEPS[stepIndex].mode}>
                  {STEPS.map((s, i) => {
                    const isDone = i < maxStepIndex;
                    const isCurrent = i === maxStepIndex;
                    const isLocked = i > maxStepIndex;
                    const isViewing = i === stepIndex;
                    return (
                      <React.Fragment key={s.id}>
                        {i > 0 && <div className={"step-sep sep-" + s.mode + " sep-from-" + STEPS[i-1].mode} />}
                        <div
                          className={"step mode-" + s.mode + " "
                            + (isViewing ? "is-viewing " : "")
                            + (isCurrent ? "is-current " : "")
                            + (isDone ? "is-done " : "")
                            + (isLocked ? "is-locked" : "")}
                          onClick={() => { if (!isLocked) setStep(s.id); }}
                          title={isLocked
                            ? `${s.label} — not available yet`
                            : isDone
                              ? `${s.label} (completed · read-only)`
                              : `${s.label} (in progress)`}
                        >
                          <div className="step-orb" />
                          {s.label}
                        </div>
                      </React.Fragment>
                    );
                  })}
                  <div className="stepper-track">
                    <div className="stepper-track-fill" style={{ width: `${(maxStepIndex / (STEPS.length - 1)) * 100}%` }} />
                  </div>
                </div>
              </div>

              <div className={"ws-body " + (stepIndex < maxStepIndex ? "is-readonly" : "")}>
                {stepIndex < maxStepIndex && (
                  <div className="readonly-banner">
                    <span className="ro-glyph" />
                    <div className="ro-text">
                      <strong>Step complete</strong>
                      <span>This step has been committed. View only — return to {STEPS[maxStepIndex].label} to continue.</span>
                    </div>
                    <button className="btn" onClick={() => setStep(maxStep)}>
                      Resume {STEPS[maxStepIndex].label} <Ico.Right />
                    </button>
                  </div>
                )}
                {step === "specify" && (
                  <SpecifyStep
                    prompt={prompt}
                    setPrompt={setPrompt}
                    md={md}
                    setMd={setMd}
                    onAdvance={goClarify}
                    requireScroll={t.requireScrollToUnlock}
                    started={specStarted}
                    complete={specComplete}
                    onBegin={runSpecifyPipeline}
                    busy={busy}
                  />
                )}
                {step === "clarify" && (
                  <ClarifyStep
                    answers={answers}
                    setAnswers={setAnswers}
                    onAdvance={goPlan}
                    onAskMore={() => {}}
                    addLog={addLog}
                  />
                )}
                {step === "plan" && (
                  <StatusStep
                    stepName="Plan step"
                    items={planItems}
                    onContinue={goAnalyze}
                    continueLabel="Continue to analyze"
                  />
                )}
                {step === "analyze" && (
                  <StatusStep
                    stepName="Analyze step"
                    items={analyzeItems}
                    onContinue={goTasks}
                    continueLabel="Continue to tasks"
                  />
                )}
                {step === "tasks" && (
                  <StatusStep
                    stepName="Tasks step"
                    items={taskItems}
                    onContinue={goFinal}
                    continueLabel="Review & ship"
                  />
                )}
                {step === "final" && (
                  <FinalStep
                    repo={repo}
                    answers={answers}
                    onJira={onJira}
                  />
                )}
              </div>
            </React.Fragment>
          )}
        </main>

        {t.activitySide === "right" && showActivity && (
          <Activity log={log} busy={busy} current={current} onClear={clearLog} />
        )}
      </div>

      {showRequest && <RequestModal onClose={() => setShowRequest(false)} />}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} model={model} repo={repo} branch={branch} />}
      {showCustomize && <CustomizeModal onClose={() => setShowCustomize(false)} t={t} setTweak={setTweak} />}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Theme">
          <TweakColor
            label="Accent"
            value={t.accent}
            options={[
              ["#3a7e9a", "#132f3b"],
              ["#c4302b", "#3a1010"],
              ["#c89b4a", "#3a2710"],
              ["#7a3a8a", "#2a1430"],
              ["#3b82f6", "#1e3a8a"],
              ["#ffffff", "#3a3a3a"],
            ]}
            onChange={v => setTweak("accent", v)}
          />
          <TweakRadio
            label="Density"
            value={t.density}
            options={["compact", "regular", "comfy"]}
            onChange={v => setTweak("density", v)}
          />
        </TweakSection>

        <TweakSection label="Layout">
          <TweakRadio
            label="Activity stream"
            value={t.activitySide}
            options={[
              { value: "left",   label: "Left" },
              { value: "right",  label: "Right" },
              { value: "hidden", label: "Off" },
            ]}
            onChange={v => setTweak("activitySide", v)}
          />
        </TweakSection>

        <TweakSection label="Flow">
          <TweakToggle
            label="Require scroll to unlock Clarify"
            value={t.requireScrollToUnlock}
            onChange={v => setTweak("requireScrollToUnlock", v)}
          />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
