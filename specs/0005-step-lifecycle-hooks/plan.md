# Run 5 Implementation Plan - Step Lifecycle & Hook Infrastructure

**Branch**: `spec/0005-step-lifecycle-hooks` | **Date**: 2026-05-27 | **Spec**: `specs/0005-step-lifecycle-hooks/spec.md`

**Input**: Feature specification from `specs/0005-step-lifecycle-hooks/spec.md`; locked grill decisions from `specs/0005-step-lifecycle-hooks/grill.md`; resolved seams from `specs/0005-step-lifecycle-hooks/clarifications.md`; TDD discipline from `.agents/skills/tdd/SKILL.md`.

## Summary

Run 5 fills the lifecycle infrastructure that Runs 2-4 intentionally left as scaffolding. It registers all twelve `before_<step>` and `after_<step>` hooks, routes them through a single dispatcher into named hook files, validates each step's disk artifacts through trust-boundary Step Contract factories, writes real git Step Commits with `Concierge-Step: <step>:pass` trailers, restores renderer step state from trailer history, records in-flight markers for crash recovery, and fills only the Run 4 `stepLifecycle.listener.ts` and `transcriptCapture.listener.ts` bodies.

The renderer step state machine has exactly three states: `not_available`, `pending`, and `complete`. Ordinary progression is monotonic: `not_available -> pending -> complete`. Step Escape Hatch is the only reset path and resets to `not_available` per R5-C03. Trailer restoration maps `pass -> complete`, `pending -> pending`, and `fail|skipped -> not_available`.

## Technical Context

**Language/Version**: TypeScript 5.7.2, `strict` and `noUncheckedIndexedAccess`.

**Primary Dependencies**: Existing Electron 33.2.1, React 18.3.1, pino 9.x, Vitest 2.1.8, Playwright 1.49.1, Redux Toolkit 2.12.0, React Redux 9.3.0, and `@agentclientprotocol/sdk@0.22.1`.

**Storage**: Git history and `Concierge-Step` trailers remain durable truth. In-flight markers live under `app.getPath('userData')/in-flight/${sessionId}/${step}.marker`. Pino logs remain under `app.getPath('userData')/logs/`. ACP transcripts remain under the Run 3 transcript path. Renderer state is cache only.

**Testing**: Vitest co-located tests, vertical tracer bullets only: one RED test, one minimal GREEN implementation, repeat. Factory floors are not batched horizontally; the six standard factory floor cases are six sequential sub-tracer bullets, and disk-entry factories add a seventh extra-key rejection sub-tracer bullet.

**Target Platform**: Electron desktop app. CI remains Windows-only from Run 1.

**Project Type**: Desktop app with main/preload/renderer split.

**Performance Goals**: Hook dispatch and restoration are bounded by the six-step manifest and current-branch trailer history. Hang detection checks every 30 seconds and emits only after 20 minutes of ACP stream silence. Activity remains capped at 256 entries.

**Constraints**: No new runtime dependencies. Do not redo Runs 2-4. Do not add product UI, HTTP API, MCP integration, Jira submission UI, Windows packaging changes, or any Step Agent rewrites. Real git shell-out is required for commits; `--no-verify`, simple-git, and nodegit are forbidden.

**Scale/Scope**: Six steps, twelve lifecycle hook files plus one dispatcher, one manifest, six disk-entry factories with seven-case floors, one git commit writer extension, one drift verifier, filled `steps` and `activity` reducers, filled `stepLifecycle.listener.ts` and `transcriptCapture.listener.ts`, and targeted IPC/preload/renderer-entry factory changes where Run 5 data crosses process boundaries.

## Tech-Stack Delta from Run 4

| Area | Run 4 baseline | Run 5 delta |
|---|---|---|
| Runtime dependencies | RTK, React Redux, ACP SDK already installed | No new runtime dependencies |
| Hook execution | No `src/main/hooks/` implementation | Add dispatcher, manifest, drift verifier, six before-hook files, six after-hook files |
| Step contracts | No domain Step Contract factories | Add `src/main/domain/factories/` disk-entry factories with seven-case floors |
| Git data layer | Read-side shell-outs and lenient trailer parser | Extend `gitCommand.ts` with write-side commit helper and trailer-history reader using real git |
| Renderer `steps` slice | Entity adapter, empty reducers | Add three-state monotonic reducers and selectors |
| Renderer listeners | Six named empty listener files | Fill only `stepLifecycle.listener.ts` and `transcriptCapture.listener.ts` |
| Activity | Cache-only empty reducer | Add lifecycle/transcript/hang activity reducers while preserving cap 256 |
| IPC bridge | Run 4 read skeleton and double factories | Extend only needed lifecycle/steps/activity IPC seams with existing factory pattern |

## Constitution Check

**Gate status**: Pass.

- Principle I: Renderer still reaches filesystem, git, ACP, and logs only through preload/IPC and RTK Query. Hook execution, artifact reads, marker writes, git commits, and drift verification stay in main.
- Principle II: Renderer step state is derived cache. Durable completion remains Step Commits in git history; in-flight markers are recovery cues, not completion truth.
- Principle III: Bound CLI interaction uses the Run 3 ACP supervisor/session. Tests mock process/filesystem/time boundaries only, not internal supervisor, SDK, reducers, or listener collaborators.
- Principle IV: Trust-boundary factories exist at disk entry for Step Contract files and at IPC entry/renderer bridge exit for any Run 5 process-boundary shape. Disk-entry factories use the seven-case floor.
- Principle V: Effects live in named files: hook files, dispatcher, git command helpers, IPC handlers, listener files, and preload bridge. Factories/selectors stay pure.
- Principle VI: Redux Toolkit remains the only renderer state stack. Cross-domain renderer effects live only in listener middleware. `steps` uses `createEntityAdapter`.
- Principle VII: `before_<step>` and `after_<step>` own lifecycle. Step Commits use real git and honor pre-commit hooks. In-flight marker, dirty resume, hang detection, and Escape Hatch semantics match ROADMAP and grill decisions.
- Principle VIII: Step Contract factories enforce artifacts. Clarify uses the stricter partial-malformation/re-ask shape from R5-C01 and the zero-question sentinel from R5-C04.
- Principle XV: Lifecycle events use pino structured logs and activity entries. Handler/hook logging tests mock `createMainLogger`, not logger-shaped objects.
- TDD discipline: `.agents/skills/tdd/SKILL.md` was read before sequencing. Implementation must proceed by vertical tracer bullets: one RED test, one minimal GREEN implementation, repeat.

No complexity-tracking violations are introduced.

## Project Structure

### Documentation (this feature)

```text
specs/0005-step-lifecycle-hooks/
|-- spec.md
|-- grill.md
|-- clarifications.md
|-- plan.md
|-- research.md
`-- tasks.md                         # created by /speckit.tasks, not this plan

docs/adr/
|-- 0008-step-state-machine.md
`-- 0009-clarify-reask-listener.md

.github/
`-- copilot-instructions.md          # Run 5 conventions
```

### Source Code (repository root)

```text
src/
|-- main/
|   |-- index.ts                       # keeps existing registrations and starts drift verifier
|   |-- hooks/
|   |   |-- manifest.ts
|   |   |-- dispatcher.ts
|   |   |-- dispatcher.test.ts
|   |   |-- driftVerifier.ts
|   |   |-- driftVerifier.test.ts
|   |   |-- beforeSpecify.hook.ts
|   |   |-- afterSpecify.hook.ts
|   |   |-- beforeClarify.hook.ts
|   |   |-- afterClarify.hook.ts
|   |   |-- beforePlan.hook.ts
|   |   |-- afterPlan.hook.ts
|   |   |-- beforeTasks.hook.ts
|   |   |-- afterTasks.hook.ts
|   |   |-- beforeAnalyze.hook.ts
|   |   |-- afterAnalyze.hook.ts
|   |   |-- beforeReview.hook.ts
|   |   `-- afterReview.hook.ts
|   |-- domain/
|   |   `-- factories/
|   |       |-- types.ts
|   |       |-- factoryUtils.ts            # disk-entry exact-key helpers if not shared from IPC
|   |       |-- specify.factory.ts
|   |       |-- specify.factory.spec.ts
|   |       |-- clarify.factory.ts
|   |       |-- clarify.factory.spec.ts
|   |       |-- plan.factory.ts
|   |       |-- plan.factory.spec.ts
|   |       |-- tasks.factory.ts
|   |       |-- tasks.factory.spec.ts
|   |       |-- analyze.factory.ts
|   |       |-- analyze.factory.spec.ts
|   |       |-- review.factory.ts
|   |       `-- review.factory.spec.ts
|   |-- data-layer/
|   |   |-- git/
|   |   |   |-- gitCommand.ts              # extend with commit/trailer-history shell-outs
|   |   |   |-- gitCommand.test.ts
|   |   |   |-- trailers.ts                # preserve Run 2 lenient parser
|   |   |   `-- trailers.test.ts           # add restoration mapping coverage if needed
|   |   |-- fs/                            # reuse safe-write/fsync helpers for marker writes
|   |   |-- agents/                        # reuse loader for drift verification
|   |   `-- acp/                           # reuse Run 3 supervisor/session
|   `-- ipc/
|       |-- steps.ts                       # extend restoration read path if needed
|       |-- steps.factory.ts
|       |-- steps.factory.spec.ts
|       |-- activity.ts                    # extend lifecycle activity read/shape if needed
|       |-- activity.factory.ts
|       `-- activity.factory.spec.ts
|-- preload/
|   `-- index.ts                           # extend only for Run 5 IPC seams that cross renderer/main
`-- renderer/
    |-- slices/
    |   |-- steps.ts
    |   |-- steps.selectors.ts
    |   |-- steps.test.ts
    |   |-- activity.ts
    |   |-- activity.selectors.ts
    |   `-- activity.test.ts
    |-- listeners/
    |   |-- stepLifecycle.listener.ts       # filled in Run 5
    |   |-- stepLifecycle.listener.test.ts
    |   |-- transcriptCapture.listener.ts   # filled in Run 5
    |   `-- transcriptCapture.listener.test.ts
    `-- api/
        |-- steps.endpoint.ts
        |-- steps.factory.ts
        |-- steps.factory.spec.ts
        |-- activity.endpoint.ts
        |-- activity.factory.ts
        `-- activity.factory.spec.ts
```

**Structure Decision**: Keep the Run 2-4 layout. Main owns hooks, disk contracts, git, markers, ACP, logging, and IPC. Renderer owns only cache reducers, selectors, endpoint definitions, and listener-mediated cross-domain coordination. No code outside `src/main/data-layer/acp/` may spawn or speak directly to a Bound CLI binary.

## Public Interfaces

### Step vocabulary

```ts
type StepName = 'specify' | 'clarify' | 'plan' | 'tasks' | 'analyze' | 'review';
type StepPhase = 'before' | 'after';
type StepState = 'not_available' | 'pending' | 'complete';
type TrailerStatus = 'pending' | 'pass' | 'fail' | 'skipped';
```

The renderer never exposes `pass`, `fail`, or `skipped` as state. Those are git-trailer statuses only.

### Artifact manifest

`src/main/hooks/manifest.ts` exports `STEP_ARTIFACT_MANIFEST`:

| Step | Required files | Optional files | Exceptions |
|---|---|---|---|
| `specify` | `spec.md` | `checklists/requirements.md` | none |
| `clarify` | `clarifications.md` | none | `no questions needed` sentinel is valid |
| `plan` | `plan.md`, `research.md` | none | May include context-file path outside feature dir |
| `tasks` | `tasks.md` | none | none |
| `analyze` | `analyze.md` | none | Allows empty commit |
| `review` | none | none | infrastructure-only in Run 5 |

The Plan context-file exception resolves to the installed Spec Kit context-file setting, defaulting to `.github/copilot-instructions.md`. No other step may stage or revert outside the feature directory.

### Hook registration

`.specify/extensions.yml` registers all twelve lifecycle keys:

```yaml
hooks:
  before_specify:
    - extension: concierge
      command: concierge.stepLifecycle.dispatch
      enabled: true
      optional: false
      prompt: Execute Concierge before_specify lifecycle hook?
      description: Validate prerequisites and mark Specify pending
      condition: null
  after_specify:
    - extension: concierge
      command: concierge.stepLifecycle.dispatch
      enabled: true
      optional: false
      prompt: Execute Concierge after_specify lifecycle hook?
      description: Validate Specify artifacts and write Step Commit
      condition: null
```

The hook key supplies the `before|after` phase and step name to `src/main/hooks/dispatcher.ts`. All twelve keys point to the same dispatcher command and then route to the named hook file.

### Hook dispatcher

`src/main/hooks/dispatcher.ts` exposes a public dispatch function used by the hook command surface:

```ts
dispatchStepHook({
  hookName,
  repositoryPath,
  featureDir,
  sessionId,
  userDataPath,
  now
})
```

The dispatcher rejects unknown hook names, unknown steps, and unknown phases. It emits `step-before-hook-start`, `step-before-hook-end`, `step-after-hook-start`, and `step-after-hook-end` around named hook execution.

### Step Contract result

`src/main/domain/factories/types.ts` owns the shared result types:

```ts
type StepContractResult =
  | { ok: true; commit: ConciergeStepCommit }
  | { ok: false; escapeHatchReason: StepEscapeHatchReason };

type ClarifyContractResult =
  | { ok: true; commit: ConciergeStepCommit }
  | { ok: false; kind: 'malformed-questions'; wellFormedQuestions: ClarifyQuestion[]; malformedQuestions: MalformedClarifyQuestion[]; rawText: string }
  | { ok: false; kind: 'escape-hatch'; escapeHatchReason: StepEscapeHatchReason };
```

Clarify is the only three-way factory result. A malformed-question result remains visible and routes through listener-mediated re-ask. It becomes Step Escape Hatch only after the per-question three-attempt bound is exhausted with `clarify-rigor-exhausted`.

### Step Commit writer

`src/main/data-layer/git/gitCommand.ts` is extended with write-side helpers. The commit writer stages the candidate files, writes a temporary message file, appends exactly one `Concierge-Step: <step>:pass` trailer with `git interpret-trailers`, then runs `git commit -F <message-file>`. Analyze may add `--allow-empty`; no other step may. `--no-verify` is never accepted or exposed.

### In-flight marker

Before-hook success writes:

```text
userData/in-flight/${sessionId}/${step}.marker
```

Marker JSON contains `step`, `startedAt`, `sessionId`, and `expectedArtifacts`. Marker removal occurs only after Step Commit success. Markers persist across crashes and combine with dirty expected artifacts for silent Workspace Dirty Resume.

### Renderer step reducers

`src/renderer/slices/steps.ts` adds actions that preserve the three-state model:

- `stepPending({ step, sessionId })`: `not_available -> pending`
- `stepCompleted({ step, commitSha, trailer })`: `pending -> complete`
- `stepsRestored({ records })`: replaces cache from last-trailer-wins restoration mapping
- `stepReset({ step, reason })`: any state -> `not_available` for Step Escape Hatch

Reducers must reject reverse or skipping transitions by leaving state unchanged; the effect boundary that attempted the transition logs the failure through the lifecycle log schema.

### Listener ownership

Run 5 fills only:

- `src/renderer/listeners/stepLifecycle.listener.ts`: workspace-change restoration, before/after lifecycle cache transitions, dirty-resume activity, Clarify malformed-question re-ask, three-attempt bound, Escape Hatch dispatch.
- `src/renderer/listeners/transcriptCapture.listener.ts`: ACP stream activity capture, latest ACP event timestamp maintenance, 30-second hang check, 20-minute `hang-suspected` soft notification.

The other four Run 4 listener bodies remain empty.

### Structured lifecycle events

Every lifecycle log/activity event uses one of the grill-locked names:

```ts
type StepLifecycleEventName =
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
  | 'hang-suspected';
```

Fields: `event`, `step`, `sessionId`, optional `latencyMs`, optional `reason`, and optional `trailer`. Handler/hook logging tests mock `createMainLogger`.

## Factory-Spec Convention

IPC-entry factories keep the Run 4 six-case floor:

1. Happy path.
2. Empty object named error.
3. Null named error.
4. Undefined named error.
5. Factory-specific hostile case.
6. Partial structurally-plausible input.

Disk-entry Step Contract factories add a seventh case:

7. Extra-key rejection for malicious JSON/frontmatter payloads read from disk.

Implementation must not write all floor tests at once. For each factory, write one RED floor case, make it GREEN, then write the next case.

## TDD Vertical Tracer-Bullet Sequence

Per `.agents/skills/tdd/SKILL.md`, implementation proceeds one behavior at a time. Each item below means RED test first, minimal GREEN implementation second, then continue. Do not batch all tests for a module before implementation.

1. **First tracer bullet: steps slice advances monotonically**
   - RED: Add `src/renderer/slices/steps.test.ts` behavior asserting an empty steps slice treats `specify` as `not_available`, `stepPending({ step: 'specify' })` moves it to `pending`, and `stepCompleted({ step: 'specify' })` moves it to `complete` without changing unrelated slices through `createProductStore()`.
   - GREEN: Add only the `StepState` vocabulary, the two reducers, and selector support needed for this transition.

2. **Reject non-monotonic step transitions**
   - RED: Add one test proving `complete -> pending` is rejected for the same step.
   - GREEN: Guard the reducer so completed steps stay complete unless `stepReset` is dispatched.
   - RED: Add one test proving `not_available -> complete` is rejected without `pending`.
   - GREEN: Guard completion on current `pending` state.

3. **Escape Hatch reset semantics**
   - RED: Add a test proving `stepReset({ step, reason })` resets `complete` and `pending` to `not_available`.
   - GREEN: Add the reset reducer and preserve reason in activity only at the effect boundary.

4. **Trailer restoration mapping**
   - RED -> GREEN one status at a time: `pass -> complete`, `pending -> pending`, `fail -> not_available`, `skipped -> not_available`.
   - RED: Add last-trailer-wins behavior for one step with two commits.
   - GREEN: Add a restoration mapper that uses Run 2 `parseConciergeStepTrailer`.

5. **Step artifact manifest**
   - RED: Add one public manifest test for `specify` required/optional files.
   - GREEN: Add `src/main/hooks/manifest.ts` with the minimal `specify` entry.
   - Repeat one step at a time for `clarify`, `plan`, `tasks`, `analyze`, and `review`, adding the Plan context exception and Analyze empty-commit flag only when their tests demand them.

6. **Extensions registration shape**
   - RED: Add a test or config assertion that all twelve hook keys exist in `.specify/extensions.yml` and point to the dispatcher command.
   - GREEN: Register only those Concierge lifecycle entries without removing existing extension entries.

7. **Dispatcher routing**
   - RED -> GREEN one hook at a time: `before_specify`, `after_specify`, `before_clarify`, `after_clarify`, `before_plan`, `after_plan`, `before_tasks`, `after_tasks`, `before_analyze`, `after_analyze`, `before_review`, `after_review`.
   - Each RED test exercises the public dispatcher, not private branch logic.
   - Add unknown-step and unknown-phase rejection after one happy route works.

8. **Before-hook lifecycle**
   - RED: For `beforeSpecify`, assert prerequisite success writes the in-flight marker, dispatches/returns `pending`, and logs `step-before-hook-start`, `step-pending`, and `step-before-hook-end`.
   - GREEN: Implement the smallest marker writer and hook path using existing safe-write discipline.
   - Repeat for the five remaining before hooks, sharing only manifest-driven helpers that the next test proves necessary.

9. **Specify disk-entry factory, seven sequential floor sub-tracer bullets**
   - RED -> GREEN in this exact order: happy path, empty object, null, undefined, factory-specific hostile input, partial structurally-plausible input, extra-key rejection.
   - Test through `validateSpecifyArtifacts(featureDir, context)`, not private parsers.

10. **Remaining Step Contract factories**
   - Repeat the seven-case disk-entry sequence for `plan`, `tasks`, `analyze`, and `review`.
   - For `clarify`, use the seven-case floor plus separate RED -> GREEN tests for each rigor rule: non-empty question text, at least two choices with key/label, short-answer affordance, no start-of-line parser-breaking emphasis, consistent line endings, visible malformed partial result, and `no questions needed` sentinel success.

11. **Git Step Commit writer**
   - RED: Add a test using a real temporary git repository with a passing pre-commit hook; assert exactly one `Concierge-Step: specify:pass` trailer.
   - GREEN: Extend `gitCommand.ts` with staging, `git interpret-trailers`, and `git commit -F`.
   - RED: Add a failing pre-commit hook test proving hook output routes to failure and no bypass flag appears.
   - GREEN: Surface the `GitCommandError` output to the Escape Hatch path.
   - RED: Add Analyze no-diff empty-commit behavior.
   - GREEN: Add `--allow-empty` only for Analyze.

12. **After-hook lifecycle**
   - RED: For `afterSpecify`, assert factory success writes Step Commit, removes marker, moves state to `complete`, and logs `step-after-hook-start`, `step-commit-written`, `step-complete`, and `step-after-hook-end`.
   - GREEN: Wire the after hook to the factory, commit writer, marker removal, and lifecycle result.
   - Repeat for the five remaining after hooks.

13. **Workspace Dirty Resume and marker recovery**
   - RED: Add a listener/IPC vertical test proving active workspace change reads trailer history, applies last-trailer-wins, and leaves unrelated slices unchanged.
   - GREEN: Fill the minimal `stepLifecycle.listener.ts` restoration effect and any needed `steps:read` extension.
   - RED: Add a marker + dirty expected-artifacts test proving `workspace-dirty-resume` is info/activity only and no toast/modal/banner action is emitted.
   - GREEN: Add dirty-resume effect using `readUncommittedPaths` through IPC/main boundaries.

14. **Step Escape Hatch orchestration**
   - RED: Add a public hook/listener test proving an after-hook failure cancels the active turn, waits a 5-second graceful window, reverts expected artifacts, and resets the step to `not_available`.
   - GREEN: Wire ACP cancel through the Run 3 supervisor boundary and git checkout for manifest files.
   - RED: Add the Plan context-file revert exception.
   - GREEN: Resolve and include only the Plan context path.

15. **Clarify re-ask listener**
   - RED: Add `clarify/questionMalformed` listener test proving only the malformed question is prompted for rewrite and well-formed questions are preserved.
   - GREEN: Fill the smallest `stepLifecycle.listener.ts` effect.
   - RED -> GREEN: Attempt 1 re-asks, attempt 2 re-asks, attempt 3 failure triggers Escape Hatch reason `clarify-rigor-exhausted`.
   - GREEN: Add bounded per-question counter and Escape Hatch dispatch.

16. **Transcript capture and hang detection**
   - RED: Add a test proving an ACP stream event appends activity and updates `lastAcpEventAt`.
   - GREEN: Fill `transcriptCapture.listener.ts` with transcript activity capture.
   - RED: Add fake-timer test proving no `hang-suspected` before 20 minutes of silence.
   - GREEN: Add 30-second check loop without emitting early.
   - RED: Add test proving one soft `hang-suspected` activity at or after 20 minutes and no auto-fail/cancel.
   - GREEN: Add threshold event and debounce/dedupe.

17. **Startup agent-manifest drift verifier**
   - RED: Add a startup verifier test with an installed agent file whose declared outputs differ from `STEP_ARTIFACT_MANIFEST`; assert warn log and activity record, no thrown error.
   - GREEN: Add `src/main/hooks/driftVerifier.ts` with dependency-injected filesystem/logger/activity sink.
   - RED: Add frontmatter and designated-section parsing cases using real fixture text.
   - GREEN: Add no-dependency parser for frontmatter keys and output filenames.

18. **IPC and preload boundary completion**
   - RED -> GREEN one boundary at a time for any Run 5-added or extended IPC shape: main-side factory floor, handler success/failure logging with mocked `createMainLogger`, preload exposure, renderer-entry factory floor, endpoint behavior through the real preload bridge mock.
   - Preserve Run 4 tag taxonomy: `Workspace`, `StepState`, `GitState`, `Agent`, `Session`, `Step`, `Transcript`, `Preferences`.

19. **Boundary and dependency verification**
   - RED: Add grep-backed or test-backed assertions that no code outside `src/main/data-layer/acp/` spawns or speaks to a Bound CLI, no renderer imports Electron/Node APIs, no `--no-verify` appears, and no runtime dependency was added.
   - GREEN: Remove any violation caused by Run 5 implementation.

20. **Final verification**
   - Run lint, typecheck, coverage, and e2e.
   - Fix only issues caused by Run 5 work.
   - Confirm the Run 5 executable assertions cover state-machine invariants, drift verifier presence, exact 20-minute hang threshold, and trailer commits honoring hooks.

## Implementation Sequence for `tasks.md`

1. Start with the steps slice monotonic RED test, then minimal reducers/selectors.
2. Add state-machine rejection and Escape Hatch reset tests.
3. Add restoration mapping and last-trailer-wins tests.
4. Add manifest entries one step at a time.
5. Register `.specify/extensions.yml` lifecycle hooks and dispatcher routes.
6. Implement before hooks, marker writes, and lifecycle logs one step at a time.
7. Implement disk-entry Step Contract factories one factory floor case at a time.
8. Extend git shell-outs for trailer commits and trailer-history restoration.
9. Implement after hooks and marker removal one step at a time.
10. Fill `stepLifecycle.listener.ts` for restoration, dirty resume, Escape Hatch, and Clarify re-ask.
11. Fill `transcriptCapture.listener.ts` for transcript activity and hang detection.
12. Add startup drift verifier.
13. Complete any IPC/preload/renderer factory seams required by Run 5.
14. Add ADR-0008, ADR-0009, research notes, and Copilot instruction updates.
15. Run final verification and boundary greps.

## Functional Requirements Coverage

| Requirement | Plan coverage |
|---|---|
| FR-001 through FR-004 | Manifest, hook registration, dispatcher, named hook file layout |
| FR-005 through FR-007 | Before-hook lifecycle, marker writer, structured activity |
| FR-008 through FR-011 | Six Step Contract factories and seven-case disk-entry floor |
| FR-012 through FR-014 | Real git Step Commit writer, no `--no-verify`, Analyze empty commit |
| FR-015 through FR-020 | Three-state reducers, monotonic transitions, trailer mapping, restoration listener |
| FR-021 through FR-023 | Dirty resume, Escape Hatch cancel/revert/reset, Plan context exception |
| FR-024 through FR-027 | Clarify factory rigor, visible malformations, listener re-ask, three-attempt bound |
| FR-028 through FR-029 | Transcript capture listener, latest ACP timestamp, 20-minute hang detection |
| FR-030 through FR-032 | Startup drift verifier, structured lifecycle logs, activity cap preservation |
| FR-033 through FR-035 | ADRs, Copilot instruction update, first monotonic tracer bullet |
| FR-036 through FR-038 | No runtime deps, out-of-scope exclusions, Runs 2-4 preservation |

## Success Criteria Mapping

| Spec criterion | Plan coverage |
|---|---|
| SC-001 | Extensions registration and dispatcher route tests |
| SC-002 | Six disk-entry factories with seven-case floors |
| SC-003 | Step reducer invariant tests and Escape Hatch reset |
| SC-004 | Restoration mapper tests for all statuses and last-trailer-wins |
| SC-005 | Real temporary-git Step Commit tests with pre-commit hooks |
| SC-006 | Clarify rigor factory and re-ask listener tests |
| SC-007 | Marker write/remove/crash persistence tests |
| SC-008 | Fake-timer hang detection tests at exact 20-minute threshold |
| SC-009 | Drift verifier tests with warn-not-fail activity |
| SC-010 | Final lint, typecheck, coverage, e2e |
| SC-011 | Test-count verification in final coverage task |
| SC-012 | ADR-0008, ADR-0009, Copilot instruction updates |
| SC-013 | Dependency and out-of-scope boundary checks |

## Out of Scope

- Redoing Run 2 data-layer foundations, safe-write helpers, trailer parser, RTK Query tag taxonomy, or `app:getVersion`.
- Redoing Run 3 ACP supervisor/session, ACP transcript fixtures, model/mode policy, or `acp:probeBoundCLI`.
- Redoing Run 4 store assembly, Provider mount, listener catalog, slice catalog, endpoint skeletons, or fixed tag types.
- New runtime dependencies.
- Product UI for Step Escape Hatch, hang notifications, Specify/Clarify/Plan/Tasks/Analyze flows, review/Jira submission, HTTP API, MCP integration, or Windows packaging changes.
- Bound CLI commits during step execution. Commits are exclusively Concierge `after_<step>` responsibility.

## Verification

Run and pass:

```bash
npm run lint
npm run typecheck
npm run test:coverage
npm run e2e
```

Additional Run 5 boundary checks:

```bash
rg "--no-verify" src package.json
rg "simple-git|nodegit" src package.json
rg "from ['\"](electron|node:|fs|child_process|path|os)" src/renderer --type ts
rg "spawn|execFile|ClientSideConnection|ndJsonStream" src --type ts
rg "setTimeout|setInterval|20 \\* 60|1200000" src/renderer/listeners src/main --type ts
rg "userData.*in-flight|in-flight.*\\.marker" src --type ts
```

Expected outcome: renderer imports no Electron/Node APIs, no git hook bypass exists, Bound CLI process communication remains isolated to `src/main/data-layer/acp/`, hang threshold is exactly 20 minutes, in-flight markers use the locked path, and no runtime dependency was added.
