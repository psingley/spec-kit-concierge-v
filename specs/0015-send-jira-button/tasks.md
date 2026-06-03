# Tasks: Send to JIRA from Review

**Input**: `specs/0015-send-jira-button/plan.md`, `specs/0015-send-jira-button/spec.md`, `specs/0015-send-jira-button/research.md`, `specs/0015-send-jira-button/data-model.md`, `specs/0015-send-jira-button/quickstart.md`, and `specs/0015-send-jira-button/contracts/`

**Tests**: Required. The feature spec includes mandatory user-scenario testing and explicit independent tests, so every story includes public-behavior test tasks before implementation. Keep TypeScript strict, validate both IPC boundaries with factory tests, and exercise progress or resume behavior through main, renderer, and modal surfaces.

**Organization**: Tasks are grouped by user story priority so each increment stays independently testable while preserving RTK Query ownership, modal-host reuse, deterministic parent-first orchestration, and create-only v1 scope.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other marked tasks in the same phase because it touches different files and has no dependency on incomplete work.
- **[Story]**: User-story tasks only: `[US1]`, `[US2]`, `[US3]`.
- Every task includes exact file paths.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the planned Jira-submission file surface before behavior work starts.

- [ ] T001 Create Jira submission module and test scaffolds in `src/main/data-layer/jiraSubmission/config.ts`, `src/main/data-layer/jiraSubmission/parser.ts`, `src/main/data-layer/jiraSubmission/preview.ts`, `src/main/data-layer/jiraSubmission/payloads.ts`, `src/main/data-layer/jiraSubmission/records.ts`, `src/main/data-layer/jiraSubmission/runner.ts`, `src/main/data-layer/jiraSubmission/config.test.ts`, `src/main/data-layer/jiraSubmission/parser.test.ts`, `src/main/data-layer/jiraSubmission/preview.test.ts`, `src/main/data-layer/jiraSubmission/payloads.test.ts`, `src/main/data-layer/jiraSubmission/records.test.ts`, and `src/main/data-layer/jiraSubmission/runner.test.ts`
- [ ] T002 [P] Create Jira IPC and renderer API scaffolds in `src/main/ipc/jiraSubmission.ts`, `src/main/ipc/jiraSubmission.factory.ts`, `src/main/ipc/jiraSubmission.factory.spec.ts`, `src/main/ipc/jiraSubmission.test.ts`, `src/renderer/api/jiraSubmission.endpoint.ts`, `src/renderer/api/jiraSubmission.factory.ts`, `src/renderer/api/jiraSubmission.factory.spec.ts`, and `src/renderer/api/jiraSubmission.endpoint.test.ts`
- [ ] T003 [P] Create Jira modal and UI scaffolds in `src/renderer/components/JiraSubmissionPreviewModal.tsx`, `src/renderer/components/JiraSubmissionProgressModal.tsx`, `src/renderer/components/JiraSubmissionPreviewModal.test.tsx`, `src/renderer/components/JiraSubmissionProgressModal.test.tsx`, `src/renderer/slices/jira.ts`, `src/renderer/slices/jira.test.ts`, `src/renderer/slices/ui.ts`, and `src/renderer/slices/ui.selectors.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared prerequisites required by preview, submit, and resume flows.

**⚠️ CRITICAL**: No user story work should start until this phase is complete.

**TDD execution rule**: For each logic-bearing implementation task below, run the co-located test named in the same task first and observe the failing behavior before implementation. The final commit must contain only green tests.

- [ ] T004 [P] Implement pinned Jira config loading and validation in `src/main/data-layer/jiraSubmission/config.ts` with focused coverage in `src/main/data-layer/jiraSubmission/config.test.ts`
- [ ] T005 [P] Implement deterministic `spec.md` plus `tasks.md` hierarchy parsing in `src/main/data-layer/jiraSubmission/parser.ts` with phase and task extraction coverage in `src/main/data-layer/jiraSubmission/parser.test.ts`, running the failing parser tests first
- [ ] T006 [P] Implement canonical summary, required description sections, file-context fallback, thin-body threshold, payload hash, and `<project_key>-idem-<hash12>` label rendering in `src/main/data-layer/jiraSubmission/payloads.ts` with deterministic coverage in `src/main/data-layer/jiraSubmission/payloads.test.ts`, running the failing payload tests first
- [ ] T007 [P] Implement canonical submission-record read and atomic write logic for `specs/0015-send-jira-button/jira-submission-state/` in `src/main/data-layer/jiraSubmission/records.ts` with persistence coverage in `src/main/data-layer/jiraSubmission/records.test.ts`
- [ ] T008 [P] Implement main-side preview and submit boundary factories in `src/main/ipc/jiraSubmission.factory.ts` with six-case floor coverage in `src/main/ipc/jiraSubmission.factory.spec.ts`
- [ ] T009 [P] Implement renderer-side preview, submit, and stream-event factories in `src/renderer/api/jiraSubmission.factory.ts` with six-case floor coverage in `src/renderer/api/jiraSubmission.factory.spec.ts`
- [ ] T010 [P] Implement Jira submission state in `src/renderer/slices/jira.ts`, `src/renderer/slices/jira.test.ts`, `src/renderer/slices/ui.ts`, `src/renderer/slices/ui.selectors.ts`, `src/renderer/slices/ui.test.ts`, and `src/renderer/slices/ui.selectors.test.ts`; keep `ui` limited to modal visibility while `jira` owns `{submitting, dryRunPreview, results, issues, error}`
- [ ] T011 Register dormant Jira channel plumbing in `src/main/index.ts`, `src/preload/index.ts`, `src/renderer/api/baseQuery.ts`, and `src/renderer/api/rootApi.ts` without adding runtime dependencies

**Checkpoint**: Foundation ready — shared parsers, factories, record storage, and bridge wiring are available for story work.

---

## Phase 3: User Story 1 - Preview the Jira hierarchy before creation (Priority: P1) 🎯 MVP

**Goal**: Let an eligible Review-step user open a dry-run modal that shows the exact Epic → Phase Story → Task Subtask hierarchy before any Jira create call is attempted.

**Independent Test**: Open Review for a feature that has both `spec.md` and `tasks.md`, click **Send to JIRA**, and confirm the preview modal shows the full planned hierarchy, parent relationships, and warnings without creating any Jira issue.

### Tests for User Story 1

- [ ] T012 [P] [US1] Add preview builder tests in `src/main/data-layer/jiraSubmission/preview.test.ts` for eligibility gating, parent-first node ordering, the 240-character-or-missing-section thin-body rule, and already-verified warnings
- [ ] T013 [P] [US1] Add preview IPC and renderer query tests in `src/main/ipc/jiraSubmission.test.ts` and `src/renderer/api/jiraSubmission.endpoint.test.ts` for eligible and blocked `jira:preview` flows
- [ ] T014 [P] [US1] Add preview interaction tests in `src/renderer/components/ReviewStepContainer.test.tsx`, `src/renderer/components/ReviewStep.test.tsx`, and `src/renderer/components/JiraSubmissionPreviewModal.test.tsx` for button gating, modal open, and cancel-without-submit behavior

### Implementation for User Story 1

- [ ] T015 [US1] Implement preview assembly in `src/main/data-layer/jiraSubmission/preview.ts` using `src/main/data-layer/jiraSubmission/config.ts`, `src/main/data-layer/jiraSubmission/parser.ts`, `src/main/data-layer/jiraSubmission/payloads.ts`, and `src/main/data-layer/jiraSubmission/records.ts` to emit `JiraSubmissionPreview`
- [ ] T016 [US1] Implement the `jira:preview` handler in `src/main/ipc/jiraSubmission.ts` and register it from `src/main/index.ts` with request and response validation in `src/main/ipc/jiraSubmission.factory.ts`
- [ ] T017 [US1] Implement the preview read path in `src/preload/index.ts`, `src/renderer/api/baseQuery.ts`, `src/renderer/api/rootApi.ts`, `src/renderer/api/jiraSubmission.endpoint.ts`, and `src/renderer/api/jiraSubmission.factory.ts`
- [ ] T018 [US1] Mount preview modal state in `src/renderer/slices/ui.ts`, `src/renderer/slices/ui.selectors.ts`, and `src/renderer/components/ModalHost.tsx` while reusing the shared modal host
- [ ] T019 [US1] Implement `src/renderer/components/JiraSubmissionPreviewModal.tsx` with standard modal semantics, parent relationships, warning rows, and explicit confirm and cancel affordances
- [ ] T020 [US1] Update `src/renderer/components/ReviewStepContainer.tsx` and `src/renderer/components/ReviewStep.tsx` to show **Send to JIRA** only when Atlassian auth is `ok` and `tasks.md` exists, then open the preview modal without starting submission

**Checkpoint**: User Story 1 is independently demoable as a safe dry-run preview gate.

---

## Phase 4: User Story 2 - Create the hierarchy in one guided flow (Priority: P2)

**Goal**: After preview confirmation, create Jira items in deterministic parent-first order, one ACP-backed turn per node, while showing progress, created keys, links, and halt state.

**Independent Test**: Confirm the preview for a feature with multiple phases and tasks, then observe the flow create the Epic, Phase Stories, and Task Subtasks sequentially while showing progress and completed issue keys.

### Tests for User Story 2

- [ ] T021 [P] [US2] Add deterministic runner tests in `src/main/data-layer/jiraSubmission/runner.test.ts` for one customized concierge-jira extension-agent/ACP-backed turn per node, parent-first advancement, disk-truth verification, and halt-on-first-nonadvanceable behavior
- [ ] T022 [P] [US2] Add `jira:submit` handler and Jira-specific event-stream tests in `src/main/ipc/jiraSubmission.test.ts` for ack payloads, per-node progress events, structured audit proof of Bound-CLI-only creation, no direct app-to-Atlassian call path, and exactly one terminal done event
- [ ] T023 [P] [US2] Add renderer submit mutation and progress tests in `src/renderer/api/jiraSubmission.endpoint.test.ts` and `src/renderer/components/JiraSubmissionProgressModal.test.tsx` for progress updates, issue keys, links, and halt rendering
- [ ] T024 [P] [US2] Add guided-flow review tests in `src/renderer/components/ReviewStepContainer.test.tsx` and `src/renderer/components/ReviewStep.test.tsx` for preview confirmation, progress modal launch, visible created or halted results, and absence of any status-sync controls

### Implementation for User Story 2

- [ ] T025 [US2] Implement ACP-backed submission orchestration in `src/main/data-layer/jiraSubmission/runner.ts` using `src/main/data-layer/acp/supervisor.ts` and `src/main/data-layer/jiraSubmission/records.ts` to invoke the customized concierge-jira extension-agent contract once per node, verify disk records after each create turn, and emit structured audit evidence
- [ ] T026 [US2] Implement `jira:submit` ack and Jira-specific event orchestration in `src/main/ipc/jiraSubmission.ts` and register submit streaming from `src/main/index.ts` with validation in `src/main/ipc/jiraSubmission.factory.ts`
- [ ] T027 [US2] Implement the renderer submit mutation and Jira-specific stream subscription in `src/renderer/api/jiraSubmission.endpoint.ts`, `src/renderer/api/jiraSubmission.factory.ts`, and `src/renderer/slices/jira.ts`
- [ ] T028 [US2] Implement `src/renderer/components/JiraSubmissionProgressModal.tsx` and mount it from `src/renderer/components/ModalHost.tsx` to show running, verified, duplicate, failed, halted, and done states
- [ ] T029 [US2] Update `src/renderer/components/ReviewStepContainer.tsx` and `src/renderer/components/ReviewStep.tsx` to confirm the preview, start deterministic submission, and surface created or adopted issue keys, destination links, and remaining work

**Checkpoint**: User Story 2 is independently demoable as a full guided create flow with visible progress and halt behavior.

---

## Phase 5: User Story 3 - Resume safely after interruption or partial failure (Priority: P3)

**Goal**: Rebuild prior submission state from disk, skip already-advanceable nodes, adopt matching duplicates safely, and let the user resume without creating duplicate issues.

**Independent Test**: Interrupt submission after some Jira items are verified, relaunch or rerun the flow, and confirm already-created items are skipped while only the remaining nodes are processed.

### Tests for User Story 3

- [ ] T030 [P] [US3] Add resume and duplicate-adoption runner tests in `src/main/data-layer/jiraSubmission/runner.test.ts` for skipping verified nodes, adopting duplicate matches, and preserving parent keys on rerun
- [ ] T031 [P] [US3] Add persisted-state rehydration tests in `src/main/data-layer/jiraSubmission/records.test.ts` and `src/main/data-layer/jiraSubmission/preview.test.ts` for restart-safe run snapshots rebuilt from `specs/0015-send-jira-button/jira-submission-state/`
- [ ] T032 [P] [US3] Add resume contract tests in `src/main/ipc/jiraSubmission.test.ts` and `src/renderer/api/jiraSubmission.endpoint.test.ts` for `mode: 'resume'`, `remainingNodeIds`, and rerun safety
- [ ] T033 [P] [US3] Add resume UI tests in `src/renderer/components/ReviewStepContainer.test.tsx`, `src/renderer/components/ReviewStep.test.tsx`, `src/renderer/components/JiraSubmissionPreviewModal.test.tsx`, and `src/renderer/components/JiraSubmissionProgressModal.test.tsx` for prior results, resume copy, and rerun CTA behavior

### Implementation for User Story 3

- [ ] T034 [US3] Extend `src/main/data-layer/jiraSubmission/runner.ts` and `src/main/data-layer/jiraSubmission/records.ts` to derive start versus resume mode, skip advanceable verified or duplicate nodes, and adopt matching existing issues by `payloadHash` plus `idempotencyLabel`
- [ ] T035 [US3] Extend `src/main/data-layer/jiraSubmission/preview.ts` and `src/main/ipc/jiraSubmission.ts` to rebuild `JiraSubmissionRunSnapshot`, halted-node state, and remaining node ids from disk on every reopen
- [ ] T036 [US3] Extend `src/renderer/api/jiraSubmission.endpoint.ts`, `src/renderer/components/JiraSubmissionPreviewModal.tsx`, and `src/renderer/components/JiraSubmissionProgressModal.tsx` to show resume mode, prior completed items, and safe rerun messaging
- [ ] T037 [US3] Update `src/renderer/components/ReviewStepContainer.tsx` and `src/renderer/components/ReviewStep.tsx` to expose resume submission from persisted state after relaunch and to show previously created or adopted issue links before rerun

**Checkpoint**: User Story 3 is independently demoable as restart-safe resume without duplicate Jira creation.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finish shared quality, accessibility, and regression proofing across all stories.

- [ ] T038 [P] Harden accessibility and shared modal behavior in `src/renderer/components/JiraSubmissionPreviewModal.tsx`, `src/renderer/components/JiraSubmissionProgressModal.tsx`, `src/renderer/components/ReviewStep.tsx`, `src/renderer/components/ReviewStepContainer.tsx`, `src/renderer/components/ModalHost.tsx`, `src/renderer/slices/ui.ts`, and `src/renderer/slices/ui.selectors.ts`
- [ ] T039 [P] Add final regression edge cases in `src/main/data-layer/jiraSubmission/config.test.ts`, `src/main/data-layer/jiraSubmission/parser.test.ts`, `src/main/data-layer/jiraSubmission/payloads.test.ts`, `src/main/data-layer/jiraSubmission/records.test.ts`, `src/main/data-layer/jiraSubmission/preview.test.ts`, `src/main/data-layer/jiraSubmission/runner.test.ts`, `src/main/ipc/jiraSubmission.factory.spec.ts`, `src/main/ipc/jiraSubmission.test.ts`, `src/renderer/api/jiraSubmission.factory.spec.ts`, `src/renderer/api/jiraSubmission.endpoint.test.ts`, `src/renderer/components/JiraSubmissionPreviewModal.test.tsx`, `src/renderer/components/JiraSubmissionProgressModal.test.tsx`, `src/renderer/components/ReviewStepContainer.test.tsx`, and `src/renderer/components/ReviewStep.test.tsx`; include no-status-sync negative coverage and audit/export assertions
- [ ] T040 Run the quickstart verification from `specs/0015-send-jira-button/quickstart.md` against `src/main/data-layer/jiraSubmission/config.test.ts`, `src/main/data-layer/jiraSubmission/parser.test.ts`, `src/main/data-layer/jiraSubmission/payloads.test.ts`, `src/main/data-layer/jiraSubmission/records.test.ts`, `src/main/data-layer/jiraSubmission/preview.test.ts`, `src/main/data-layer/jiraSubmission/runner.test.ts`, `src/main/ipc/jiraSubmission.factory.spec.ts`, `src/main/ipc/jiraSubmission.test.ts`, `src/renderer/api/jiraSubmission.factory.spec.ts`, `src/renderer/api/jiraSubmission.endpoint.test.ts`, `src/renderer/components/JiraSubmissionPreviewModal.test.tsx`, `src/renderer/components/JiraSubmissionProgressModal.test.tsx`, `src/renderer/components/ReviewStepContainer.test.tsx`, `src/renderer/components/ReviewStep.test.tsx`, and the validation scripts in `package.json`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1: Setup** -> no dependencies
- **Phase 2: Foundational** -> depends on Phase 1 and blocks every story
- **Phase 3: User Story 1** -> depends on Phase 2 and is the MVP
- **Phase 4: User Story 2** -> depends on User Story 1 because submission starts from the confirmed preview surface
- **Phase 5: User Story 3** -> depends on User Story 2 because resume extends the same runner, records, and progress surface
- **Phase 6: Polish** -> depends on all desired stories

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Foundational and delivers the dry-run Review MVP
- **User Story 2 (P2)**: Builds on User Story 1 confirmation and preview data
- **User Story 3 (P3)**: Builds on User Story 2 persistence and progress behavior

### Within Each User Story

- Write the test tasks first and observe failures before implementation
- Land main-process pure modules before IPC handlers
- Land IPC and factory work before preload and RTK Query consumers
- Land modal-host and UI state work before Review integration wiring
- Finish with story-level Review interactions and visible outcomes

### Parallel Opportunities

- Setup: `T002` and `T003`
- Foundational: `T004` through `T010`
- User Story 1 tests: `T012` through `T014`
- User Story 2 tests: `T021` through `T024`
- User Story 3 tests: `T030` through `T033`
- Polish: `T038` and `T039`

## Parallel Example: User Story 1

```bash
# Run preview-domain and contract tests together:
npm run test -- src/main/data-layer/jiraSubmission/preview.test.ts
npm run test -- src/main/ipc/jiraSubmission.test.ts src/renderer/api/jiraSubmission.endpoint.test.ts

# Then split UI verification while preview assembly lands:
npm run test -- src/renderer/components/ReviewStepContainer.test.tsx src/renderer/components/ReviewStep.test.tsx src/renderer/components/JiraSubmissionPreviewModal.test.tsx
```

## Parallel Example: User Story 2

```bash
# Start runner and stream contract failures together:
npm run test -- src/main/data-layer/jiraSubmission/runner.test.ts
npm run test -- src/main/ipc/jiraSubmission.test.ts

# In parallel, exercise renderer progress coverage:
npm run test -- src/renderer/api/jiraSubmission.endpoint.test.ts src/renderer/components/JiraSubmissionProgressModal.test.tsx
```

## Parallel Example: User Story 3

```bash
# Rehydration and resume seams can fail in parallel:
npm run test -- src/main/data-layer/jiraSubmission/records.test.ts src/main/data-layer/jiraSubmission/preview.test.ts
npm run test -- src/main/ipc/jiraSubmission.test.ts src/renderer/api/jiraSubmission.endpoint.test.ts

# Then validate resume UI behavior:
npm run test -- src/renderer/components/ReviewStepContainer.test.tsx src/renderer/components/ReviewStep.test.tsx src/renderer/components/JiraSubmissionPreviewModal.test.tsx src/renderer/components/JiraSubmissionProgressModal.test.tsx
```

## Implementation Strategy

### MVP First (User Story 1 Through Completion)

1. Complete Setup
2. Complete Foundational
3. Complete User Story 1
4. Validate the dry-run preview independently
5. Continue through live creation and resume stories in the same locked implementation lane

### Incremental Delivery

1. Ship the preview safety gate in User Story 1
2. Add deterministic guided creation in User Story 2
3. Add restart-safe resume and duplicate adoption in User Story 3
4. Finish accessibility and regression coverage in Polish

### Parallel Team Strategy

1. One engineer owns main-process parsing, payloads, records, and runner work in `src/main/data-layer/jiraSubmission/`
2. One engineer owns IPC, preload, and RTK Query seams in `src/main/ipc/`, `src/preload/`, and `src/renderer/api/`
3. One engineer owns Review and modal surfaces in `src/renderer/components/` and `src/renderer/slices/`
4. Rejoin after each phase checkpoint to keep contracts and stream shapes aligned

## Notes

- Every task includes exact file paths
- `[P]` marks tasks that can safely proceed in parallel
- `[US#]` appears only in user-story phases
- The task list stays within create-only v1 scope and does not add Jira status sync
