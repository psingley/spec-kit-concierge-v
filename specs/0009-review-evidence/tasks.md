---
feature: Run 9 Review & Evidence Vertical
branch: spec/0009-review-evidence
created: 2026-05-30
source_plan: specs/0009-review-evidence/plan.md
---

# Tasks: Run 9 Review & Evidence Vertical

**Input**: `specs/0009-review-evidence/spec.md`, `specs/0009-review-evidence/plan.md`, `specs/0009-review-evidence/research.md`, `specs/0009-review-evidence/data-model.md`, `specs/0009-review-evidence/quickstart.md`, `specs/0009-review-evidence/contracts/review-evidence-ipc.md`, `specs/0009-review-evidence/contracts/analyze-report-capture.md`, `specs/0009-review-evidence/contracts/visual-contract-fixtures.md`, `docs/adr/0013-review-evidence-aggregation.md`, `docs/adr/0014-analyze-report-capture.md`, `specs/0009-review-evidence/grill.md`, and `specs/0009-review-evidence/fixtures/pre-spec-probes.md`

**Tests**: Required. Run 9 is test-first: write the failing public-behavior test for each slice before the corresponding implementation, keep evidence reads lazy, and preserve the locked disk-truth architecture while going RED -> GREEN per story.

**Organization**: Tasks are grouped by user story so each Review/evidence increment remains independently testable once the shared seams are in place.

**Run 9 locked guards**:
- Keep Review disk/git authoritative; do not use renderer session memory as a Review evidence source.
- Add `review:evidence` in main/preload/RTK Query; do not add `copilot:review`.
- Do not write a Review Step Commit, require `review.md`, or mark Review committed in Run 9.
- Keep Analyze report capture app-owned under `userData/evidence/{featureKey}/{sessionId}/analyze-report.md` with a feature/Analyze-commit index; do not create `analyze.md`.
- Keep Plan optional artifacts additive for `data-model.md`, `quickstart.md`, and `contracts/*`.
- Use 40 minutes of ACP stream silence for the passive notice; active stream events reset the timer.
- Keep Review interactive while completed non-Review steps become view-only for mutation.
- Do not add a ninth Redux slice or any runtime dependency.
- Split Review implementation from the passive visual-harness retrofit so FIX-D never blocks Review delivery.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the Run 9 vertical test harness and feature fixtures before shared trust-boundary work starts.

- [ ] T001 Create the failing Run 9 vertical journey scaffold in `e2e/review-evidence-vertical.spec.ts` and `e2e/support/boundaries.ts`
- [ ] T002 [P] Add Review evidence, Analyze report, optional Plan artifact, and read-failure fixtures in `specs/0009-review-evidence/fixtures/review-evidence-summary.json`, `specs/0009-review-evidence/fixtures/analyze-report.md`, `specs/0009-review-evidence/fixtures/tasks-sample.md`, and `specs/0009-review-evidence/fixtures/plan-optional-artifacts/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Land the shared manifest, IPC, factory, and app-owned evidence seams that every story depends on.

**⚠️ CRITICAL**: No user story work starts until this phase is complete.

- [ ] T003 Add failing guard tests for no-Review-commit semantics, no `copilot:review` agent/IPC invocation path, and optional Plan artifact discovery in `src/main/domain/factories/review.factory.test.ts`, `src/main/domain/factories/plan.factory.test.ts`, `src/main/hooks/manifest.test.ts`, and `src/main/data-layer/agents/manifest.factory.spec.ts`
- [ ] T004 Implement the locked Review/Plan manifest rules in `src/main/domain/factories/review.factory.ts`, `src/main/domain/factories/plan.factory.ts`, and `src/main/hooks/manifest.ts`
- [ ] T005 Add failing typed boundary tests for `review:evidence` summary/body requests in `src/main/ipc/reviewEvidence.test.ts`, `src/main/ipc/reviewEvidence.factory.spec.ts`, `src/preload/index.test.ts`, `src/renderer/api/reviewEvidence.endpoint.test.ts`, and `src/renderer/api/reviewEvidence.factory.spec.ts`
- [ ] T006 Implement the shared `review:evidence` main/preload/renderer seam in `src/main/ipc/reviewEvidence.ts`, `src/main/ipc/reviewEvidence.factory.ts`, `src/main/index.ts`, `src/preload/index.ts`, `src/renderer/api/reviewEvidence.endpoint.ts`, `src/renderer/api/reviewEvidence.factory.ts`, and `src/renderer/api/index.ts`
- [ ] T007 [P] Add failing app-owned Analyze report helper, report-index, and terminal-Markdown extraction tests in `src/main/data-layer/evidence/analyzeReport.test.ts`, `src/main/data-layer/evidence/analyzeReportIndex.test.ts`, and `src/main/ipc/passiveStepIpc.test.ts`
- [ ] T008 Implement the shared app-owned Analyze report helper and feature/Analyze-commit index in `src/main/data-layer/evidence/analyzeReport.ts`, `src/main/data-layer/evidence/analyzeReportIndex.ts`, and `src/main/ipc/passiveStepIpc.ts`

**Checkpoint**: Review no longer implies a Step Commit, Plan optional artifacts have a shared manifest path, `review:evidence` is registered end-to-end, and app-owned Analyze evidence has a typed storage seam.

---

## Phase 3: User Story 1 - Review trusted step evidence (Priority: P1) 🎯 MVP

**Goal**: Let developers open Review and trust restart-proof step proof, artifact metadata, warnings, and lazy evidence body reads without relying on renderer memory.

**Independent Test**: With a feature directory containing committed `Concierge-Step:` trailers and required artifacts, opening Review before and after restart shows the same completed steps and artifact metadata, and body text appears only after selecting an evidence item.

### Tests for User Story 1

- [ ] T009 [US1] Add failing disk-backed aggregation tests for step proof, required artifact metadata, restart-stable summary output, and lazy body guards in `src/main/domain/reviewEvidence.test.ts` and `src/main/ipc/reviewEvidence.test.ts`
- [ ] T010 [US1] Add failing renderer tests for Review summary loading, warning visibility, and on-demand body fetch in `src/renderer/api/reviewEvidence.endpoint.test.ts`, `src/renderer/components/ReviewStep.test.tsx`, `src/renderer/components/ReviewStepContainer.test.tsx`, and `src/renderer/components/WorkspaceContainer.test.tsx`

### Implementation for User Story 1

- [ ] T011 [US1] Implement disk/git Review aggregation and selected-body reads in `src/main/domain/reviewEvidence.ts`, `src/main/data-layer/git/gitCommand.ts`, and `src/main/ipc/reviewEvidence.ts`
- [ ] T012 [US1] Implement RTK Query wiring and the Review smart/dumb surface in `src/renderer/api/reviewEvidence.endpoint.ts`, `src/renderer/components/ReviewStepContainer.tsx`, `src/renderer/components/ReviewStep.tsx`, and `src/renderer/components/WorkspaceContainer.tsx`
- [ ] T013 [US1] Make the restart-proof Review evidence MVP pass end-to-end in `e2e/review-evidence-vertical.spec.ts` and `e2e/support/boundaries.ts`

**Checkpoint**: User Story 1 delivers the terminal Review MVP with trusted proof, metadata-first evidence, and lazy body reads.

---

## Phase 4: User Story 2 - Inspect clarifications, plan outputs, analyze evidence, and tasks (Priority: P1)

**Goal**: Extend Review so developers can inspect committed clarifications, optional Plan outputs, app-owned Analyze evidence, and per-task details without leaving the app.

**Independent Test**: With Clarifications in committed `spec.md`, optional Plan outputs on disk, an empty-pass Analyze trailer plus app-owned report, and generated tasks, Review shows each evidence type with correct required/optional status and opens task details in a modal.

### Tests for User Story 2

- [ ] T014 [US2] Add failing main aggregation tests for committed clarifications, optional Plan discovery, Analyze report metadata, and task metadata reuse in `src/main/domain/reviewEvidence.test.ts`, `src/main/hooks/manifest.test.ts`, and `src/main/ipc/reviewEvidence.test.ts`
- [ ] T015 [US2] Add failing Analyze capture and Review task-detail tests in `src/main/ipc/copilotAnalyze.test.ts`, `src/main/ipc/passiveStepIpc.test.ts`, `src/renderer/components/ReviewStep.test.tsx`, `src/renderer/components/ReviewTaskModal.test.tsx`, and `src/renderer/components/TaskViewer.test.tsx`

### Implementation for User Story 2

- [ ] T016 [US2] Implement committed-clarification parsing and optional Plan discovery in `src/main/domain/reviewEvidence.ts`, `src/main/hooks/manifest.ts`, and `src/main/ipc/passiveStepIpc.ts`
- [ ] T017 [US2] Implement deterministic app-owned Analyze report capture from ACP terminal/transcript data, including final assistant-message extraction rules and feature/Analyze-commit index updates, in `src/main/ipc/copilotPassiveAgent.ts`, `src/main/data-layer/acp/supervisor.ts`, `src/main/data-layer/acp/types.ts`, `src/main/data-layer/evidence/analyzeReport.ts`, `src/main/data-layer/evidence/analyzeReportIndex.ts`, and `src/main/ipc/passiveStepIpc.ts`
- [ ] T018 [US2] Implement Analyze evidence, task list, and per-task modal rendering in `src/renderer/components/ReviewStep.tsx`, `src/renderer/components/ReviewTaskModal.tsx`, `src/renderer/components/TaskViewer.tsx`, and `src/renderer/components/ReviewStepContainer.tsx`
- [ ] T019 [US2] Make clarifications, optional Plan evidence, Analyze no-diff evidence, and Review task-modal flows pass end-to-end in `e2e/review-evidence-vertical.spec.ts` and `e2e/support/boundaries.ts`

**Checkpoint**: User Story 2 makes Review the single inspection surface for clarifications, optional Plan outputs, Analyze evidence, and task detail.

---

## Phase 5: User Story 3 - Navigate completed and pending work safely (Priority: P2)

**Goal**: Keep completed non-Review steps view-only for mutation while preserving inspection actions and a deterministic `Resume {pending}` bounce target.

**Independent Test**: In completed, running, and single-pending fixture states, the workspace dims completed mutable surfaces, keeps Review interactive, and routes Resume to the running step first or else the first incomplete canonical step.

### Tests for User Story 3

- [ ] T020 [US3] Add failing read-only and resume-target tests for completed non-Review steps, Review interactivity, and no multi-pending warning copy in `src/renderer/components/WorkspaceContainer.test.tsx`, `src/renderer/components/Stepper.test.tsx`, `src/renderer/slices/steps.test.ts`, and `src/renderer/slices/session.test.ts`

### Implementation for User Story 3

- [ ] T021 [US3] Implement deterministic Review availability and read-only dim treatment in `src/renderer/components/WorkspaceContainer.tsx`, `src/renderer/components/PassiveStep.tsx`, `src/renderer/components/StatusStep.tsx`, and `src/renderer/components/ReviewStep.tsx`
- [ ] T022 [US3] Implement `Resume {pending}` targeting from running-step-first to first-incomplete fallback in `src/renderer/components/WorkspaceContainer.tsx`, `src/renderer/components/Stepper.tsx`, `src/renderer/slices/steps.ts`, and `src/renderer/slices/session.selectors.ts`
- [ ] T023 [US3] Make read-only bounce and resume-target behavior pass end-to-end in `e2e/review-evidence-vertical.spec.ts` and `e2e/support/boundaries.ts`

**Checkpoint**: User Story 3 makes navigation deterministic and safe without inventing extra Review warnings or disabling evidence inspection.

---

## Phase 6: User Story 4 - Distinguish long-running activity from silence (Priority: P2)

**Goal**: Show a passive no-recent-output notice only after 40 minutes of ACP stream silence and reset the timer on real stream activity.

**Independent Test**: A passive step that keeps streaming past 40 minutes shows no warning, while a step with 40 minutes of silence shows the still-working/no-recent-output notice without auto-fail, auto-cancel, or auto-retry behavior.

### Tests for User Story 4

- [ ] T024 [US4] Add failing stream-silence tests for the 40-minute threshold, fine-grained activity reset, and updated copy in `src/main/ipc/passiveStepIpc.test.ts`, `src/renderer/listeners/transcriptCapture.listener.test.ts`, `src/renderer/listeners/acpStreamSubscription.listener.test.ts`, and `src/renderer/components/PassiveStep.test.tsx`

### Implementation for User Story 4

- [ ] T025 [US4] Implement fine-grained passive ACP event forwarding for stream-activity resets in `src/main/ipc/passiveStepIpc.ts`, `src/main/data-layer/acp/supervisor.ts`, `src/main/ipc/stepStreamEvent.factory.ts`, and `src/renderer/api/copilotPassive.endpoint.ts`
- [ ] T026 [US4] Implement the 40-minute silence notice and copy updates in `src/renderer/listeners/transcriptCapture.listener.ts`, `src/renderer/components/PassiveStep.tsx`, `src/renderer/components/StatusStep.tsx`, and `src/renderer/slices/activity.ts`
- [ ] T027 [US4] Make the passive silence behavior pass end-to-end in `e2e/review-evidence-vertical.spec.ts` and `e2e/support/boundaries.ts`

**Checkpoint**: User Story 4 makes long-running passive status trustworthy without conflating runtime duration with a hang.

---

## Phase 7: User Story 5 - Trust visual contracts for Review and passive states (Priority: P3)

**Goal**: Add honest Review visual contracts and then retrofit passive contracts through the shipped component path without blocking Review delivery on the passive harness work.

**Independent Test**: Review fixtures render through the real Review surface for unavailable, partial, populated, read-only, resume-target, selected-evidence, read-failure, and task-modal states; passive fixtures render through shipped `PassiveStepContainer`/`PassiveStep`/`StatusStep` paths for idle, running, done, and artifact-modal states.

### Tests for User Story 5

- [ ] T028 [US5] Add failing Review visual-contract coverage in `e2e/visual-diff/harness/screens.config.ts`, `e2e/design-fidelity.spec.ts`, `e2e/visual-diff/contracts/review-unavailable.contract.json`, `e2e/visual-diff/contracts/review-partial-evidence.contract.json`, `e2e/visual-diff/contracts/review-populated.contract.json`, `e2e/visual-diff/contracts/review-readonly-bounce.contract.json`, `e2e/visual-diff/contracts/review-resume-target.contract.json`, `e2e/visual-diff/contracts/review-selected-evidence.contract.json`, `e2e/visual-diff/contracts/review-evidence-read-failure.contract.json`, and `e2e/visual-diff/contracts/review-task-modal.contract.json`
- [ ] T029 [P] [US5] Add failing passive real-component visual coverage in `e2e/visual-diff/harness/screens.config.ts`, `e2e/design-fidelity.spec.ts`, `e2e/visual-diff/contracts/plan-passive-idle.contract.json`, `e2e/visual-diff/contracts/plan-passive-running.contract.json`, `e2e/visual-diff/contracts/plan-passive-done.contract.json`, `e2e/visual-diff/contracts/tasks-passive-idle.contract.json`, `e2e/visual-diff/contracts/tasks-passive-running.contract.json`, `e2e/visual-diff/contracts/tasks-passive-done.contract.json`, `e2e/visual-diff/contracts/analyze-passive-idle.contract.json`, `e2e/visual-diff/contracts/analyze-passive-running.contract.json`, `e2e/visual-diff/contracts/analyze-passive-done.contract.json`, and `e2e/visual-diff/contracts/passive-artifact-modal.contract.json`

### Implementation for User Story 5

- [ ] T030 [US5] Implement Review visual fixture drivers through the real Review surface in `e2e/visual-diff/harness/screens.config.ts`, `src/renderer/components/ReviewStepContainer.tsx`, `src/renderer/components/ReviewStep.tsx`, and `e2e/visual-diff/contracts/review-*.contract.json`
- [ ] T031 [P] [US5] Retrofit passive fixtures to the shipped `PassiveStepContainer`/`PassiveStep`/`StatusStep` path in `e2e/visual-diff/harness/screens.config.ts`, `src/renderer/components/PassiveStepContainer.tsx`, `src/renderer/components/PassiveStep.tsx`, `src/renderer/components/StatusStep.tsx`, and `e2e/visual-diff/contracts/plan-passive-*.contract.json`, `e2e/visual-diff/contracts/tasks-passive-*.contract.json`, `e2e/visual-diff/contracts/analyze-passive-*.contract.json`, and `e2e/visual-diff/contracts/passive-artifact-modal.contract.json`
- [ ] T032 [US5] Implement shipped StatusStep assertions for counts, tags, evidence subtitles, and artifact action state after the passive real-path retrofit in `src/renderer/components/StatusStep.tsx`, `src/renderer/components/StatusStep.test.tsx`, `e2e/design-fidelity.spec.ts`, and `e2e/visual-diff/contracts/*.contract.json`
- [ ] T033 [US5] Run and stabilize the targeted Review/passive visual loop in `e2e/visual-diff/harness/screens.config.ts` and `e2e/design-fidelity.spec.ts`

**Checkpoint**: User Story 5 locks Review visual confidence first, then finishes the passive real-path retrofit as an explicit late slice.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Re-run the prescribed verification loop and close the remaining architecture/contract regressions after every story lands.

- [ ] T034 [P] Run the focused Run 9 verification loop from `specs/0009-review-evidence/quickstart.md` against `src/main/domain/reviewEvidence.test.ts`, `src/main/ipc/reviewEvidence.test.ts`, `src/main/ipc/passiveStepIpc.test.ts`, `src/renderer/components/ReviewStep.test.tsx`, `src/renderer/components/ReviewTaskModal.test.tsx`, `src/renderer/listeners/transcriptCapture.listener.test.ts`, and `e2e/review-evidence-vertical.spec.ts`
- [ ] T035 Run the full Run 9 validation commands from `specs/0009-review-evidence/quickstart.md` and explicitly verify `.specify/feature.json` points to `specs/0009-review-evidence`, runtime dependency count is unchanged in `package.json`, and renderer slice inventory has no ninth slice in `src/renderer/slices/`, `e2e/design-fidelity.spec.ts`, and `e2e/visual-diff/harness/screens.config.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1: Setup** -> no dependencies.
- **Phase 2: Foundational** -> depends on Phase 1 and blocks every user story.
- **Phase 3: User Story 1** -> depends on Phase 2 and is the MVP.
- **Phase 4: User Story 2** -> depends on User Story 1 because Review’s richer evidence rows extend the summary/body seam.
- **Phase 5: User Story 3** -> depends on User Story 1 and can reuse User Story 2 data, but it must preserve Review interactivity.
- **Phase 6: User Story 4** -> depends on Phase 2 and can proceed after User Story 1 once passive activity events are available.
- **Phase 7: User Story 5** -> depends on User Stories 1-4 for real Review/passive states; Review visual coverage (`T028`, `T030`) should land before the passive retrofit (`T029`, `T031`, `T032`) so FIX-D never blocks Review.
- **Phase 8: Polish** -> depends on all user stories.

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Foundational and delivers the Review MVP.
- **User Story 2 (P1)**: Extends User Story 1 with clarifications, optional Plan evidence, Analyze capture, and task detail.
- **User Story 3 (P2)**: Can start after User Story 1; it must preserve the Review UI from User Story 1 while adding read-only navigation rules.
- **User Story 4 (P2)**: Can start after Foundational and integrate with passive flows independently of User Story 2.
- **User Story 5 (P3)**: Starts after the shipped Review/passive states exist; Review visual tasks can complete before the passive harness retrofit.

### Within Each User Story

- Write the failing test tasks before the implementation tasks they cover.
- Land main/preload/API trust-boundary work before renderer/container wiring that consumes it.
- Keep app-owned Analyze report capture in main before Review or passive UI renders the evidence.
- Stabilize the end-to-end/visual task at the end of each story after the targeted unit/component coverage is green.

### Parallel Opportunities

- `T002` can run while `T001` scaffolds the vertical test entry point.
- `T007` can run in parallel with `T005` once the feature fixtures are in place.
- In User Story 5, `T029` and `T031` can proceed after Review visual work starts because the passive retrofit is intentionally separate from Review delivery; `T032` follows `T031` because its assertions touch the same StatusStep and visual-contract files.
- `T034` can be split across main, renderer, and e2e owners before `T035` runs the full validation pass.

## Parallel Example: User Story 2

```bash
# Start the failing evidence-domain and UI tests together:
npm run test -- src/main/domain/reviewEvidence.test.ts src/main/ipc/reviewEvidence.test.ts
npm run test -- src/renderer/components/ReviewStep.test.tsx src/renderer/components/ReviewTaskModal.test.tsx

# After the tests fail, implementation can split by seam:
npm run test -- src/main/ipc/passiveStepIpc.test.ts src/main/ipc/copilotAnalyze.test.ts
npm run e2e -- e2e/review-evidence-vertical.spec.ts
```

## Parallel Example: User Story 5

```bash
# Review visual contracts first:
npm run vd:capture -- review-unavailable review-populated review-readonly-bounce review-task-modal

# Passive retrofit can run independently afterward:
npm run vd:capture -- plan-passive-idle plan-passive-running plan-passive-done tasks-passive-running analyze-passive-done passive-artifact-modal
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Finish Phase 1 and Phase 2.
2. Complete User Story 1 to prove the disk-backed `review:evidence` seam, lazy body reads, and Review container wiring.
3. Stop and validate Review restart-proof evidence before broadening the surface.

### Incremental Delivery

1. Deliver User Story 1 as the Review MVP.
2. Add User Story 2 to close the clarifications/optional Plan/Analyze/task evidence gaps.
3. Add User Story 3 for safe navigation and Resume targeting.
4. Add User Story 4 for trustworthy passive silence semantics.
5. Finish User Story 5 by landing Review visual coverage first and the passive FIX-D retrofit second.

### Parallel Team Strategy

1. Team A: main-process evidence aggregation and Analyze report capture (`T003`-`T019`).
2. Team B: renderer Review, navigation, and passive silence UI (`T010`-`T027`).
3. Team C: visual contracts and passive harness retrofit (`T028`-`T035`).

## Notes

- Every task follows the required checklist format and includes concrete file paths.
- Review implementation is intentionally separated from the passive visual retrofit so the Run 9 Review slice can ship before FIX-D finishes.
- No task introduces new runtime dependencies, a new Redux slice, a `copilot:review` agent path, or Review commit semantics.
