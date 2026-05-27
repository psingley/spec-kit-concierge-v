# /speckit.specify input — Run 5: Step Lifecycle & Hook Infrastructure

> Passed to /speckit.specify via copilot --model gpt-5.5 --effort high.
> All 13 grill questions resolved in `specs/0005-step-lifecycle-hooks/grill.md`
> (3 user decisions + 10 constitutional/ROADMAP-locked/codex-corrections).

---

## Spec subject

Build Run 5 (Step Lifecycle & Hook Infrastructure) of the Concierge
Electron desktop app. Run 5 is the LAST scaffolding-only run before
vertical user-journey slices (Runs 6-9). After Run 5, the app has
the full state architecture spine + step lifecycle wiring + Step
Contract factories, ready for product UI work.

Runs 2-4 are complete and merged to main. Run 5 builds on top of all
three. Per ROADMAP: Run 5 depends on Runs 2, 3, AND 4; blocks Runs 6,
7, 10.

Run 5's load-bearing constitutional surface: **Principle VII (Step
Lifecycle, NON-NEGOTIABLE)** + **Principle VIII (Step Contracts and
Clarify Rigor Mandate, NON-NEGOTIABLE).** Constitutional violation
here fails the whole product story.

## Constitutional grounding

- Constitution v1.0.4 lines 222-310 (VII + VIII).
- ROADMAP_DECISIONS lines 70-87 (Run 5 scope) + 484-487 (hang
  threshold = 20 minutes) + 488-495 (in-flight marker path).
- Pocock TDD vertical tracer bullets per `.agents/skills/tdd/SKILL.md`.
- Inherits ALL Run 2-4 infrastructure (do NOT redo).

## Tech-stack delta from Run 4

Zero new runtime dependencies. Run 5 is pure first-party code on top
of Run 2's data-layer, Run 3's ACP supervisor, and Run 4's slice +
listener + IPC infrastructure.

## Locked decisions from grill (specs/0005-step-lifecycle-hooks/grill.md)

### Q1 — Hook file granularity (user decision: "a")

12 hook files + 1 dispatcher at `src/main/hooks/`:
- `beforeSpecify.hook.ts`, `afterSpecify.hook.ts`,
  `beforeClarify.hook.ts`, `afterClarify.hook.ts`,
  `beforePlan.hook.ts`, `afterPlan.hook.ts`,
  `beforeTasks.hook.ts`, `afterTasks.hook.ts`,
  `beforeAnalyze.hook.ts`, `afterAnalyze.hook.ts`,
  `beforeReview.hook.ts`, `afterReview.hook.ts`
- `src/main/hooks/dispatcher.ts` routing `.specify/extensions.yml`
  hook invocations to the right file.

### Q2 — Per-step artifact manifest

TypeScript const at `src/main/hooks/manifest.ts`:
```ts
export const STEP_ARTIFACT_MANIFEST = {
  specify: { requiredFiles: ['spec.md'], optionalFiles: ['checklists/requirements.md'] },
  clarify: { requiredFiles: ['clarifications.md'] },
  plan: { requiredFiles: ['plan.md', 'research.md'], contextFileException: true },
  tasks: { requiredFiles: ['tasks.md'] },
  analyze: { requiredFiles: ['analyze.md'], allowEmptyCommit: true },
  review: { requiredFiles: [] }
} as const;
```

### Q3 — Step Contract factories

Six factories at `src/main/domain/factories/<step>.factory.ts`. Each
returns:
```ts
{ ok: true; commit: ConciergeStepCommit }
| { ok: false; escapeHatchReason: StepEscapeHatchReason }
```
`StepEscapeHatchReason` is a discriminated union for 5 failure modes:
`factory-rejection | bound-cli-crash | acp-error | hook-failure |
malformed-clarify`. Each factory ships co-located `.factory.spec.ts`
with the 7-case floor (6 standard + extra-key rejection on disk
inputs per Run 4 lesson).

### Q4 — Step Commit writer

Real `git commit` shell-out via Run 2's `gitCommand.ts` extended with
`commitWithTrailer(step, status, message, files)` function. Uses
`git interpret-trailers --in-place --trailer "Concierge-Step:
<step>:<status>"` then `git commit`. Pre-commit hooks MUST run;
`--no-verify` is FORBIDDEN. Analyze step uses `--allow-empty` for
no-diff commits.

### Q5 — Monotonic-transition invariants (codex corrected)

Three states: `not_available | pending | complete`. NOT 6 states.

Allowed transitions:
- `not_available` → `pending` (via `before_<step>` hook success)
- `pending` → `complete` (via Step Commit success)
- `complete` is terminal in-session
- Step Escape Hatch resets `complete` or any-state → `not_available`
  (NOT a "fail" state — Escape Hatch reverts artifacts so step is
  re-runnable)

Trailer parser status → slice state mapping:
- `pass` → `complete`
- `pending` → `pending`
- `fail`/`skipped` → `not_available`

### Q6 — stepsRestoredFromDisk listener

Fills the Run 4 empty body at `src/renderer/listeners/stepLifecycle.listener.ts`.
Fires on `workspace.activeRepoPath` change. Reads trailers via Run 2
`trailers.ts`. **Last-trailer-wins per step.** Dispatches
`steps/restored` actions with state mapped per Q5.

### Q7 — Workspace Dirty Resume UI (user decision: "a")

SILENT resume. No toast/modal/banner. Log at info level
`{event: 'workspace-dirty-resume', step, paths}`. Activity slice
surfaces this for power users; main UI doesn't interrupt flow.

### Q8 — In-flight marker (codex corrected path)

`userData/in-flight/${sessionId}/${step}.marker` (NOT `.json`). Content:
```json
{"step": "...", "startedAt": "...", "sessionId": "...", "expectedArtifacts": [...]}
```
Written when `before_<step>` succeeds; removed when Step Commit
succeeds. Persists across app crashes (intentional recovery cue).

### Q9 — Clarify Rigor + Re-ask routing (user decision: "a")

**Validation rules per constitution VIII line 293+:**
- Non-empty trimmed question text
- ≥2 well-formed choices, each with key + label
- Short-answer affordance present in rendered UI
- No markdown emphasis at start-of-line (parser-breakers)
- Consistent line endings throughout clarifications section

**Re-ask routing via listener middleware:**
1. Clarify factory returns `{ok: false, malformedQuestions: [...]}` with
   partial result containing both malformed and well-formed.
2. `stepLifecycle.listener.ts` catches `clarify/questionMalformed`
   dispatch.
3. Listener dispatches ACP prompt: "Question N had issue X. Rewrite."
4. ACP stream brings back rewritten output → back through factory.
5. Bounded retry: max 3 attempts per question; then Step Escape
   Hatch with `clarify-rigor-exhausted` reason.

**Malformed questions render VISIBLY malformed in UI** (constitution
VIII line 301-302); factory does NOT silently reject.

### Q10 — Hang detection (codex corrected)

20 minutes of zero ACP stream silence. Implementation in
`transcriptCapture.listener.ts` (Run 4 empty body) maintaining
`lastAcpEventAt`. Poll every 30s; on timeout dispatch
`activity/hangSuspected`. Soft notification (UI deferred to Runs 6-9).
No auto-fail.

### Q11 — Step Escape Hatch revert scope

Per constitution VII 259-267:
1. Cancel active turn (ACP `session/cancel`, 5s grace, SIGTERM
   fallback via Run 3 supervisor)
2. Revert step's expected artifacts via `git checkout HEAD --
   <manifest files>`
3. Reset slice state → `not_available`
4. Surface Retry affordance (Runs 6-9 UI; Run 5 wires state)

**Exceptions:**
- Plan step revert MAY include the Bound-CLI context file outside
  feature dir (manifest's `contextFileException: true`)
- Analyze step uses `--allow-empty`; no special revert behavior

### Q12 — Startup agent-file drift verifier

`src/main/hooks/driftVerifier.ts`. Runs at boot after manifest loader.
Parses `.github/agents/speckit.*.agent.md` files, compares declared
outputs against `STEP_ARTIFACT_MANIFEST`. Pino warn + activity slice
entry `agent-manifest-drift` on drift. Warn-not-fail per
constitution VII line 238.

### Q13 — Step lifecycle log schema

Structured pino logs at info level with:
```ts
{
  event: 'step-before-hook-start' | 'step-before-hook-end' |
    'step-pending' | 'step-prompt-issued' | 'step-prompt-complete' |
    'step-after-hook-start' | 'step-after-hook-end' |
    'step-commit-written' | 'step-complete' |
    'step-escape-hatch-triggered' | 'workspace-dirty-resume' |
    'agent-manifest-drift' | 'hang-suspected',
  step: 'specify' | 'clarify' | 'plan' | 'tasks' | 'analyze' | 'review',
  sessionId: string,
  latencyMs?: number,
  reason?: string,
  trailer?: string
}
```

Logged via Run 2's pino + Run 4's PINO DISCIPLINE. Activity slice
filter via `transcriptCapture.listener.ts`.

## Run 5 deliverables (in dependency order)

1. **`src/main/hooks/manifest.ts`** — STEP_ARTIFACT_MANIFEST TS const
   per Q2.
2. **`src/main/hooks/dispatcher.ts`** — routes hook invocations from
   `.specify/extensions.yml` to per-step hook files.
3. **`src/main/hooks/before{Specify,Clarify,Plan,Tasks,Analyze,Review}.hook.ts`**
   — 6 before-hook files.
4. **`src/main/hooks/after{Specify,Clarify,Plan,Tasks,Analyze,Review}.hook.ts`**
   — 6 after-hook files.
5. **`src/main/hooks/driftVerifier.ts`** — startup drift verifier per
   Q12.
6. **`src/main/domain/factories/<step>.factory.ts` × 6** — Step
   Contract factories per Q3, each with co-located `.factory.spec.ts`
   at 7-case floor.
7. **`src/main/data-layer/git/commitWithTrailer.ts`** — extend Run 2's
   gitCommand for write-side trailer commits per Q4. Co-located test
   asserting pre-commit hook honored + `--no-verify` not present.
8. **`src/main/data-layer/fs/inFlightMarker.ts`** — read/write/delete
   marker files at `userData/in-flight/${sessionId}/${step}.marker`
   per Q8.
9. **`src/renderer/slices/steps.ts`** — extend Run 4's empty slice
   with reducers + extraReducers implementing the 3-state monotonic
   machine per Q5. Co-located spec adds tests for each transition.
10. **`src/renderer/listeners/stepLifecycle.listener.ts`** — fill Run
    4's empty body with: `stepsRestoredFromDisk` (Q6), Clarify Re-ask
    routing (Q9), Step Escape Hatch dispatch (Q11), step lifecycle
    log emission (Q13). Co-located spec.
11. **`src/renderer/listeners/transcriptCapture.listener.ts`** — fill
    Run 4's empty body with: ACP stream event capture into activity
    slice + lastAcpEventAt timestamp tracking + hang-detection poll
    every 30s per Q10. Co-located spec.
12. **`.specify/extensions.yml`** — register all 12 `before_<step>`
    and `after_<step>` hooks pointing at the dispatcher.
13. **`docs/adr/0008-step-state-machine.md`** (tentative) — 3-state
    machine + trailer-to-slice mapping per Q5.
14. **`docs/adr/0009-clarify-reask-listener.md`** (tentative) —
    Re-ask routing via stepLifecycle listener per Q9.
15. **`.github/copilot-instructions.md`** — Run 5 conventions block
    (hook layout, factory paths, state machine vocabulary, in-flight
    marker path).
16. **Final verification tasks** — extending T167-T169 pattern from
    Run 4 with Run 5 file paths + the executable assertions for
    state-machine invariants, drift verifier presence, hang
    threshold = 20 min, trailer commit honors hooks.

## Acceptance criteria

- `npm run lint` exit 0
- `npm run typecheck` exit 0
- `npm run test:coverage` exit 0; test count grows to >= 600 (Run 4
  ended at 423; Run 5 adds 6 factories × 7-case floor + 12 hook
  files × happy/failure cases + listener bodies + commit-writer
  tests = approximate +200 floor)
- `npm run e2e` exit 0; existing smoke + ACP proof path still pass
- Constitution VII satisfied: all 12 hooks registered, all 6
  factories present, in-flight marker path matches, state machine
  monotonic, Escape Hatch reverts artifacts
- Constitution VIII satisfied: Clarify factory enforces rigor mandate
  rules, malformed questions render visibly, Re-ask bounded to 3
  attempts
- `.specify/extensions.yml` registers 12 hooks; dispatcher routes
  correctly
- Drift verifier runs at boot, warns (not fails) on drift
- All trailer commits honor pre-commit hooks; `--no-verify` not used
- The first vertical tracer bullet test (per Q5 ADR-0008 if
  authored): "Given the steps slice starts empty, when
  steps/restored fires for specify with 'complete', then state
  transitions not_available → complete monotonically and no other
  slice changes."

## What this run does NOT introduce

- NO product UI for Step Escape Hatch (Runs 6-9 wire the Retry button)
- NO product UI for the hang notification (Runs 6-9)
- NO Specify/Clarify/Plan/Tasks/Analyze UI flows (Runs 6-9)
- NO HTTP API (Run 10)
- NO MCP integration (Run 11)
- NO Jira submission UI (Run 12)
- NO Windows packaging changes (Run 13)

## Rationale for any deviation

If /speckit.specify finds a deliverable above that it believes should
be deferred or split, it MUST flag the deviation explicitly in spec.md
under a "Deviations from grill" section. The grill is the source of
truth.
