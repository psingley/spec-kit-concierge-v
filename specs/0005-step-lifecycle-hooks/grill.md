# Grill — Run 5: Step Lifecycle & Hook Infrastructure

> Grill-with-docs session per Principle XVI. Resolves ambiguities in
> ROADMAP_DECISIONS Run 5 scope (lines 70-87) + constitution VII +
> constitution VIII before `/speckit.specify` is invoked. Format
> mirrors `specs/0004-ipc-bridge-redux-skeleton/grill.md`.

**Scope:** `.specify/extensions.yml` `before_<step>` + `after_<step>`
hook registration; hook executor at `src/main/hooks/`; per-step
artifact manifest derived from spec-kit installed agent files; factory
infrastructure at `src/main/domain/factories/` (one factory per step
writing Concierge-Step trailer commits on pass); `steps` slice reducer
with monotonic-transition invariants; `stepsRestoredFromDisk` listener
body using Run 2's trailer reader.

**Constitutional load**: VII (Step Lifecycle, NON-NEGOTIABLE) + VIII
(Step Contracts + Clarify Rigor Mandate, NON-NEGOTIABLE) are this
run's load-bearing seams. Constitution III + IV + V + VI all apply
but were already enforced in Runs 2-4.

**Inherited infra from Runs 2-4 (do NOT redo):**
- Run 2: data-layer/fs (safeWrite), data-layer/git (trailers reader,
  branchState, uncommittedPaths), data-layer/agents (manifest + loader),
  date-rotated pino logging
- Run 3: data-layer/acp (BoundCLISupervisor, BoundCLISession with 6
  states, structured logs, transcript writer)
- Run 4: 8 typed-but-empty Redux slices, 6 empty-but-named listener
  files (stepLifecycle + transcriptCapture relevant here), 9 IPC
  handlers + double trust boundary factories, RTK Query 8 tagTypes,
  store.ts alphabetical listener init, Provider mounted

**Locked in advance (empirical from prior runs + grill-with-codex
verification):**

- 8 slice names per constitution VI: ui, preferences, auth, workspace,
  steps, session, activity, copilot. `steps` is the one Run 5 fills.
- 6 step lifecycle stages per spec-kit: specify, clarify, plan, tasks,
  analyze, review. (Review is Concierge-app surface, not a spec-kit
  agent — Run 5 handles it via the same factory pattern but with
  its own hook semantics; clarified during specify step.)
- Factories at trust boundaries with 7-case floor (6 standard cases +
  extra-key rejection for cross-process boundaries — Run 4 lesson).
- TDD vertical tracer bullets per `.agents/skills/tdd/SKILL.md`.

---

## Q1 — Hook executor file layout (USER DECIDED: "a")

**Question:** Constitution V says "effects only in named files." How
do we structure the 6 step × 2 phase = 12 hook implementations?

**Answer:** 12 hook files + 1 dispatcher. Each hook lives in its own
named file under `src/main/hooks/`:
- `beforeSpecify.hook.ts` / `afterSpecify.hook.ts`
- `beforeClarify.hook.ts` / `afterClarify.hook.ts`
- `beforePlan.hook.ts` / `afterPlan.hook.ts`
- `beforeTasks.hook.ts` / `afterTasks.hook.ts`
- `beforeAnalyze.hook.ts` / `afterAnalyze.hook.ts`
- `beforeReview.hook.ts` / `afterReview.hook.ts`
- `src/main/hooks/dispatcher.ts` — single entry point routing
  `before_<step>` and `after_<step>` invocations from
  `.specify/extensions.yml` to the right hook file.

**User decision (2026-05-27):** "a" — 12 files + dispatcher.

**Reasoning:**
- Mirrors Run 4's per-listener and per-slice file pattern.
- Constitution V spirit: one named-file per side-effect surface.
- Debugging affordance: `grep` finds "what does before_clarify do"
  in one file, not in 12 branches of a 400-line executor class.
- Tradeoff: 12 + 1 = 13 files vs 1 large file. Worth the file count
  for the discoverability.

**ADR candidate?** No (constitution V application).

---

## Q2 — Per-step artifact manifest format

**Question:** Where does the per-step expected-artifact manifest live,
and what's its shape?

**Answer:** TypeScript const at `src/main/hooks/manifest.ts`:

```ts
export const STEP_ARTIFACT_MANIFEST = {
  specify: {
    requiredFiles: ['spec.md'],
    optionalFiles: ['checklists/requirements.md'],
    frontmatterFields: {} // none required
  },
  clarify: {
    requiredFiles: ['clarifications.md'],
    optionalFiles: [],
    frontmatterFields: {}
  },
  plan: {
    requiredFiles: ['plan.md', 'research.md'],
    optionalFiles: [],
    frontmatterFields: {},
    contextFileException: true  // Plan MAY write outside feature dir per constitution VII
  },
  tasks: {
    requiredFiles: ['tasks.md'],
    optionalFiles: [],
    frontmatterFields: {}
  },
  analyze: {
    requiredFiles: ['analyze.md'],
    optionalFiles: [],
    frontmatterFields: {},
    allowEmptyCommit: true  // constitution VII: --allow-empty if no diff
  },
  review: {
    requiredFiles: [],  // Review is Concierge-app surface, not a spec-kit agent output
    optionalFiles: [],
    frontmatterFields: {}
  }
} as const;
```

Typed TS const benefits from compile-time validation and integrates
with the trust-boundary factory pattern. Per-step factories import
their own entry from this manifest.

**Reasoning:**
- Constitution VII line 235-239: manifest is "derived from spec-kit's
  installed agent files" and "enumerated in ROADMAP_DECISIONS.md."
  TS const co-located with hook executor matches both criteria
  (enumeration + derived-from-source-of-truth via the startup
  drift verifier — see Q12).
- YAML/JSON would lose type safety + require parsing.

**ADR candidate?** No.

---

## Q3 — Step Contract factory shape (per constitution VIII)

**Question:** What does each step's contract factory return?

**Answer:** Six factories at `src/main/domain/factories/`:
- `specify.factory.ts`, `clarify.factory.ts`, `plan.factory.ts`,
  `tasks.factory.ts`, `analyze.factory.ts`, `review.factory.ts`

Each exports a single function:
```ts
export const validateSpecifyArtifacts = async (
  featureDir: string,
  context: { logger: MainLogger; now: () => Date }
): Promise<StepContractResult> => { ... }

type StepContractResult =
  | { ok: true; commit: ConciergeStepCommit }
  | { ok: false; escapeHatchReason: StepEscapeHatchReason }
```

`ConciergeStepCommit` carries: step name, status (pass/fail/skipped per
trailer format from Run 2 lenient parser), list of files to stage,
optional commit-message prefix.

`StepEscapeHatchReason` is a discriminated union for the 5 failure
modes (factory rejection, Bound CLI crash, ACP error, hook failure,
malformed clarify) — constitution VII line 261.

Each factory implements the trust-boundary 7-case floor (6 standard
+ extra-key rejection on inputs from disk).

**Clarify factory is the strictest** per constitution VIII rigor
mandate (see Q9).

**Reasoning:**
- Pure-function signature: factory reads disk via fs primitives but
  returns a deterministic result; no side effects beyond reading.
- Discriminated-union return makes the Escape Hatch path explicit
  rather than throwing.
- Per-step files keep constitution V discipline.

**ADR candidate?** Maybe — the StepContractResult union shape is
constitutional surface. Will produce ADR-0008 during Plan step if
needed.

---

## Q4 — Step Commit writer mechanism

**Question:** How does Concierge write the Concierge-Step trailer
commit?

**Answer:** Real `git commit` shell-out via Run 2's gitCommand wrapper
extended for write operations. NOT `simple-git` or `nodegit` library.

**Reasoning:**
- Constitution VII forbids `--no-verify`. Pre-commit hooks on the
  user's repo must run. Real git is the only way to honor user-side
  hooks faithfully.
- libgit2-style libraries bypass git's hook machinery.
- Run 2's `gitCommand.ts` already exists as the shell-out helper;
  Run 5 extends it with a write-side `commitWithTrailer` function
  using `git interpret-trailers --in-place --trailer "Concierge-Step: <step>:<status>"`
  followed by `git commit -m "<message>"` with the trailers attached.
- Pre-commit hook rejections route through Step Escape Hatch with
  the hook's output surfaced (constitution VII line 252).
- The Analyze factory's `--allow-empty` (constitution VII line 247)
  is a flag on the same shell-out.

**ADR candidate?** No (mechanical application of constitution VII).

---

## Q5 — Monotonic-transition invariants (CODEX CORRECTED my vocabulary)

**Question:** What's the state machine for each entry in the `steps`
slice?

**Answer:** Three states per the ROADMAP status inventory:
`not_available | pending | complete`. NOT my originally-proposed 6-
state machine (running/pass/fail/skipped) — that would fork
vocabulary from existing code in `data-layer/git/trailers.ts`.

**Allowed transitions:**
- `not_available` → `pending` (when prerequisites pass via
  `before_<step>` hook)
- `pending` → `complete` (when `after_<step>` hook validates
  artifacts and Step Commit is written)
- `complete` is terminal for the step in this session; recovery from
  bad state goes through Step Escape Hatch which RESETS to `pending`
  (not "fail" — Step Escape Hatch reverts artifacts so the step
  becomes re-runnable).

**Step trailer parser (Run 2 `trailers.ts`) returns its own status
values (`pending|pass|fail|skipped` per the lenient parser).** Map
these to the slice's 3-state machine:
- `pass` → `complete`
- `pending` (mid-flight) → `pending`
- `fail`/`skipped` → `not_available` (reset; user must explicitly
  retry which restarts as `pending`)

**Reasoning:**
- Codex grilled this and caught my proposed 6-state vocabulary as a
  fork from the existing trailers.ts shape.
- 3 states are easier for renderer components to reason about + match
  the existing ACP session state shape (initializing/ready/prompting/...).
- Monotonic invariant: once `complete`, only Escape Hatch resets.

**ADR candidate?** Yes — the state machine + trailer-to-slice mapping
is hard-to-change once consumers depend on it. **→ Tentative ADR-0008
during Plan step.**

---

## Q6 — stepsRestoredFromDisk listener (CODEX last-trailer-wins)

**Question:** Listener body for `stepsRestoredFromDisk` (Run 4 left
empty)?

**Answer:** Fires on `workspace.activeRepoPath` change. Reads ALL
Concierge-Step trailers from current branch via Run 2's `trailers.ts`
lenient parser. **Last-trailer-wins per step** — only the most recent
trailer for each step name is dispatched to the steps slice.

For each step in the manifest:
- Find latest trailer matching `Concierge-Step: <step>:<status>`
- Map status to slice state (per Q5 mapping)
- Dispatch `steps/restored` action with `{step, state, sourceCommit}`

If no trailer exists for a step: state stays `not_available` until
prerequisites pass.

**Reasoning:**
- Constitution VII line 247: trailers are the "deterministic resume"
  source of truth.
- Last-trailer-wins matches how the user thinks ("where did I leave
  off") — earlier trailers are history, not current state.
- Mid-flight markers (Q8) take precedence over committed trailers
  for the "currently in this step" determination — see Q7.

**ADR candidate?** No (mechanical).

---

## Q7 — Workspace Dirty Resume (USER DECIDED: "a" silent)

**Question:** UI affordance when Concierge detects uncommitted changes
to the current step's expected artifacts at Session start?

**Answer:** SILENT resume. No toast, no modal, no banner.

**User decision (2026-05-27):** "a" — silent. Reasoning: the
constitutional resume is structural (the Bound CLI is invoked to
resume from disk state), not a user choice. UI theater would
contradict the design.

**Mechanism:**
- On Session start, check `uncommittedPaths.ts` for paths matching
  the current-step's manifest entries.
- If intersect: write the in-flight marker (Q8), dispatch step state
  → `pending` (not running through `before_<step>` again).
- Log at info level: `{event: 'workspace-dirty-resume', step, paths}`.
  Visible in activity slice, NOT surfaced via toast.

**Reasoning:**
- Silent matches the constitutional posture.
- Activity-log visibility means power users can see "what just
  happened" in the activity panel (deferred to Runs 6-9 UI work).
- Avoids modal interruption that would block the user's intent to
  "just continue."

**ADR candidate?** No.

---

## Q8 — Step-in-flight marker (CODEX CORRECTED path)

**Question:** Where does the in-flight marker file live?

**Answer:** `userData/in-flight/${sessionId}/${step}.marker` per
ROADMAP_DECISIONS lines 488-495 (the locked path I originally got
wrong).

NOT my originally-proposed `<userData>/step-state/<sessionId>/<step>.in-flight.json`.

Marker content: a small JSON blob with `{step, startedAt, sessionId,
expectedArtifacts: [...]}`. Persists across app crashes (intentional —
constitution VII line 252 says it's the recovery cue).

**Lifecycle:**
- Written when `before_<step>` succeeds (step transitions to pending,
  ACP prompt issued)
- Removed when Step Commit succeeds (step transitions to complete)
- On app restart, presence of the marker indicates "step was in
  flight when app died" — combined with the Dirty Resume detection
  (Q7), this routes to silent resume.

**Reasoning:**
- Codex caught the path mismatch; ROADMAP_DECISIONS is canonical.
- `.marker` extension (not `.json`) is the locked convention.

**ADR candidate?** No.

---

## Q9 — Clarify Rigor factory + Re-ask routing (USER DECIDED: "a")

**Question:** What's the Clarify factory contract, and where does
Re-ask logic live?

**Answer:**

**Validation rules (constitution VIII line 293+):**
- Non-empty trimmed question text
- ≥2 well-formed choices, each with key + label
- Short-answer affordance present in rendered UI
- No markdown emphasis at start-of-line (parser-breakers)
- Consistent line endings throughout clarifications section

**Per-question malformation surfacing:** Malformed questions render
VISIBLY malformed in the UI (constitution VIII line 301-302). The
factory does NOT silently reject — it returns a result that the UI
displays as broken-but-visible, with an actionable Re-ask affordance.

**Re-ask routing — USER DECISION (2026-05-27): "a" listener middleware.**

When the Clarify factory rejects a specific question:
1. Factory returns `{ok: false, malformedQuestions: [{questionId,
   reason, originalText}], ok-questions: [...]}` — partial result
   carrying both the malformed and the well-formed.
2. The `stepLifecycle.listener.ts` (Run 4 empty body) catches the
   dispatched `clarify/questionMalformed` action.
3. Listener dispatches a follow-up ACP prompt to the Bound CLI:
   "Question N had issue X. Please rewrite just that question."
4. ACP session's stream brings back the rewritten output, which goes
   back through the Clarify factory.
5. Loop bounded: max 3 re-ask attempts per question; after that the
   Step Escape Hatch fires with `clarify-rigor-exhausted` reason.

**Reasoning:**
- Listener pattern is constitutional cross-domain coordination
  (V/VI).
- Factories stay pure transforms; ACP session calls live in
  listeners or the hook executor.
- Multiple-question re-asks are easier to coordinate as separate
  listener-triggered prompts than a synchronous in-factory loop.
- Bounded retry prevents infinite re-ask loops.

**ADR candidate?** Yes — the re-ask listener + bounded-retry pattern
is novel. **→ Tentative ADR-0009 during Plan step: "Clarify Re-ask
routing via stepLifecycle listener."**

---

## Q10 — Hang detection threshold (CODEX CORRECTED my number)

**Question:** What's the silence threshold that triggers a hang
notification?

**Answer:** **20 minutes** of zero ACP stream activity per
ROADMAP_DECISIONS lines 484-487. NOT my originally-proposed 90
seconds (codex caught the order-of-magnitude error).

**Mechanism:**
- transcriptCapture.listener.ts (Run 4 empty body) maintains a
  rolling `lastAcpEventAt` timestamp.
- A setInterval (or RTK Query polling endpoint) checks
  `Date.now() - lastAcpEventAt` every 30 seconds.
- If >= 20 minutes: dispatch `activity/hangSuspected` action; UI
  shows soft notification.
- No auto-fail. User clicks Cancel (Step Escape Hatch) or Restart
  (re-issues the in-flight prompt to the Bound CLI).

**Reasoning:**
- 20 minutes is the ROADMAP-locked threshold.
- 30-second poll frequency keeps overhead trivial.
- Soft notification (not modal) preserves user's flow.

**ADR candidate?** No.

---

## Q11 — Step Escape Hatch revert scope (codex flagged missing)

**Question:** What exactly does the Step Escape Hatch revert?

**Answer:** Per constitution VII lines 259-267:
1. Cancel the active turn (sends ACP `session/cancel`, awaits 5s grace
   then SIGTERM via Run 3 supervisor)
2. Revert the step's expected artifacts to the last Step Commit (via
   `git checkout HEAD -- <manifest expected files>`)
3. Reset the step's UI state (slice state → `not_available`; user
   must explicitly retry to re-enter `pending`)
4. Present Retry affordance (deferred to Runs 6-9; Run 5 wires the
   state, UI is later)

**Exceptions:**
- **Plan step revert MAY include the Bound-CLI context file outside
  the feature directory** (constitution VII line 240-244). The
  revert MUST include this exception explicitly: revert both the
  feature-dir artifacts AND the agent context file path (read from
  manifest's `contextFileException: true` flag).
- **Analyze step uses `--allow-empty` for no-diff cases** (line 247);
  no special revert behavior needed since the commit IS the trailer.

**ADR candidate?** No (mechanical application of constitution VII).

---

## Q12 — Startup agent-file drift verifier (codex flagged missing)

**Question:** Constitution VII line 235-239 says "startup verification
parses the installed agent files and warns if their declared outputs
drift from the manifest." Where does this live?

**Answer:** `src/main/hooks/driftVerifier.ts`. Runs at app boot after
manifest loader completes. Parses `.github/agents/speckit.*.agent.md`
files, extracts declared output filenames from frontmatter or
designated section, compares against `STEP_ARTIFACT_MANIFEST`. On
drift: pino warn log + activity slice entry tagged
`agent-manifest-drift`.

NOT a hard error — constitution says "warns if their declared outputs
drift." Drift can be intentional (e.g., upstream spec-kit added a new
optional output the manifest hasn't picked up yet).

**Reasoning:**
- Verifier runs once at boot; not per-step.
- Warn-not-fail matches constitutional posture.
- Activity-log surfacing means users can see drift events in the
  Runs 6-9 UI without it blocking work.

**ADR candidate?** No.

---

## Q13 — Step lifecycle log schema (codex flagged missing)

**Question:** Per constitution XV (structured observability lines 503-
505), what structured-log fields do step lifecycle transitions emit?

**Answer:** Every step-lifecycle event logs at info level with:
```ts
{
  event:
    | 'step-before-hook-start'
    | 'step-before-hook-end'
    | 'step-pending'
    | 'step-prompt-issued'
    | 'step-prompt-complete'
    | 'step-after-hook-start'
    | 'step-after-hook-end'
    | 'step-commit-written'
    | 'step-complete'
    | 'step-escape-hatch-triggered'
    | 'workspace-dirty-resume'
    | 'agent-manifest-drift'
    | 'hang-suspected',
  step: 'specify' | 'clarify' | 'plan' | 'tasks' | 'analyze' | 'review',
  sessionId: string,
  latencyMs?: number,
  reason?: string,  // for escape-hatch + hang
  trailer?: string  // for commit-written
}
```

Logged via Run 2's pino + Run 4's PINO DISCIPLINE (mock
createMainLogger in tests, not duck-type).

`activity` slice subscribes via `transcriptCapture.listener.ts` (Run 4
empty body), filtered to step-lifecycle events, capped at
`activity.cap = 256` per Run 4 grill Q3.

**ADR candidate?** No.

---

## User decisions captured (2026-05-27)

- **Q1 hook file granularity:** "a" — 12 files + dispatcher.
- **Q2 dirty-resume UI:** "a" — silent.
- **Q3 Clarify Re-ask routing:** "a" — listener middleware route.

Q4-Q13 are constitutional + ROADMAP-locked + codex-corrections. All
13 grill questions resolved. Proceeding to /speckit.specify.

## Codex collaboration log

Codex (agentId af20d996c30d8722f) grilled my initial 10 questions
2026-05-27. Findings:
- 3 factual errors in my proposals (hang threshold: 20min not 90sec;
  marker path: `userData/in-flight/${sessionId}/${step}.marker` not
  `.in-flight.json`; state machine: 3-state not 6-state).
- 3 missing coverage areas (Step Escape Hatch full revert, startup
  drift verifier, structured log schema) — added as Q11/Q12/Q13.
- 3 genuinely-user-decidable taste calls (hook granularity, dirty-
  resume UI, Re-ask routing) — Q1/Q7/Q9, all locked above.

Collaboration cost: 0 Premium (Claude budget).
