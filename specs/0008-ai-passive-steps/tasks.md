---
feature: Run 8 AI-Passive Steps Vertical
branch: spec/0008-ai-passive-steps
created: 2026-05-29
source_plan: specs/0008-ai-passive-steps/plan.md
---

# Tasks: Run 8 AI-Passive Steps Vertical

**Input**: `specs/0008-ai-passive-steps/spec.md`, `specs/0008-ai-passive-steps/plan.md`, `specs/0008-ai-passive-steps/research.md`, `specs/0008-ai-passive-steps/data-model.md`, `specs/0008-ai-passive-steps/contracts/artifact-read.md`, `specs/0008-ai-passive-steps/contracts/passive-step-streaming.md`, `specs/0008-ai-passive-steps/contracts/step-contracts.md`, `specs/0008-ai-passive-steps/contracts/task-detail.md`, `specs/0008-ai-passive-steps/contracts/visual-contracts.md`, `specs/0008-ai-passive-steps/quickstart.md`, `docs/adr/0011-status-step-row-union.md`, `docs/adr/0012-register-passive-step-ipc.md`, and `ROADMAP_DECISIONS.md`

**Tests**: Required. Run 8 is TDD-first and must proceed as vertical tracer bullets: write one failing public-behavior test, implement the thinnest GREEN, then move to the next failing behavior.

**Organization**: Tasks are grouped by user story so each passive step increment can be built and verified independently once the shared scaffolding is complete.

**Run 8 guards**:
- Preserve the existing eight renderer slices; do not add a ninth slice.
- Keep listener ownership and RTK Query ownership for passive execution, hang detection, lazy artifact fetch, and task-detail fetch.
- Add exactly `react-markdown`, `rehype-sanitize`, and `remark-gfm`; do not add `rehype-raw`, syntax highlighting, icon, UI, or animation runtime dependencies.
- Keep the shipped plural `artifacts:read` capability and fetch artifact bodies only on explicit user action.
- Remove Analyze drift that expects `analyze.md`; allow only `spec.md`, `plan.md`, and `tasks.md` remediation plus empty Step Commit no-diff pass proof.
- Share passive orchestration only through `registerPassiveStepIpc` for Plan, Tasks, and Analyze; do not refactor Specify or Clarify into the helper.
- Add exactly 10 new visual screens and verify the inherited 27 screens remain stable.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Put the Run 8 execution scaffold and locked dependencies in place before shared contracts and story work begin.

- [ ] T001 Create the failing Run 8 passive vertical journey scaffold in `e2e/passive-steps-vertical.spec.ts`
- [ ] T002 Add the locked markdown dependencies `react-markdown`, `rehype-sanitize`, and `remark-gfm` in `package.json` and `package-lock.json`
- [ ] T003 [P] Extend passive transcript and artifact fixtures for Plan, Tasks, Analyze, and markdown evidence in `e2e/support/boundaries.ts`, `specs/0008-ai-passive-steps/fixtures/plan-transcript.jsonl`, `specs/0008-ai-passive-steps/fixtures/tasks-transcript.jsonl`, `specs/0008-ai-passive-steps/fixtures/analyze-transcript.jsonl`, and `specs/0008-ai-passive-steps/fixtures/markdown-render-findings.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared trust-boundary, IPC, and preload/API seams that every passive-step story depends on.

**⚠️ CRITICAL**: No user story work starts until this phase is complete.

- [ ] T004 Add failing Analyze drift-migration tests removing `analyze.md` and allowing only `spec.md`, `plan.md`, and `tasks.md` plus empty Step Commit in `src/main/domain/factories/analyze.factory.test.ts` and `src/main/hooks/manifest.test.ts`
- [ ] T005 Implement the Analyze manifest and factory drift rewrite in `src/main/hooks/manifest.ts`, `src/main/domain/factories/analyze.factory.ts`, and `src/main/data-layer/agents/manifest.ts`
- [ ] T006 Add failing `registerPassiveStepIpc` contract tests for terminal-event-once, `.specify/feature.json` pin resolution over branch fallback, error propagation, abort/cancel behavior, and observability in `src/main/ipc/passiveStepIpc.test.ts`, `src/main/ipc/copilotPlan.test.ts`, `src/main/ipc/copilotTasks.test.ts`, and `src/main/ipc/copilotAnalyze.test.ts`
- [ ] T007 Implement `registerPassiveStepIpc` with disk-read active feature pin resolution for Plan, Tasks, and Analyze only in `src/main/ipc/passiveStepIpc.ts`, `src/main/ipc/copilotPlan.ts`, `src/main/ipc/copilotTasks.ts`, `src/main/ipc/copilotAnalyze.ts`, and `src/main/index.ts`
- [ ] T008 Add failing preload and renderer trust-boundary tests for `copilot:plan`, `copilot:tasks`, `copilot:analyze`, plural `artifacts:read`, `tasks:detail`, and lazy fetch entry points in `src/preload/index.test.ts`, `src/renderer/api/copilotPassive.endpoint.test.ts`, `src/renderer/api/artifacts.endpoint.test.ts`, and `src/renderer/api/tasksDetail.endpoint.test.ts`
- [ ] T009 Implement preload exposure and renderer endpoint wiring for `copilot:plan`, `copilot:tasks`, `copilot:analyze`, plural `artifacts:read`, and `tasks:detail` in `src/preload/index.ts`, `src/renderer/api/copilotPassive.endpoint.ts`, `src/renderer/api/artifacts.endpoint.ts`, and `src/renderer/api/tasksDetail.endpoint.ts`

**Checkpoint**: Analyze drift is removed, passive IPC safety invariants are shared, and renderer/main seams are ready for story work.

---

## Phase 3: User Story 1 - Watch Plan produce planning evidence (Priority: P1) 🎯 MVP

**Goal**: Replace the Plan placeholder with the passive watching flow so users can start Plan, see progress evidence, and trust required and optional planning artifacts plus commit proof.

**Independent Test**: Starting from a completed Specify and Clarify session, run Plan, observe streamed progress rows, navigate away and back without losing state, and confirm pass proof shows `plan.md`, `research.md`, optional artifacts, context-file exception when present, and `commitSha`.

### Tests for User Story 1

- [ ] T010 [US1] Add failing passive Plan journey assertions in `e2e/passive-steps-vertical.spec.ts`
- [ ] T011 [US1] Add failing Plan contract and IPC tests for the seven-case factory floor, required artifacts, optional artifact summary, context-file exception, and missing usage metadata in `src/main/domain/factories/plan.factory.test.ts` and `src/main/ipc/copilotPlan.test.ts`
- [ ] T012 [US1] Add failing renderer tests for passive attempt state, ADR-0011 row rendering, and background-navigation persistence in `src/renderer/slices/session.test.ts`, `src/renderer/slices/session.selectors.ts`, `src/renderer/components/PlanStep.test.tsx`, `src/renderer/components/PlanStepContainer.test.tsx`, and `src/renderer/components/StatusStep.test.tsx`

### Implementation for User Story 1

- [ ] T013 [US1] Implement Plan passive contract validation and manifest summary in `src/main/domain/factories/plan.factory.ts` and `src/main/ipc/copilotPlan.ts`
- [ ] T014 [US1] Implement passive Plan attempt state and selectors without a new slice in `src/renderer/slices/session.ts` and `src/renderer/slices/session.selectors.ts`
- [ ] T015 [US1] Implement `PlanStep`, `PlanStepContainer`, `StatusStep`, and workspace routing for passive Plan in `src/renderer/components/PlanStep.tsx`, `src/renderer/components/PlanStepContainer.tsx`, `src/renderer/components/StatusStep.tsx`, and `src/renderer/components/WorkspaceContainer.tsx`
- [ ] T016 [US1] Make the passive Plan MVP pass end-to-end in `e2e/passive-steps-vertical.spec.ts` and `e2e/support/boundaries.ts`

**Checkpoint**: User Story 1 delivers the MVP passive Plan experience and unblocks downstream Tasks work.

---

## Phase 4: User Story 2 - Watch Tasks and inspect parsed task details (Priority: P1)

**Goal**: Let users watch Tasks complete passively, inspect parsed task rows, and open stable task-detail data from validated `tasks.md`.

**Independent Test**: After Plan passes, run Tasks, confirm streamed milestones and accepted terminal outcome, open one task detail row, and verify id, title, phase/area, dependencies, files, acceptance notes, and estimate are displayed when present.

### Tests for User Story 2

- [ ] T017 [US2] Add failing Tasks passive journey and duplicate-terminal assertions in `e2e/passive-steps-vertical.spec.ts` and `src/main/ipc/copilotTasks.test.ts`
- [ ] T018 [US2] Add failing `tasks.md` seven-case factory floor, parsing, feature-pin task-detail resolution, and task-detail contract tests for id, title, phase/area, dependencies, files, acceptance notes, estimate, and malformed dependency rejection in `src/main/domain/factories/tasks.factory.test.ts` and `src/main/ipc/tasksDetail.test.ts`
- [ ] T019 [US2] Add failing renderer tests for task rows, lazy `tasks:detail` fetch, and accessible task-detail dialog in `src/renderer/api/tasksDetail.endpoint.test.ts`, `src/renderer/components/TasksStep.test.tsx`, `src/renderer/components/TasksStepContainer.test.tsx`, and `src/renderer/components/TaskViewer.test.tsx`

### Implementation for User Story 2

- [ ] T020 [US2] Implement `tasks.md` manifest validation and `tasks:detail` parsing in `src/main/domain/factories/tasks.factory.ts` and `src/main/ipc/tasksDetail.ts`
- [ ] T021 [US2] Implement Tasks passive orchestration and terminal dedupe in `src/main/ipc/copilotTasks.ts` and `src/main/ipc/passiveStepIpc.ts`
- [ ] T022 [US2] Implement Tasks rows, lazy task-detail fetch, and dialog rendering in `src/renderer/api/tasksDetail.endpoint.ts`, `src/renderer/components/TasksStep.tsx`, `src/renderer/components/TasksStepContainer.tsx`, `src/renderer/components/TaskViewer.tsx`, and `src/renderer/slices/session.ts`
- [ ] T023 [US2] Make the passive Tasks and task-detail flow pass end-to-end in `e2e/passive-steps-vertical.spec.ts` and `e2e/support/boundaries.ts`

**Checkpoint**: User Story 2 makes `tasks.md` actionable and inspectable without leaving the passive flow.

---

## Phase 5: User Story 3 - Watch Analyze validate remediation or no-diff pass (Priority: P1)

**Goal**: Let Analyze run passively with bounded remediation, no `analyze.md`, and auditable no-diff or allowed-target pass proof.

**Independent Test**: After Tasks passes, run Analyze, confirm progress milestones, accept a no-diff pass with empty Step Commit proof, accept only `spec.md`/`plan.md`/`tasks.md` remediation, and reject `analyze.md` or outside-feature changes.

### Tests for User Story 3

- [ ] T024 [US3] Add failing Analyze seven-case factory floor, no-diff, allowed-target, disallowed-target, and compact terminal-summary tests in `src/main/ipc/copilotAnalyze.test.ts`, `src/main/domain/factories/analyze.factory.test.ts`, and `src/main/hooks/manifest.test.ts`
- [ ] T025 [US3] Add failing renderer tests for Analyze remediation rows, no-diff pass proof, and failure recovery in `src/renderer/components/AnalyzeStep.test.tsx`, `src/renderer/components/AnalyzeStepContainer.test.tsx`, `src/renderer/components/StatusStep.test.tsx`, and `src/renderer/listeners/stepLifecycle.listener.test.ts`

### Implementation for User Story 3

- [ ] T026 [US3] Implement Analyze passive orchestration, remediation summary, and empty Step Commit pass handling in `src/main/ipc/copilotAnalyze.ts`, `src/main/ipc/passiveStepIpc.ts`, `src/main/domain/factories/analyze.factory.ts`, and `src/main/hooks/manifest.ts`
- [ ] T027 [US3] Implement Analyze passive rows and recovery rendering in `src/renderer/components/AnalyzeStep.tsx`, `src/renderer/components/AnalyzeStepContainer.tsx`, `src/renderer/slices/session.ts`, and `src/renderer/listeners/stepLifecycle.listener.ts`
- [ ] T028 [US3] Make the passive Analyze bounded-remediation flow pass end-to-end in `e2e/passive-steps-vertical.spec.ts` and `e2e/support/boundaries.ts`

**Checkpoint**: User Story 3 completes the passive Plan -> Tasks -> Analyze chain with bounded, auditable Analyze outcomes.

---

## Phase 6: User Story 4 - View evidence artifacts on demand (Priority: P1)

**Goal**: Let users open validated artifact evidence only on demand and inspect markdown, text/code, oversized, binary, image, and PDF cases safely.

**Independent Test**: After a passive step passes, click an evidence affordance, verify no eager artifact body fetch occurred beforehand, and confirm the viewer handles markdown, oversized files, binary files, image/PDF metadata, hostile HTML stripping, and absent optional artifacts correctly.

### Tests for User Story 4

- [ ] T029 [US4] Add failing plural `artifacts:read` tests for validated-path checks, feature-pin artifact resolution, lazy fetch, 512 KiB metadata-only guard, and image/PDF/binary metadata responses in `src/main/ipc/artifacts.test.ts` and `src/renderer/api/artifacts.endpoint.test.ts`
- [ ] T030 [US4] Add failing markdown renderer and artifact-viewer tests for `react-markdown`, `rehype-sanitize`, `remark-gfm`, hostile HTML stripping, and accessible focus restore in `src/renderer/components/Markdown.test.tsx` and `src/renderer/components/ArtifactViewer.test.tsx`

### Implementation for User Story 4

- [ ] T031 [US4] Implement lazy plural `artifacts:read` behavior and metadata-only evidence responses in `src/main/ipc/artifacts.ts` and `src/renderer/api/artifacts.endpoint.ts`
- [ ] T032 [US4] Implement sanitized markdown rendering and evidence-viewer wiring in `src/renderer/components/Markdown.tsx`, `src/renderer/components/ArtifactViewer.tsx`, `src/renderer/components/StatusStep.tsx`, `src/renderer/components/PlanStep.tsx`, `src/renderer/components/TasksStep.tsx`, and `src/renderer/components/AnalyzeStep.tsx`
- [ ] T033 [US4] Make evidence-on-demand and artifact-viewer behavior pass end-to-end in `e2e/passive-steps-vertical.spec.ts` and `e2e/support/boundaries.ts`

**Checkpoint**: User Story 4 keeps the passive screens fast while preserving trustworthy evidence inspection.

---

## Phase 7: User Story 5 - Stay informed during long-running passive steps (Priority: P2)

**Goal**: Show a visible soft hang notification with Cancel/Restart guidance when Plan, Tasks, or Analyze goes silent without auto-failing the step.

**Independent Test**: Simulate at least 20 minutes of ACP silence during a passive step, verify a deduped visible hang notification appears, confirm the step stays in progress, and confirm resumed activity clears the silent interval without duplicate notices.

### Tests for User Story 5

- [ ] T034 [US5] Add failing fake-timer hang-detection tests for 20-minute silence, dedupe, resumed-stream reset, and preservation of the 256-entry activity cap in `src/renderer/listeners/transcriptCapture.listener.test.ts`, `src/renderer/slices/session.test.ts`, `src/renderer/slices/activity.test.ts`, and `src/renderer/listeners/stepLifecycle.listener.test.ts`
- [ ] T035 [US5] Add failing passive Cancel/Restart guidance and no-auto-fail assertions in `e2e/passive-steps-vertical.spec.ts`, `src/main/ipc/passiveStepIpc.test.ts`, and `src/renderer/components/StatusStep.test.tsx`

### Implementation for User Story 5

- [ ] T036 [US5] Implement listener-owned hang detection, activity logging, and abort/cancel guidance routing in `src/renderer/listeners/transcriptCapture.listener.ts`, `src/renderer/listeners/stepLifecycle.listener.ts`, `src/renderer/slices/session.ts`, and `src/main/ipc/passiveStepIpc.ts`
- [ ] T037 [US5] Implement visible hang-notification rendering and live-status messaging in `src/renderer/components/StatusStep.tsx`, `src/renderer/components/PlanStep.tsx`, `src/renderer/components/TasksStep.tsx`, and `src/renderer/components/AnalyzeStep.tsx`
- [ ] T038 [US5] Make the soft hang-notification flow pass end-to-end in `e2e/passive-steps-vertical.spec.ts` and `e2e/support/boundaries.ts`

**Checkpoint**: User Story 5 adds safe long-running guidance without changing passive-step lifecycle semantics.

---

## Phase 8: User Story 6 - Preserve architecture and visual fidelity (Priority: P2)

**Goal**: Lock Run 8 into the existing architecture, keep the passive helper scoped to Plan/Tasks/Analyze, and land the exact 10 new visual screens while verifying the inherited 27 screens stay stable.

**Independent Test**: Confirm the product store still exposes eight slices, `registerPassiveStepIpc` remains limited to Plan/Tasks/Analyze, listener ownership stays intact, the exact 10 Run 8 screens are present, and the existing 27 visual screens pass unchanged.

### Tests for User Story 6

- [ ] T039 [US6] Add failing architecture guard tests for eight-slice state, no ninth slice, strict TypeScript boundaries, `registerPassiveStepIpc` closed-set scope, and listener ownership in `src/renderer/store.test.ts`, `src/renderer/slices/session.test.ts`, `src/main/ipc/passiveStepIpc.test.ts`, and `package.json`
- [ ] T040 [P] [US6] Add failing visual-diff coverage for `plan-passive-idle`, `plan-passive-running`, `plan-passive-done`, `tasks-passive-running`, `tasks-passive-done`, `analyze-passive-running`, `analyze-passive-done`, `artifact-viewer-markdown`, `task-viewer-detail`, and `passive-hang-notification` plus inherited 27-screen verification in `e2e/visual-diff/harness/screens.config.ts`, `e2e/design-fidelity.spec.ts`, `e2e/visual-diff/contracts/plan-passive-idle.contract.json`, `e2e/visual-diff/contracts/plan-passive-running.contract.json`, `e2e/visual-diff/contracts/plan-passive-done.contract.json`, `e2e/visual-diff/contracts/tasks-passive-running.contract.json`, `e2e/visual-diff/contracts/tasks-passive-done.contract.json`, `e2e/visual-diff/contracts/analyze-passive-running.contract.json`, `e2e/visual-diff/contracts/analyze-passive-done.contract.json`, `e2e/visual-diff/contracts/artifact-viewer-markdown.contract.json`, `e2e/visual-diff/contracts/task-viewer-detail.contract.json`, and `e2e/visual-diff/contracts/passive-hang-notification.contract.json`

### Implementation for User Story 6

- [ ] T041 [US6] Implement the locked Run 8 architecture guards without adding a slice or widening the helper in `src/main/ipc/passiveStepIpc.ts`, `src/renderer/store.ts`, `src/renderer/slices/session.ts`, and `src/renderer/components/WorkspaceContainer.tsx`
- [ ] T042 [US6] Implement the exact 10 Run 8 visual contracts and 27-screen stability assertions in `e2e/visual-diff/harness/screens.config.ts`, `e2e/design-fidelity.spec.ts`, `e2e/visual-diff/contracts/plan-passive-idle.contract.json`, `e2e/visual-diff/contracts/plan-passive-running.contract.json`, `e2e/visual-diff/contracts/plan-passive-done.contract.json`, `e2e/visual-diff/contracts/tasks-passive-running.contract.json`, `e2e/visual-diff/contracts/tasks-passive-done.contract.json`, `e2e/visual-diff/contracts/analyze-passive-running.contract.json`, `e2e/visual-diff/contracts/analyze-passive-done.contract.json`, `e2e/visual-diff/contracts/artifact-viewer-markdown.contract.json`, `e2e/visual-diff/contracts/task-viewer-detail.contract.json`, and `e2e/visual-diff/contracts/passive-hang-notification.contract.json`

**Checkpoint**: User Story 6 locks architecture, helper scope, and visual coverage for the full Run 8 surface.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Re-run the prescribed verification loops after all passive-step behavior is in place.

- [ ] T043 [P] Run the focused Run 8 verification loop from `specs/0008-ai-passive-steps/quickstart.md` against `src/main/domain/factories/plan.factory.test.ts`, `src/main/domain/factories/tasks.factory.test.ts`, `src/main/domain/factories/analyze.factory.test.ts`, `src/main/ipc/passiveStepIpc.test.ts`, `src/main/ipc/artifacts.test.ts`, `src/renderer/components/Markdown.test.tsx`, `src/renderer/components/StatusStep.test.tsx`, and `src/renderer/listeners/transcriptCapture.listener.test.ts`
- [ ] T044 Run the full Run 8 validation commands from `specs/0008-ai-passive-steps/quickstart.md`, including `npm run test:coverage`, against `e2e/passive-steps-vertical.spec.ts` and `e2e/visual-diff/harness/screens.config.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1: Setup** -> no dependencies.
- **Phase 2: Foundational** -> depends on Phase 1 and blocks every user story.
- **Phase 3: User Story 1** -> depends on Phase 2 and is the MVP.
- **Phase 4: User Story 2** -> depends on User Story 1 because Tasks watches the Plan output and task-detail parsing depends on validated `tasks.md`.
- **Phase 5: User Story 3** -> depends on User Story 2 because Analyze runs only after Tasks and reuses the passive helper/state seams.
- **Phase 6: User Story 4** -> depends on User Stories 1-3 because evidence affordances span Plan, Tasks, and Analyze.
- **Phase 7: User Story 5** -> depends on User Stories 1-3 because hang detection and manual cancel/restart guidance must observe the full passive pipeline.
- **Phase 8: User Story 6** -> depends on User Stories 1-5 because architecture and visual fidelity verify the completed Run 8 surface.
- **Phase 9: Polish** -> depends on all desired stories being complete.

### User Story Dependencies

- **US1**: Starts immediately after Foundational; no dependency on other stories.
- **US2**: Builds on US1's passive Plan flow and validated `tasks.md` evidence.
- **US3**: Builds on US2's completed Tasks path and the Analyze drift migration from Foundational.
- **US4**: Builds on US1-US3 because artifact evidence and viewers span all passive steps.
- **US5**: Builds on US1-US3 because hang detection and abort guidance need real passive attempts.
- **US6**: Verifies architecture and visual fidelity across the completed passive-step surface.

### Within Each User Story

- Write the RED test task before the paired GREEN implementation task.
- Keep each GREEN task minimal: only satisfy the immediately preceding failing behavior.
- Re-run the focused test before moving to the next task.
- Do not horizontally batch all factory cases, IPC branches, UI states, or visual screens before proving the preceding tracer bullet is green.

### Parallel Opportunities

- T003 can run in parallel with T001-T002 because it only extends fixtures and boundary scaffolding.
- T039 and T040 can proceed in parallel after User Story 5 because they guard separate architecture and visual surfaces.
- T043 can be split into focused test command batches for factories, IPC, artifact read, markdown, and listeners.

---

## Parallel Example: User Story 1

```bash
# After Foundational phase completes, pick one RED task, make its paired GREEN implementation pass, then move to the next:
Task: "T011 Add failing Plan contract and IPC tests in src/main/domain/factories/plan.factory.test.ts and src/main/ipc/copilotPlan.test.ts"
Task: "T012 Add failing renderer tests in src/renderer/slices/session.test.ts, src/renderer/components/PlanStep.test.tsx, and src/renderer/components/StatusStep.test.tsx"
```

## Parallel Example: User Story 2

```bash
# After T017 establishes the passive Tasks journey, pick one RED task, make its paired GREEN implementation pass, then move to the next:
Task: "T018 Add failing tasks.md parsing and task-detail contract tests in src/main/domain/factories/tasks.factory.test.ts and src/main/ipc/tasksDetail.test.ts"
Task: "T019 Add failing renderer tests for lazy tasks:detail fetch and TaskViewer in src/renderer/api/tasksDetail.endpoint.test.ts and src/renderer/components/TaskViewer.test.tsx"
```

## Parallel Example: User Story 3

```bash
# After User Story 2 is green, pick one RED task, make its paired GREEN implementation pass, then move to the next:
Task: "T024 Add failing Analyze no-diff and remediation contract tests in src/main/ipc/copilotAnalyze.test.ts and src/main/domain/factories/analyze.factory.test.ts"
Task: "T025 Add failing renderer tests for AnalyzeStep, AnalyzeStepContainer, and stepLifecycle.listener in src/renderer/components/AnalyzeStep.test.tsx and src/renderer/listeners/stepLifecycle.listener.test.ts"
```

## Parallel Example: User Story 4

```bash
# After Analyze is in place, pick one RED task, make its paired GREEN implementation pass, then move to the next:
Task: "T029 Add failing plural artifacts:read tests in src/main/ipc/artifacts.test.ts and src/renderer/api/artifacts.endpoint.test.ts"
Task: "T030 Add failing Markdown and ArtifactViewer tests in src/renderer/components/Markdown.test.tsx and src/renderer/components/ArtifactViewer.test.tsx"
```

## Parallel Example: User Story 5

```bash
# After passive attempts are implemented, pick one RED task, make its paired GREEN implementation pass, then move to the next:
Task: "T034 Add failing fake-timer hang-detection tests in src/renderer/listeners/transcriptCapture.listener.test.ts and src/renderer/listeners/stepLifecycle.listener.test.ts"
Task: "T035 Add failing passive Cancel/Restart guidance assertions in e2e/passive-steps-vertical.spec.ts and src/renderer/components/StatusStep.test.tsx"
```

## Parallel Example: User Story 6

```bash
# After User Story 5, pick one RED task, make its paired GREEN implementation pass, then move to the next:
Task: "T039 Add failing architecture guard tests in src/renderer/store.test.ts, src/renderer/slices/session.test.ts, src/main/ipc/passiveStepIpc.test.ts, and package.json"
Task: "T040 Add failing visual-diff coverage in e2e/visual-diff/harness/screens.config.ts, e2e/design-fidelity.spec.ts, and e2e/visual-diff/contracts/*.json"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1.
2. Complete Phase 2.
3. Complete Phase 3.
4. Validate passive Plan independently before expanding scope.

### Incremental Delivery

1. Ship passive Plan with US1.
2. Add passive Tasks and stable task-detail parsing with US2.
3. Add bounded Analyze pass/fail behavior with US3.
4. Add lazy evidence viewing and sanitized markdown with US4.
5. Add soft hang guidance with US5.
6. Lock architecture and visual fidelity with US6.

### Suggested MVP Scope

Only **User Story 1** is required for the first shippable increment. It proves the passive watching vertical exists, validates the shared helper and row model in production flow, and unblocks the later Tasks, Analyze, viewer, hang, and visual contract work.

---

## Format Validation

- All task lines use the required checklist format: `- [ ] T### [P?] [US#?] Description with file path`.
- Setup, Foundational, and Polish tasks intentionally omit story labels.
- Every user story task includes a `[US#]` label and at least one exact file path.
- Tests appear before implementation tasks inside each user story phase to preserve the Run 8 tracer-bullet TDD sequence.

---

## Notes

- The Analyze drift migration is mandatory: `analyze.md` must disappear from manifests, factories, summaries, and required-artifact tests.
- The passive helper remains a closed set for Plan, Tasks, and Analyze only; there is no ninth slice and no Specify/Clarify refactor in Run 8.
- The exact Run 8 visual set is fixed to the 10 screen ids named in User Story 6; do not add an eleventh screen without updating the spec.
