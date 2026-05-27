---
feature: Step Lifecycle & Hook Infrastructure
branch: spec/0005-step-lifecycle-hooks
created: 2026-05-27
source_plan: specs/0005-step-lifecycle-hooks/plan.md
---

# Tasks: Run 5 Step Lifecycle & Hook Infrastructure

**Input**: `specs/0005-step-lifecycle-hooks/plan.md`, `specs/0005-step-lifecycle-hooks/spec.md`, `specs/0005-step-lifecycle-hooks/grill.md`, ADR-0008, ADR-0009, and `.agents/skills/tdd/SKILL.md`.

**TDD discipline**: Run 5 must proceed vertically: one RED behavior test, one minimal GREEN implementation, then repeat. Do not batch hook tests, factory-floor cases, reducer invariants, listener behaviors, or verification checks ahead of implementation. Tests must exercise public interfaces and may mock only system boundaries: Electron IPC, preload bridge, filesystem, git/process commands, child process, time, and pino creation through `createMainLogger`. Do not mock internal reducers, listener collaborators, Run 3 ACP supervisor/session types, or ACP SDK collaborators.

**Scope guard**: These tasks intentionally exclude ADR-0008, ADR-0009, `.github/copilot-instructions.md` Run 5 conventions, constitution v1.0.4, ADRs 0002-0007, Run 2-4 infrastructure, RTK Query baseQuery/tag taxonomy, installed runtime dependencies, and pre-populated spec-validate state JSON. Run 5 fills only the planned lifecycle surfaces and does not redo Runs 2-4.

**Pino discipline**: Handler and hook logging tests MUST mock `createMainLogger` from `src/main/logging.ts` and assert `logger.info`/`logger.warn`/`logger.error` calls with the expected structured fields. Generic logger-shaped mocks, `console` mocks, or field-shape assertions alone are not acceptable. This rider is contractual for T011/T013/T015/T017/T019/T021/T023/T025/T027/T029/T063 and every other logging test.

**Before-hook lifecycle discipline**: Every before-hook task acceptance in T007-T030 MUST prove prerequisite validation succeeds before lifecycle transition, then calls `writeInFlightMarker(sessionId, step)`, emits a `step-pending` log/activity event with the grill Q13 schema, and returns a result the dispatcher uses to dispatch the renderer `steps/pending` action. A before hook that only logs metadata or only returns success is incomplete.

**After-hook lifecycle discipline**: Every after-hook task acceptance in T009-T030 MUST prove the hook invokes the step's Step Contract factory, calls `commitWithTrailer` on factory success, calls `removeInFlightMarker(sessionId, step)` only after commit success, emits `step-commit-written` and `step-complete` log/activity events with the grill Q13 schema, and returns a result the dispatcher uses to dispatch the renderer `steps/complete` action. An after hook that bypasses factory validation, commit writing, marker removal, or completion dispatch is incomplete.

**Factory-floor discipline**: Each Step Contract factory uses the six standard factory-floor cases as SIX sequential sub-tracer bullets, followed by the seventh disk-entry extra-key rejection sub-tracer bullet. Implementers MUST run each case as RED -> GREEN before adding the next case. A single RED test containing all cases violates the vertical discipline.

**Factory floor cases**:
1. Happy path returns the typed Step Contract result.
2. Empty object returns a stable named error or escape-hatch reason.
3. `null` returns a stable named error or escape-hatch reason.
4. `undefined` returns a stable named error or escape-hatch reason.
5. Factory-specific hostile input returns a stable named error or escape-hatch reason.
6. Partial structurally-plausible input returns a stable named error or escape-hatch reason.
7. Disk-entry extra-key rejection rejects malicious JSON/frontmatter payloads.

**Execution order**: Execute tasks in numeric order. For every RED task, run the focused test and confirm it fails for the expected missing behavior before starting the paired GREEN task. For every GREEN task, implement only the behavior required by the immediately preceding RED task, then run the focused test until it passes.

## Phase 1 - First 3-state vertical tracer bullet

- [ ] T001 Write the FIRST steps-slice 3-state monotonic transition behavior test (RED).
  - Paths: `src/renderer/slices/steps.test.ts`, `src/renderer/store.test.ts`.
  - Dependencies: none.
  - Acceptance: The failing test uses the public store/slice interface and asserts an empty steps slice treats `specify` as `not_available`, `stepPending({ step: 'specify', sessionId })` moves it to `pending`, `stepCompleted({ step: 'specify', commitSha, trailer })` moves it to `complete`, and unrelated slices are unchanged through `createProductStore()`.

- [ ] T002 Implement the minimal 3-state steps transition path (GREEN).
  - Paths: `src/renderer/slices/steps.ts`, `src/renderer/slices/steps.selectors.ts`.
  - Dependencies: T001.
  - Acceptance: The steps slice exports `StepState = 'not_available' | 'pending' | 'complete'`, supports only the reducers/selectors needed for T001, preserves the Run 4 entity-adapter shape, and T001 passes.

## Phase 2 - STEP_ARTIFACT_MANIFEST and dispatcher

- [ ] T003 Add the artifact manifest contract test (RED).
  - Paths: `src/main/hooks/manifest.test.ts`.
  - Dependencies: T002.
  - Acceptance: The failing test asserts `STEP_ARTIFACT_MANIFEST` has exactly six steps and the grill-locked entries: `specify` requires `spec.md` and may include `checklists/requirements.md`; `clarify` requires `clarifications.md`; `plan` requires `plan.md` and `research.md` plus the context-file exception; `tasks` requires `tasks.md`; `analyze` requires `analyze.md` and allows empty commits; `review` has no required files.

- [ ] T004 Implement `STEP_ARTIFACT_MANIFEST` (GREEN).
  - Paths: `src/main/hooks/manifest.ts`.
  - Dependencies: T003.
  - Acceptance: The manifest is a typed const, exposes the fixed `StepName` vocabulary, has no runtime dependencies, and `manifest.test.ts` passes.

- [ ] T005 Add dispatcher public-route tests (RED).
  - Paths: `src/main/hooks/dispatcher.test.ts`.
  - Dependencies: T004.
  - Acceptance: The failing tests exercise `dispatchStepHook` through public inputs and cover, as sequential sub-tracer bullets, one route at a time: `before_specify`, `after_specify`, `before_clarify`, `after_clarify`, `before_plan`, `after_plan`, `before_tasks`, `after_tasks`, `before_analyze`, `after_analyze`, `before_review`, `after_review`, then unknown hook/phase/step rejection. Vertical discipline rider: implement each route as RED case 1 -> GREEN, RED case 2 -> tighten GREEN, and so on; a single batched RED test for all routes violates this task.

- [ ] T006 Implement dispatcher routing and logging shell (GREEN).
  - Paths: `src/main/hooks/dispatcher.ts`.
  - Dependencies: T005.
  - Acceptance: `dispatchStepHook` rejects unknown lifecycle names, routes known names to the named hook modules, logs start/end/error through `createMainLogger`, preserves explicit failures, and `dispatcher.test.ts` passes.

## Phase 3 - Twelve hook files, RED+GREEN per file

- [ ] T006A Add shared prerequisite gate tests (RED).
  - Paths: `src/main/hooks/prerequisiteGate.test.ts`, `src/main/hooks/prerequisiteGate.ts`.
  - Dependencies: T006.
  - Acceptance: The failing tests prove the shared gate checks prior Step Commit existence in branch trailers for prerequisite steps, accepts auth status only through an injected slot, accepts MCP config status only through an injected slot, never reads MCP/Atlassian state directly, and returns gate failure as the named `StepEscapeHatchReason` for prerequisite/auth/MCP failures.

- [ ] T006B Implement shared prerequisite gate helper (GREEN).
  - Paths: `src/main/hooks/prerequisiteGate.ts`, `src/main/hooks/types.ts`.
  - Dependencies: T006A.
  - Acceptance: The helper exposes a dispatcher-injectable prerequisite check used by before hooks, maps all gate failures to named Step Escape Hatch reasons, keeps auth/MCP statuses dependency-injected, reads prior Step Commit state only through the trailer reader seam, and `prerequisiteGate.test.ts` passes.

- [ ] T007 Add `beforeSpecify` hook contract test (RED).
  - Paths: `src/main/hooks/beforeSpecify.hook.test.ts`.
  - Dependencies: T006B.
  - Acceptance: The failing test imports the public hook entry point, invokes it with injected context, mocks `createMainLogger`, and asserts `logger.info`/`logger.error` usage for `step-before-hook-start`/failure paths.

- [ ] T008 Implement `beforeSpecify` hook shell (GREEN).
  - Paths: `src/main/hooks/beforeSpecify.hook.ts`.
  - Dependencies: T007.
  - Acceptance: The hook exports the dispatcher-compatible entry point, uses manifest-driven metadata, logs through `createMainLogger`, performs no unsanctioned side effects yet, and its test passes.

- [ ] T009 Add `afterSpecify` hook contract test (RED).
  - Paths: `src/main/hooks/afterSpecify.hook.test.ts`.
  - Dependencies: T008.
  - Acceptance: The failing test imports the public hook entry point, invokes it with injected context, mocks `createMainLogger`, and asserts `logger.info`/`logger.error` usage for `step-after-hook-start`/failure paths.

- [ ] T010 Implement `afterSpecify` hook shell (GREEN).
  - Paths: `src/main/hooks/afterSpecify.hook.ts`.
  - Dependencies: T009.
  - Acceptance: The hook exports the dispatcher-compatible entry point, uses manifest-driven metadata, logs through `createMainLogger`, performs no unsanctioned side effects yet, and its test passes.

- [ ] T011 Add `beforeClarify` hook contract test (RED).
  - Paths: `src/main/hooks/beforeClarify.hook.test.ts`.
  - Dependencies: T010.
  - Acceptance: The failing test imports the public hook entry point, invokes it with injected context, mocks `createMainLogger`, and asserts structured pino logging through the project adapter.

- [ ] T012 Implement `beforeClarify` hook shell (GREEN).
  - Paths: `src/main/hooks/beforeClarify.hook.ts`.
  - Dependencies: T011.
  - Acceptance: The hook exports the dispatcher-compatible entry point, preserves the Clarify step name, logs through `createMainLogger`, and its test passes.

- [ ] T013 Add `afterClarify` hook contract test (RED).
  - Paths: `src/main/hooks/afterClarify.hook.test.ts`.
  - Dependencies: T012.
  - Acceptance: The failing test imports the public hook entry point, invokes it with injected context, mocks `createMainLogger`, and asserts structured pino logging through the project adapter.

- [ ] T014 Implement `afterClarify` hook shell (GREEN).
  - Paths: `src/main/hooks/afterClarify.hook.ts`.
  - Dependencies: T013.
  - Acceptance: The hook exports the dispatcher-compatible entry point, preserves the Clarify step name, logs through `createMainLogger`, and its test passes.

- [ ] T015 Add `beforePlan` hook contract test (RED).
  - Paths: `src/main/hooks/beforePlan.hook.test.ts`.
  - Dependencies: T014.
  - Acceptance: The failing test imports the public hook entry point, invokes it with injected context, mocks `createMainLogger`, and asserts the Plan context-file exception is visible through manifest-driven metadata.

- [ ] T016 Implement `beforePlan` hook shell (GREEN).
  - Paths: `src/main/hooks/beforePlan.hook.ts`.
  - Dependencies: T015.
  - Acceptance: The hook exports the dispatcher-compatible entry point, preserves Plan manifest metadata, logs through `createMainLogger`, and its test passes.

- [ ] T017 Add `afterPlan` hook contract test (RED).
  - Paths: `src/main/hooks/afterPlan.hook.test.ts`.
  - Dependencies: T016.
  - Acceptance: The failing test imports the public hook entry point, invokes it with injected context, mocks `createMainLogger`, and asserts the Plan context-file exception remains scoped to Plan only.

- [ ] T018 Implement `afterPlan` hook shell (GREEN).
  - Paths: `src/main/hooks/afterPlan.hook.ts`.
  - Dependencies: T017.
  - Acceptance: The hook exports the dispatcher-compatible entry point, preserves Plan manifest metadata, logs through `createMainLogger`, and its test passes.

- [ ] T019 Add `beforeTasks` hook contract test (RED).
  - Paths: `src/main/hooks/beforeTasks.hook.test.ts`.
  - Dependencies: T018.
  - Acceptance: The failing test imports the public hook entry point, invokes it with injected context, mocks `createMainLogger`, and asserts structured pino logging through the project adapter.

- [ ] T020 Implement `beforeTasks` hook shell (GREEN).
  - Paths: `src/main/hooks/beforeTasks.hook.ts`.
  - Dependencies: T019.
  - Acceptance: The hook exports the dispatcher-compatible entry point, preserves the Tasks step name, logs through `createMainLogger`, and its test passes.

- [ ] T021 Add `afterTasks` hook contract test (RED).
  - Paths: `src/main/hooks/afterTasks.hook.test.ts`.
  - Dependencies: T020.
  - Acceptance: The failing test imports the public hook entry point, invokes it with injected context, mocks `createMainLogger`, and asserts structured pino logging through the project adapter.

- [ ] T022 Implement `afterTasks` hook shell (GREEN).
  - Paths: `src/main/hooks/afterTasks.hook.ts`.
  - Dependencies: T021.
  - Acceptance: The hook exports the dispatcher-compatible entry point, preserves the Tasks step name, logs through `createMainLogger`, and its test passes.

- [ ] T023 Add `beforeAnalyze` hook contract test (RED).
  - Paths: `src/main/hooks/beforeAnalyze.hook.test.ts`.
  - Dependencies: T022.
  - Acceptance: The failing test imports the public hook entry point, invokes it with injected context, mocks `createMainLogger`, and asserts Analyze `allowEmptyCommit` metadata is available for later commit wiring.

- [ ] T024 Implement `beforeAnalyze` hook shell (GREEN).
  - Paths: `src/main/hooks/beforeAnalyze.hook.ts`.
  - Dependencies: T023.
  - Acceptance: The hook exports the dispatcher-compatible entry point, preserves Analyze manifest metadata, logs through `createMainLogger`, and its test passes.

- [ ] T025 Add `afterAnalyze` hook contract test (RED).
  - Paths: `src/main/hooks/afterAnalyze.hook.test.ts`.
  - Dependencies: T024.
  - Acceptance: The failing test imports the public hook entry point, invokes it with injected context, mocks `createMainLogger`, and asserts Analyze is the only step exposing empty-commit metadata.

- [ ] T026 Implement `afterAnalyze` hook shell (GREEN).
  - Paths: `src/main/hooks/afterAnalyze.hook.ts`.
  - Dependencies: T025.
  - Acceptance: The hook exports the dispatcher-compatible entry point, preserves Analyze manifest metadata, logs through `createMainLogger`, and its test passes.

- [ ] T027 Add `beforeReview` hook contract test (RED).
  - Paths: `src/main/hooks/beforeReview.hook.test.ts`.
  - Dependencies: T026.
  - Acceptance: The failing test imports the public hook entry point, invokes it with injected context, mocks `createMainLogger`, and asserts Review has no required artifact files in Run 5.

- [ ] T028 Implement `beforeReview` hook shell (GREEN).
  - Paths: `src/main/hooks/beforeReview.hook.ts`.
  - Dependencies: T027.
  - Acceptance: The hook exports the dispatcher-compatible entry point, preserves Review manifest metadata, logs through `createMainLogger`, and its test passes.

- [ ] T029 Add `afterReview` hook contract test (RED).
  - Paths: `src/main/hooks/afterReview.hook.test.ts`.
  - Dependencies: T028.
  - Acceptance: The failing test imports the public hook entry point, invokes it with injected context, mocks `createMainLogger`, and asserts Review remains infrastructure-only in Run 5.

- [ ] T030 Implement `afterReview` hook shell (GREEN).
  - Paths: `src/main/hooks/afterReview.hook.ts`.
  - Dependencies: T029.
  - Acceptance: The hook exports the dispatcher-compatible entry point, preserves Review manifest metadata, logs through `createMainLogger`, and its test passes.

## Phase 4 - Six Step Contract factories with seven-case floors

- [ ] T031 Add `specify` Step Contract factory floor tests (RED).
  - Paths: `src/main/domain/factories/specify.factory.spec.ts`.
  - Dependencies: T030.
  - Acceptance: The spec exercises `validateSpecifyArtifacts(featureDir, context)` through seven sequential sub-tracer bullets: happy `spec.md`; empty object; `null`; `undefined`; hostile malformed frontmatter/body; partial plausible `spec.md`; extra-key rejection on disk-derived payload. Vertical discipline rider: implement each floor case as RED case 1 -> GREEN, RED case 2 -> tighten GREEN, and so on; a single batched RED test for all cases violates this task.

- [ ] T032 Implement `specify` Step Contract factory (GREEN).
  - Paths: `src/main/domain/factories/specify.factory.ts`, `src/main/domain/factories/types.ts`, `src/main/domain/factories/factoryUtils.ts`.
  - Dependencies: T031.
  - Acceptance: The factory returns a typed commit candidate or escape-hatch reason, stages only manifest-sanctioned Specify artifacts, rejects extra keys, and `specify.factory.spec.ts` passes.

- [ ] T033 Add `clarify` Step Contract factory floor and rigor tests (RED).
  - Paths: `src/main/domain/factories/clarify.factory.spec.ts`.
  - Dependencies: T032.
  - Acceptance: The spec exercises `validateClarifyArtifacts(featureDir, context)` through the seven sequential floor sub-tracer bullets plus separate RED -> GREEN rigor bullets for non-empty question text, at least two choices with key/label, short-answer affordance, no start-of-line parser-breaking emphasis, consistent line endings, visible malformed partial result, and `no questions needed` sentinel success. Vertical discipline rider: implement each floor and rigor case as RED case 1 -> GREEN, RED case 2 -> tighten GREEN, and so on; a single batched RED test for all cases violates this task. Malformation observability rider: malformed Clarify questions MUST emit a pino `warn` log with `{ questionId, malformationCategory, rawOutput, timestamp, modelId }`, and `transcriptCapture.listener.ts` MUST receive the same structured record into the activity slice.

- [ ] T034 Implement `clarify` Step Contract factory (GREEN).
  - Paths: `src/main/domain/factories/clarify.factory.ts`, `src/main/domain/factories/types.ts`, `src/main/domain/factories/factoryUtils.ts`.
  - Dependencies: T033.
  - Acceptance: The factory returns the Clarify three-way result, preserves visible malformed questions, never calls ACP, rejects extra keys, and `clarify.factory.spec.ts` passes.

- [ ] T035 Add `plan` Step Contract factory floor tests (RED).
  - Paths: `src/main/domain/factories/plan.factory.spec.ts`.
  - Dependencies: T034.
  - Acceptance: The spec exercises `validatePlanArtifacts(featureDir, context)` through seven sequential sub-tracer bullets: happy `plan.md` + `research.md`; empty object; `null`; `undefined`; hostile malformed plan metadata; partial plausible missing `research.md`; extra-key rejection; it proves only Plan may include the context-file exception. Vertical discipline rider: implement each floor case as RED case 1 -> GREEN, RED case 2 -> tighten GREEN, and so on; a single batched RED test for all cases violates this task.

- [ ] T036 Implement `plan` Step Contract factory (GREEN).
  - Paths: `src/main/domain/factories/plan.factory.ts`, `src/main/domain/factories/types.ts`, `src/main/domain/factories/factoryUtils.ts`.
  - Dependencies: T035.
  - Acceptance: The factory returns a typed commit candidate or escape-hatch reason, includes the Plan context-file exception only when resolved, rejects extra keys, and `plan.factory.spec.ts` passes.

- [ ] T037 Add `tasks` Step Contract factory floor tests (RED).
  - Paths: `src/main/domain/factories/tasks.factory.spec.ts`.
  - Dependencies: T036.
  - Acceptance: The spec exercises `validateTasksArtifacts(featureDir, context)` through seven sequential sub-tracer bullets: happy `tasks.md`; empty object; `null`; `undefined`; hostile malformed task payload; partial plausible task file; extra-key rejection. Vertical discipline rider: implement each floor case as RED case 1 -> GREEN, RED case 2 -> tighten GREEN, and so on; a single batched RED test for all cases violates this task.

- [ ] T038 Implement `tasks` Step Contract factory (GREEN).
  - Paths: `src/main/domain/factories/tasks.factory.ts`, `src/main/domain/factories/types.ts`, `src/main/domain/factories/factoryUtils.ts`.
  - Dependencies: T037.
  - Acceptance: The factory returns a typed commit candidate or escape-hatch reason, stages only `tasks.md`, rejects extra keys, and `tasks.factory.spec.ts` passes.

- [ ] T039 Add `analyze` Step Contract factory floor tests (RED).
  - Paths: `src/main/domain/factories/analyze.factory.spec.ts`.
  - Dependencies: T038.
  - Acceptance: The spec exercises `validateAnalyzeArtifacts(featureDir, context)` through seven sequential sub-tracer bullets: happy `analyze.md`; empty object; `null`; `undefined`; hostile malformed analysis payload; partial plausible analysis file; extra-key rejection; it asserts the commit candidate carries `allowEmptyCommit: true`. Vertical discipline rider: implement each floor case as RED case 1 -> GREEN, RED case 2 -> tighten GREEN, and so on; a single batched RED test for all cases violates this task.

- [ ] T040 Implement `analyze` Step Contract factory (GREEN).
  - Paths: `src/main/domain/factories/analyze.factory.ts`, `src/main/domain/factories/types.ts`, `src/main/domain/factories/factoryUtils.ts`.
  - Dependencies: T039.
  - Acceptance: The factory returns a typed commit candidate or escape-hatch reason, marks Analyze as empty-commit eligible, rejects extra keys, and `analyze.factory.spec.ts` passes.

- [ ] T041 Add `review` Step Contract factory floor tests (RED).
  - Paths: `src/main/domain/factories/review.factory.spec.ts`.
  - Dependencies: T040.
  - Acceptance: The spec exercises `validateReviewArtifacts(featureDir, context)` through seven sequential sub-tracer bullets: happy no-required-artifact Review; empty object; `null`; `undefined`; hostile malformed review payload; partial plausible review payload; extra-key rejection. Vertical discipline rider: implement each floor case as RED case 1 -> GREEN, RED case 2 -> tighten GREEN, and so on; a single batched RED test for all cases violates this task.

- [ ] T042 Implement `review` Step Contract factory (GREEN).
  - Paths: `src/main/domain/factories/review.factory.ts`, `src/main/domain/factories/types.ts`, `src/main/domain/factories/factoryUtils.ts`.
  - Dependencies: T041.
  - Acceptance: The factory returns a typed commit candidate or escape-hatch reason for infrastructure-only Review, rejects extra keys, and `review.factory.spec.ts` passes.

## Phase 5 - Step Commit writer

- [ ] T043 Add real-git Step Commit success test (RED).
  - Paths: `src/main/data-layer/git/gitCommand.test.ts`.
  - Dependencies: T042.
  - Acceptance: The failing test uses a real temporary git repository with a passing pre-commit hook and asserts `commitWithTrailer` stages requested files, writes exactly one `Concierge-Step: specify:pass` trailer via `git interpret-trailers`, honors the hook, and never emits `--no-verify`.

- [ ] T044 Implement `commitWithTrailer` success path (GREEN).
  - Paths: `src/main/data-layer/git/gitCommand.ts`.
  - Dependencies: T043.
  - Acceptance: The writer stages candidate files, creates a message file, appends exactly one trailer, runs `git commit -F`, exposes no bypass flag, and the success test passes.

- [ ] T045 Add pre-commit rejection test (RED).
  - Paths: `src/main/data-layer/git/gitCommand.test.ts`.
  - Dependencies: T044.
  - Acceptance: The failing test installs a rejecting pre-commit hook and asserts the hook output is surfaced as a typed git-command failure with no success-shaped fallback and no bypass attempt.

- [ ] T046 Implement pre-commit failure propagation (GREEN).
  - Paths: `src/main/data-layer/git/gitCommand.ts`.
  - Dependencies: T045.
  - Acceptance: Hook failures preserve stdout/stderr/status for Step Escape Hatch handling, leave no false commit result, and `gitCommand.test.ts` passes.

- [ ] T047 Add Analyze no-diff empty-commit test (RED).
  - Paths: `src/main/data-layer/git/gitCommand.test.ts`.
  - Dependencies: T046.
  - Acceptance: The failing test asserts only `analyze` can request `--allow-empty`, the trailer is preserved when no artifact diff exists, and all other steps reject empty-commit usage.

- [ ] T048 Implement Analyze empty-commit support (GREEN).
  - Paths: `src/main/data-layer/git/gitCommand.ts`.
  - Dependencies: T047.
  - Acceptance: `--allow-empty` is emitted only for Analyze, the public writer API cannot request hook bypass, and all git-command tests pass.

## Phase 6 - In-flight marker filesystem primitives

- [ ] T049 Add in-flight marker write test (RED).
  - Paths: `src/main/hooks/inFlightMarker.test.ts`.
  - Dependencies: T048.
  - Acceptance: The failing test writes a marker at `userData/in-flight/${sessionId}/${step}.marker` with JSON containing `step`, `startedAt`, `sessionId`, and `expectedArtifacts`, using existing safe-write/fsync discipline.

- [ ] T050 Implement marker write primitive (GREEN).
  - Paths: `src/main/hooks/inFlightMarker.ts`.
  - Dependencies: T049.
  - Acceptance: Marker writes use the locked path, create parent directories safely, preserve explicit filesystem errors, and the write test passes.

- [ ] T051 Add marker read/remove/persistence tests (RED).
  - Paths: `src/main/hooks/inFlightMarker.test.ts`.
  - Dependencies: T050.
  - Acceptance: The failing tests prove marker presence persists across simulated restart, marker parsing rejects malformed JSON/step mismatch, and marker removal occurs only when explicitly requested after Step Commit success.

- [ ] T052 Implement marker read/remove primitives (GREEN).
  - Paths: `src/main/hooks/inFlightMarker.ts`.
  - Dependencies: T051.
  - Acceptance: Reads and removes are explicit, malformed markers fail with named errors, removal does not hide filesystem failures, and marker tests pass.

## Phase 7 - Steps slice reducer full monotonic invariants

- [ ] T053 Add rejected reverse-transition test (RED).
  - Paths: `src/renderer/slices/steps.test.ts`.
  - Dependencies: T052.
  - Acceptance: The failing test proves `complete -> pending` for the same step is rejected and the entity remains `complete`.

- [ ] T054 Guard reverse transitions (GREEN).
  - Paths: `src/renderer/slices/steps.ts`.
  - Dependencies: T053.
  - Acceptance: `stepPending` preserves completed steps, does not mutate unrelated steps, and the reverse-transition test passes.

- [ ] T055 Add rejected skip-to-complete test (RED).
  - Paths: `src/renderer/slices/steps.test.ts`.
  - Dependencies: T054.
  - Acceptance: The failing test proves `not_available -> complete` is rejected without a prior `pending` state.

- [ ] T056 Guard completion on pending state (GREEN).
  - Paths: `src/renderer/slices/steps.ts`.
  - Dependencies: T055.
  - Acceptance: `stepCompleted` only transitions `pending -> complete`, preserves skipped completions as `not_available`, and the skip test passes.

- [ ] T057 Add Escape Hatch reset reducer test (RED).
  - Paths: `src/renderer/slices/steps.test.ts`.
  - Dependencies: T056.
  - Acceptance: The failing test proves `stepReset({ step, reason })` resets `pending` and `complete` to `not_available`, and is the only legal non-monotonic transition.

- [ ] T058 Implement Escape Hatch reset reducer (GREEN).
  - Paths: `src/renderer/slices/steps.ts`.
  - Dependencies: T057.
  - Acceptance: `stepReset` resets any step to `not_available`, does not invent `fail`/`skipped` renderer states, and the reset test passes.

- [ ] T059 Add trailer restoration mapping and last-trailer-wins tests (RED).
  - Paths: `src/renderer/slices/steps.test.ts`, `src/main/data-layer/git/trailers.test.ts`.
  - Dependencies: T058.
  - Acceptance: The failing tests prove `pass -> complete`, `pending -> pending`, `fail -> not_available`, `skipped -> not_available`, and last trailer wins per step across all six steps.

- [ ] T060 Implement trailer restoration mapping (GREEN).
  - Paths: `src/renderer/slices/steps.ts`, `src/main/data-layer/git/trailers.ts`.
  - Dependencies: T059.
  - Acceptance: Restoration maps git trailer statuses before they reach renderer state, replaces cache without unrelated-slice mutation, and restoration tests pass.

## Phase 8 - `stepLifecycle.listener.ts` body

- [ ] T061 Add `stepsRestoredFromDisk` listener test (RED).
  - Paths: `src/renderer/listeners/stepLifecycle.listener.test.ts`, `src/renderer/api/steps.endpoint.test.ts`.
  - Dependencies: T060.
  - Acceptance: The failing test dispatches an active workspace change through the product store, reads trailer-derived step records through the existing preload/RTK Query seam, applies last-trailer-wins restoration, and leaves unrelated slices unchanged.

- [ ] T062 Implement restoration listener path (GREEN).
  - Paths: `src/renderer/listeners/stepLifecycle.listener.ts`, `src/renderer/api/steps.endpoint.ts`, `src/renderer/api/steps.factory.ts`.
  - Dependencies: T061.
  - Acceptance: The listener restores step state from disk-derived trailer records via public endpoints only, imports no Electron/Node APIs, and the restoration test passes.

- [ ] T063 Add dirty-resume listener test (RED).
  - Paths: `src/renderer/listeners/stepLifecycle.listener.test.ts`, `src/main/ipc/steps.test.ts`.
  - Dependencies: T062.
  - Acceptance: The failing test proves uncommitted expected artifacts plus an in-flight marker dispatch `stepPending`, emit an info/activity `workspace-dirty-resume` event, and do not dispatch toast/modal/banner UI actions.

- [ ] T064 Implement silent dirty resume (GREEN).
  - Paths: `src/renderer/listeners/stepLifecycle.listener.ts`, `src/main/ipc/steps.ts`, `src/main/ipc/steps.factory.ts`.
  - Dependencies: T063.
  - Acceptance: Dirty resume uses existing git uncommitted-path readers through IPC, records structured activity only, preserves explicit errors, and the dirty-resume test passes.

- [ ] T065 Add Escape Hatch orchestration listener test (RED).
  - Paths: `src/renderer/listeners/stepLifecycle.listener.test.ts`, `src/main/hooks/dispatcher.test.ts`.
  - Dependencies: T064.
  - Acceptance: The failing test proves hook failure cancels the active ACP turn, allows a 5-second graceful window before supervisor fallback, reverts expected artifacts, resets the step to `not_available`, and logs `step-escape-hatch-triggered`.

- [ ] T066 Implement Escape Hatch orchestration (GREEN).
  - Paths: `src/renderer/listeners/stepLifecycle.listener.ts`, `src/main/hooks/dispatcher.ts`, `src/main/data-layer/git/gitCommand.ts`.
  - Dependencies: T065.
  - Acceptance: Escape Hatch uses the Run 3 ACP boundary, real git checkout for manifest files, no product UI, no raw renderer side effects, and the orchestration test passes.

- [ ] T067 Add Plan context-file revert exception test (RED).
  - Paths: `src/renderer/listeners/stepLifecycle.listener.test.ts`, `src/main/hooks/dispatcher.test.ts`.
  - Dependencies: T066.
  - Acceptance: The failing test proves only the Plan step may revert the resolved context-file path outside the feature directory; every other step reverts only manifest expected artifacts.

- [ ] T068 Implement Plan revert exception (GREEN).
  - Paths: `src/renderer/listeners/stepLifecycle.listener.ts`, `src/main/hooks/dispatcher.ts`, `src/main/hooks/manifest.ts`.
  - Dependencies: T067.
  - Acceptance: Plan includes the context-file exception exactly, other steps cannot include outside-feature paths, and the Plan exception test passes.

- [ ] T069 Add Clarify malformed-question re-ask test (RED).
  - Paths: `src/renderer/listeners/stepLifecycle.listener.test.ts`.
  - Dependencies: T068.
  - Acceptance: The failing test dispatches the public `clarify/questionMalformed` action, proves only the malformed question is prompted for rewrite, well-formed questions are preserved, and no factory or ACP internals are mocked.

- [ ] T070 Implement Clarify re-ask routing (GREEN).
  - Paths: `src/renderer/listeners/stepLifecycle.listener.ts`, `src/renderer/slices/steps.ts`.
  - Dependencies: T069.
  - Acceptance: The listener routes a targeted ACP prompt through sanctioned session APIs, keeps malformed questions visible, and the re-ask test passes.

- [ ] T071 Add Clarify three-attempt exhaustion test (RED).
  - Paths: `src/renderer/listeners/stepLifecycle.listener.test.ts`.
  - Dependencies: T070.
  - Acceptance: The failing test proves attempts 1 and 2 re-ask, attempt 3 triggers Step Escape Hatch with reason `clarify-rigor-exhausted`, and counters are scoped per malformed question id.

- [ ] T072 Implement bounded Clarify exhaustion (GREEN).
  - Paths: `src/renderer/listeners/stepLifecycle.listener.ts`.
  - Dependencies: T071.
  - Acceptance: Per-question counters are bounded at three, exhaustion dispatches Escape Hatch with the locked reason, and all step lifecycle listener tests pass.

## Phase 9 - `transcriptCapture.listener.ts` body

- [ ] T073 Add ACP transcript activity capture test (RED).
  - Paths: `src/renderer/listeners/transcriptCapture.listener.test.ts`, `src/renderer/slices/activity.test.ts`.
  - Dependencies: T072.
  - Acceptance: The failing test dispatches a public ACP stream event, appends a capped activity entry, and updates `lastAcpEventAt` without importing Electron/Node APIs.

- [ ] T074 Implement transcript activity capture (GREEN).
  - Paths: `src/renderer/listeners/transcriptCapture.listener.ts`, `src/renderer/slices/activity.ts`, `src/renderer/slices/activity.selectors.ts`.
  - Dependencies: T073.
  - Acceptance: ACP stream activity flows through listener middleware, activity remains capped at 256, selectors expose `lastAcpEventAt`, and capture tests pass.

- [ ] T075 Add no-early-hang fake-timer test (RED).
  - Paths: `src/renderer/listeners/transcriptCapture.listener.test.ts`.
  - Dependencies: T074.
  - Acceptance: The failing fake-timer test proves the listener checks every 30 seconds and emits no `hang-suspected` before 20 minutes of ACP stream silence.

- [ ] T076 Implement 30-second hang poll without early emission (GREEN).
  - Paths: `src/renderer/listeners/transcriptCapture.listener.ts`.
  - Dependencies: T075.
  - Acceptance: The poll interval is exactly 30 seconds, the threshold is not lowered, no auto-fail/cancel/retry happens, and the no-early-hang test passes.

- [ ] T077 Add at-threshold hang-suspected test (RED).
  - Paths: `src/renderer/listeners/transcriptCapture.listener.test.ts`, `src/renderer/slices/activity.test.ts`.
  - Dependencies: T076.
  - Acceptance: The failing test proves one soft `hang-suspected` activity event is emitted at or after 20 minutes of silence, includes step/session context and reason, and dedupes until a new ACP event advances `lastAcpEventAt`.

- [ ] T078 Implement hang-suspected threshold event (GREEN).
  - Paths: `src/renderer/listeners/transcriptCapture.listener.ts`, `src/renderer/slices/activity.ts`.
  - Dependencies: T077.
  - Acceptance: Hang detection uses exactly 20 minutes (`1200000` ms), emits one structured activity event, never fails/cancels/retries a step, and transcript capture tests pass.

## Phase 10 - `.specify/extensions.yml` registration of twelve hooks

- [ ] T079 Add extensions registration test (RED).
  - Paths: `src/main/hooks/extensionsRegistration.test.ts`, `.specify/extensions.yml`.
  - Dependencies: T078.
  - Acceptance: The failing check asserts all twelve lifecycle keys exist, each Concierge lifecycle entry points to `concierge.stepLifecycle.dispatch`, existing extension entries are preserved, and no lifecycle key points directly to a named hook file.

- [ ] T080 Register Concierge lifecycle hooks (GREEN).
  - Paths: `.specify/extensions.yml`.
  - Dependencies: T079.
  - Acceptance: `before_specify`, `after_specify`, `before_clarify`, `after_clarify`, `before_plan`, `after_plan`, `before_tasks`, `after_tasks`, `before_analyze`, `after_analyze`, `before_review`, and `after_review` are registered through the single dispatcher command without removing existing extension entries.

## Phase 11 - `driftVerifier.ts` startup parser

- [ ] T081 Add drift verifier warn-not-fail test (RED).
  - Paths: `src/main/hooks/driftVerifier.test.ts`, `src/main/index.ts`.
  - Dependencies: T080.
  - Acceptance: The failing test loads an installed `.github/agents/speckit.*.agent.md` fixture whose declared outputs differ from `STEP_ARTIFACT_MANIFEST`, mocks `createMainLogger`, asserts `logger.warn`/activity record for `agent-manifest-drift`, and asserts startup does not throw.

- [ ] T082 Implement startup drift verifier shell (GREEN).
  - Paths: `src/main/hooks/driftVerifier.ts`, `src/main/index.ts`.
  - Dependencies: T081.
  - Acceptance: The verifier runs at app startup after manifest loading, dependency-injects filesystem/logger/activity sink, warns without failing, and the warn-not-fail test passes.

- [ ] T083 Add frontmatter and designated-section parser tests (RED).
  - Paths: `src/main/hooks/driftVerifier.test.ts`, `tests/fixtures/agent-manifests/`.
  - Dependencies: T082.
  - Acceptance: The failing tests parse output filenames from frontmatter and a designated outputs section using real fixture text, reject ambiguous output declarations with a warning record, and add no YAML/runtime parser dependency.

- [ ] T084 Implement drift parser cases (GREEN).
  - Paths: `src/main/hooks/driftVerifier.ts`, `tests/fixtures/agent-manifests/`.
  - Dependencies: T083.
  - Acceptance: The no-dependency parser extracts declared outputs, compares by step against `STEP_ARTIFACT_MANIFEST`, records drift as warn/activity, and all drift verifier tests pass.

## Phase 12 - Final verification executable T-series

- [ ] T085 Verify Run 5 automated checks and boundary greps.
  - Paths: `package.json`, `package-lock.json`, `src/`, `e2e/`, `specs/0005-step-lifecycle-hooks/tasks.md`.
  - Dependencies: T084.
  - Acceptance: ALL must pass:
    - `npm run lint`
    - `npm run typecheck`
    - `npm run test:coverage`
    - `npm run e2e`
    - `rg -- "--no-verify" src package.json` returns no matches.
    - `rg "simple-git|nodegit" src package.json` returns no matches.
    - `rg "from ['\"](electron|node:|fs|child_process|path|os)" src/renderer --type ts` returns no renderer matches.
    - `rg "spawn|execFile|ClientSideConnection|ndJsonStream" src --type ts` returns matches only in `src/main/data-layer/acp/` or tests/fixtures that prove the boundary.
    - `rg "userData.*in-flight|in-flight.*\\.marker" src --type ts` proves the locked marker path.

- [ ] T086 Verify Run 5 executable invariants.
  - Paths: `src/renderer/slices/steps.test.ts`, `src/renderer/listeners/transcriptCapture.listener.test.ts`, `src/main/hooks/driftVerifier.test.ts`, `src/main/data-layer/git/gitCommand.test.ts`.
  - Dependencies: T085.
  - Acceptance: ALL executable assertions pass:
    - Step state vocabulary is exactly `not_available | pending | complete`.
    - State-machine tests cover `not_available -> pending -> complete`, rejected `complete -> pending`, rejected `not_available -> complete`, and Escape Hatch reset to `not_available`.
    - Trailer restoration covers `pass`, `pending`, `fail`, `skipped`, and last-trailer-wins for all six steps.
    - Hang detection checks every 30 seconds and emits `hang-suspected` only at or after exactly 20 minutes.
    - Drift verifier presence is covered and startup drift warns without failing.
    - Real git Step Commit tests prove pre-commit hooks are honored and Analyze supports no-diff empty commits.
    - Grill Q13 lifecycle schema coverage is explicit: ALL 13 locked event names (`step-before-hook-start`, `step-before-hook-end`, `step-pending`, `step-prompt-issued`, `step-prompt-complete`, `step-after-hook-start`, `step-after-hook-end`, `step-commit-written`, `step-complete`, `step-escape-hatch-triggered`, `workspace-dirty-resume`, `agent-manifest-drift`, `hang-suspected`) appear in test output, and each event assertion includes required fields `event`, `step`, `sessionId` plus optional `latencyMs`, `reason`, and `trailer` where applicable. This may be enforced by a coverage-style grep over test files or by a runtime assertion proving the activity slice captures all 13 event types.
    - **SC-011 test-count threshold (executable assertion):** Run the following and require exit code 0:
      ```sh
      count=$(npm run test:coverage 2>&1 | grep -oE "Tests +[0-9]+ passed" | grep -oE "[0-9]+" | head -1)
      if [ -z "$count" ] || [ "$count" -lt 600 ]; then
        echo "SC-011 violated: expected >= 600 tests, got ${count:-unknown}"; exit 1
      fi
      echo "SC-011 test-count: $count (>= 600)"
      ```

- [ ] T087 Verify Run 5 governance, dependency, and completed-doc exclusions.
  - Paths: `.github/copilot-instructions.md`, `docs/adr/0008-step-state-machine.md`, `docs/adr/0009-clarify-reask-listener.md`, `.specify/extensions.yml`, `package.json`, `package-lock.json`.
  - Dependencies: T086.
  - Acceptance: ALL must pass:
    - `docs/adr/0008-step-state-machine.md` and `docs/adr/0009-clarify-reask-listener.md` exist with `**Status:** Accepted`.
    - `.github/copilot-instructions.md` mentions Run 5 hook layout, factory paths, state vocabulary, trailer mapping, in-flight marker path, Clarify re-ask routing, and pino `createMainLogger` discipline.
    - `.specify/extensions.yml` contains all twelve lifecycle hooks and all Concierge lifecycle entries use the single dispatcher command.
    - **Dependency invariant (executable assertion):** Run the following node script and require exit code 0:
      ```sh
      node -e "
        const main = require('child_process').execSync('git show main:package.json', {encoding:'utf8'});
        const cur = require('./package.json');
        const mainPkg = JSON.parse(main);
        const mainDeps = Object.keys(mainPkg.dependencies||{}).sort().join(',');
        const curDeps = Object.keys(cur.dependencies||{}).sort().join(',');
        if (mainDeps !== curDeps) {
          console.error('Run 5 violated zero-runtime-dependency invariant.\\nmain:', mainDeps, '\\ncurrent:', curDeps);
          process.exit(1);
        }
        console.log('Run 5 dependency invariant: ok');
      "
      ```
    - No out-of-scope product UI, HTTP API, MCP integration, Jira submission UI, Windows packaging changes, or Step Agent rewrites were introduced.
