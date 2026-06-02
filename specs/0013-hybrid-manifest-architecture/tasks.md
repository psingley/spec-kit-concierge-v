# Tasks: Hybrid Manifest Architecture

**Input**: `specs/0013-hybrid-manifest-architecture/plan.md`, `specs/0013-hybrid-manifest-architecture/spec.md`, `specs/0013-hybrid-manifest-architecture/research.md`, `specs/0013-hybrid-manifest-architecture/data-model.md`, `specs/0013-hybrid-manifest-architecture/contracts/`, and `specs/0013-hybrid-manifest-architecture/quickstart.md`.

**Tests**: Required. The feature spec includes mandatory user-scenario testing and measurable outcomes; implementation must use vertical TDD tracer bullets: one RED test task, one minimal GREEN implementation task, then repeat. Tests exercise public interfaces and may mock only system boundaries: filesystem, git/process commands, Electron IPC, preload bridge, child process, time, and logger creation through `createMainLogger`.

**Scope guard**: Implement only Run 13 Hybrid Manifest Architecture. Do not add runtime dependencies. Do not make the doctor, renderer, transcript classifier, or agent prose authoritative. Deterministic app code remains the only writer of `.concierge/session-manifest.json`, step commits/trailers, failed markers, guarded mutations, and completion status.

**FR-030 build order**: Execute milestones in this exact order and do not start a later milestone until the prior milestone is complete: (1) `sessionManifestStore`; (2) `stepContracts` hardening; (3) branch-history `commitStep` idempotency; (4) `sessionReconciler`; (5) dirty-diff gates plus failed markers; (6) guarded `relocateArtifact`; (7) watchdog/transcript classifier; (8) bounded 12-tool doctor harness; (9) doctor agent instructions; (10) facilitator integration; (11) nudge button plus `reconcileBranchToIntendedShape`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other marked tasks in the same phase because it touches different files and has no dependency on incomplete tasks.
- **[Story]**: User-story phase tasks only: `[US1]`, `[US2]`, `[US3]`, or `[US4]`.
- Every task includes exact file paths.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Lock architecture exceptions, fixtures, and test surfaces before source work begins.

- [ ] T001 Create ADR for the FR-009/FR-010 print-mode exception and ACP step-execution retirement in `docs/adr/0017-hybrid-manifest-print-mode.md`
- [ ] T002 [P] Create session manifest v1 fixture set for valid, incomplete, invalid-shape, and unknown-schema manifests in `tests/fixtures/hybrid-manifest/session-manifest.v1.json`
- [ ] T003 [P] Create branch trailer history fixture set covering duplicate, out-of-order, and matching artifact-snapshot trailers in `tests/fixtures/hybrid-manifest/branch-trailers.txt`
- [ ] T004 [P] Create transcript and print-mode terminal-event fixture set covering success, failure, missing JSON, invalid JSON, killed, interrupted, and watchdog-silence cases in `tests/fixtures/hybrid-manifest/terminal-events.jsonl`
- [ ] T005 [P] Create nudge and doctor scenario fixture set covering misplaced artifacts, unrelated edits, exhausted doctor attempts, and terminal-stuck sessions in `tests/fixtures/hybrid-manifest/recovery-scenarios.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared typed vocabulary and trust-boundary utilities required by all stories.

**Critical**: No user story work can begin until this phase is complete.

- [ ] T006 Create canonical Run 13 step, status, anomaly, intervention, doctor-tool, and nudge result types in `src/main/domain/manifest/types.ts`
- [ ] T007 Create strict factory helper primitives for unknown-key rejection, non-empty strings, ISO timestamps, canonical steps, and typed named errors in `src/main/domain/manifest/factoryUtils.ts`
- [ ] T008 [P] Create renderer-facing manifest API shared types without Electron or Node imports in `src/renderer/api/sessionManifest.types.ts`
- [ ] T009 [P] Create main IPC channel constants for manifest read, reconcile, doctor status, and nudge requests in `src/main/ipc/sessionManifest.channels.ts`
- [ ] T010 [P] Export Run 13 feature flags and no-runtime-dependency guidance for tests in `src/main/domain/manifest/run13Policy.ts`

**Checkpoint**: Foundation ready. Begin FR-030 milestone 1.

---

## Phase 3: User Story 1 - Deterministic Step Completion (Priority: P1) - MVP

**Goal**: Passed steps are shown only when manifest attempts, branch completion evidence, required artifacts, and dirty-diff gates agree.

**Independent Test**: Run a single step through completion and confirm `.concierge/session-manifest.json`, branch `Concierge-Step:` trailer history, step-owned artifact snapshots, failed markers, and UI-derived status all resolve to the same terminal outcome.

### Tests for User Story 1

- [ ] T011 [US1] Add RED session manifest factory floor tests for happy path, empty object, null, undefined, hostile status, incomplete plausible input, and extra-key rejection in `src/main/domain/manifest/sessionManifest.factory.test.ts`
- [ ] T012 [US1] Implement session manifest factories and typed schema v1 parsing in `src/main/domain/manifest/sessionManifest.factory.ts`
- [ ] T013 [US1] Add RED append-only attempt reducer tests for `pending -> running -> pass|failed|killed|interrupted`, supersession links, terminal immutability, and audit record redaction in `src/main/domain/manifest/sessionManifestReducer.test.ts`
- [ ] T014 [US1] Implement append-only attempt reducers, anomaly reducers, intervention reducers, and audit redaction in `src/main/domain/manifest/sessionManifestReducer.ts`
- [ ] T015 [US1] Add RED atomic read/write tests for temp-file write, file fsync, rename, directory fsync when supported, short-write rejection, and visible parse errors in `src/main/data-layer/manifest/sessionManifestStore.test.ts`
- [ ] T016 [US1] Implement `sessionManifestStore` atomic read/write, create/load, append attempt, append anomaly, append intervention, and audit APIs in `src/main/data-layer/manifest/sessionManifestStore.ts`
- [ ] T017 [US1] Add RED manifest logging tests for `session-manifest-read`, `session-manifest-write`, `manifest-anomaly-recorded`, and `manifest-intervention-recorded` events in `src/main/data-layer/manifest/sessionManifestStore.logging.test.ts`
- [ ] T018 [US1] Implement structured manifest logging through `createMainLogger` in `src/main/data-layer/manifest/sessionManifestStore.ts`

### Implementation for User Story 1

- [ ] T019 [US1] Add RED step contract ownership tests for required artifacts, optional artifacts, context-file exceptions, and step-owned path sets for specify, clarify, plan, tasks, analyze, and review in `src/main/hooks/manifest.test.ts`
- [ ] T020 [US1] Harden `STEP_ARTIFACT_MANIFEST` with step-owned path sets and context-file exceptions in `src/main/hooks/manifest.ts`
- [ ] T021 [US1] Add RED artifact snapshot factory tests for path scope validation, missing required artifact blocking, optional artifact evidence, stable `snapshotHash`, and content metadata hashing in `src/main/domain/factories/artifactSnapshot.factory.test.ts`
- [ ] T022 [US1] Implement step-owned artifact snapshot factories and hashing in `src/main/domain/factories/artifactSnapshot.factory.ts`
- [ ] T023 [US1] Add RED step-start snapshot tests proving before hooks capture branch state and owned-path snapshots before any step agent execution in `src/main/hooks/hookHelpers.test.ts`
- [ ] T024 [US1] Wire step-start owned-path snapshot capture into before-hook helpers in `src/main/hooks/hookHelpers.ts`
- [ ] T025 [US1] Add RED branch-history completion evidence tests for matching artifact snapshot adoption, duplicate trailer avoidance, out-of-order valid commit adoption, and trailer/content mismatch rejection in `src/main/data-layer/git/stepCompletionHistory.test.ts`
- [ ] T026 [US1] Implement branch-history completion evidence search through the existing git command path in `src/main/data-layer/git/stepCompletionHistory.ts`
- [ ] T027 [US1] Add RED `commitWithTrailer` idempotency tests requiring artifact-snapshot comparison before new commit creation and exactly one `Concierge-Step: <step>:pass` trailer in `src/main/data-layer/git/gitCommand.commit.test.ts`
- [ ] T028 [US1] Replace head-only `commitWithTrailer` idempotency with branch-history artifact-snapshot adoption in `src/main/data-layer/git/gitCommand.ts`
- [ ] T029 [US1] Add RED `sessionReconciler` completion-gate tests for pass, missing artifact, stale manifest attempt, missing trailer, mismatched snapshot, unresolved blocking anomaly, and failed marker inputs in `src/main/domain/reconciliation/sessionReconciler.test.ts`
- [ ] T030 [US1] Implement pure `sessionReconciler` completion, pending, running, failed, killed, interrupted, and terminal-stuck decisions in `src/main/domain/reconciliation/sessionReconciler.ts`
- [ ] T031 [US1] Add RED pre-commit and post-commit reconciliation integration tests around after-hook commit writes in `src/main/hooks/hookHelpers.test.ts`
- [ ] T032 [US1] Route after-hook completion through pre-commit and post-commit reconciliation in `src/main/hooks/hookHelpers.ts`
- [ ] T033 [US1] Add RED resume reconstruction tests proving branch sessions derive progress from manifest, trailers, artifacts, and failed markers instead of renderer memory in `src/main/data-layer/git/branchSessions.test.ts`
- [ ] T034 [US1] Integrate manifest-backed reconciliation into branch session reconstruction in `src/main/data-layer/git/branchSessions.ts`

**Checkpoint**: MVP complete when User Story 1 independently proves no step can pass unless manifest, branch, artifact, and failure evidence agree.

---

## Phase 4: User Story 2 - Recover From Agent Irregularities Safely (Priority: P2)

**Goal**: Known safe irregularities are remediated by deterministic guarded code, while unsafe or ambiguous diffs block completion and preserve recovery evidence.

**Independent Test**: Introduce misplaced artifacts, unrelated edits, duplicate completion commits, interrupted runs, and stranded artifacts; confirm safe cases are remediated, unsafe cases are escalated, and no case falsely marks completion.

### Tests for User Story 2

- [ ] T035 [US2] Add RED dirty-diff gate tests for `owned-safe`, `owned-mismatched`, `unrelated`, `ambiguous`, and `unsafe` classifications in `src/main/domain/reconciliation/dirtyDiffGates.test.ts`
- [ ] T036 [US2] Implement deterministic dirty-diff gate classification from step-start snapshots and current git facts in `src/main/domain/reconciliation/dirtyDiffGates.ts`
- [ ] T037 [US2] Add RED failed marker factory tests for backward-compatible fields plus `strandedArtifacts` and `anomalyIds` strict validation in `src/main/data-layer/failedSteps.test.ts`
- [ ] T038 [US2] Extend failed marker read/write helpers with stranded-artifact details and invalid-marker warnings in `src/main/data-layer/failedSteps.ts`
- [ ] T039 [US2] Add RED passive completion-blocking tests for unrelated, ambiguous, unsafe, and owned-mismatched dirty diffs in `src/main/ipc/passiveStepIpc.test.ts`
- [ ] T040 [US2] Block passive step completion on unsafe dirty-diff classifications and write failed markers with stranded artifacts in `src/main/ipc/passiveStepIpc.ts`
- [ ] T041 [US2] Add RED hook completion-blocking tests for dirty-diff gates and failed-marker persistence in `src/main/hooks/hookHelpers.test.ts`
- [ ] T042 [US2] Apply dirty-diff gates and failed-marker writes to after-hook completion in `src/main/hooks/hookHelpers.ts`
- [ ] T043 [US2] Add RED guarded relocation request factory tests for anomaly id, source ownership, destination ownership, ambiguity rejection, extra-key rejection, and idempotency key validation in `src/main/domain/recovery/relocateArtifact.factory.test.ts`
- [ ] T044 [US2] Implement guarded relocation request and result factories in `src/main/domain/recovery/relocateArtifact.factory.ts`
- [ ] T045 [US2] Add RED `relocateArtifact` data-layer tests for re-reading disk truth, rejecting ambiguous destinations, moving only step-owned files, auditing before return, and idempotent no-op by anomaly id in `src/main/data-layer/recovery/relocateArtifact.test.ts`
- [ ] T046 [US2] Implement guarded `relocateArtifact` filesystem mutation and audit append flow in `src/main/data-layer/recovery/relocateArtifact.ts`
- [ ] T047 [US2] Add RED watchdog and transcript classifier tests for silence, missing terminal output, invalid JSON output, unexpected child exit, killed, interrupted, and transcript irregularity anomalies in `src/main/domain/reconciliation/transcriptClassifier.test.ts`
- [ ] T048 [US2] Implement authority-free watchdog and transcript anomaly classifier in `src/main/domain/reconciliation/transcriptClassifier.ts`
- [ ] T049 [US2] Add RED passive step classifier integration tests proving classifier anomalies cannot mark completion, write trailers, cancel steps, or invoke doctor tools directly in `src/main/ipc/passiveStepIpc.test.ts`
- [ ] T050 [US2] Record classifier anomalies through manifest append APIs without completion authority in `src/main/ipc/passiveStepIpc.ts`

### Implementation for User Story 2

- [ ] T051 [US2] Add RED regression tests preserving graceful failed-step resume with stranded artifacts in `src/main/data-layer/git/branchSessions.test.ts`
- [ ] T052 [US2] Preserve graceful failed-step resume while surfacing stranded artifact detail in `src/main/data-layer/git/branchSessions.ts`

**Checkpoint**: User Story 2 works when deterministic recovery fixes only known safe cases and all unsafe or ambiguous cases produce durable failed markers and unresolved anomalies.

---

## Phase 5: User Story 3 - Bounded LLM Doctor For Ambiguous Anomalies (Priority: P3)

**Goal**: The doctor can read evidence and request only approved guarded actions while deterministic code remains the sole authority.

**Independent Test**: Present ambiguous anomaly evidence to the doctor harness and verify exactly 12 tools, two attempts per step, guarded mutation preconditions, audit records, and reconciliation after every mutation.

### Tests for User Story 3

- [ ] T053 [US3] Add RED doctor tool catalog factory tests proving exactly six read-only tools and exactly six guarded tools from FR-020/FR-021 are accepted and every other tool is rejected in `src/main/domain/doctor/doctorTools.factory.test.ts`
- [ ] T054 [US3] Implement doctor tool catalog factories and rejection reasons in `src/main/domain/doctor/doctorTools.factory.ts`
- [ ] T055 [US3] Add RED read-only doctor tool tests for bounded outputs from `readFeatureJson`, `readManifest`, `gitStatusDiff`, `readTrailers`, `readArtifacts`, and `readTranscript` in `src/main/data-layer/doctor/readOnlyTools.test.ts`
- [ ] T056 [US3] Implement read-only doctor tools without exposing secrets or raw unrelated file contents in `src/main/data-layer/doctor/readOnlyTools.ts`
- [ ] T057 [US3] Add RED guarded doctor tool tests for re-read disk truth, precondition validation, anomaly-id idempotency, audit append, and reconciliation return for all six guarded tools in `src/main/data-layer/doctor/guardedTools.test.ts`
- [ ] T058 [US3] Implement guarded doctor tools for `relocateArtifact`, `reRunStepWithPinnedContext`, `issueCorrectionPrompt`, `revertUnrelatedFiles`, `markFailedWithStrandedArtifacts`, and `cancelActiveStep` in `src/main/data-layer/doctor/guardedTools.ts`
- [ ] T059 [US3] Add RED doctor budget tests for two attempts per step, unsafe request rejection, budget exhaustion anomaly recording, and escalation to terminal-stuck state in `src/main/data-layer/doctor/doctorHarness.test.ts`
- [ ] T060 [US3] Implement bounded doctor harness, per-step budgets, tool invocation records, and escalation results in `src/main/data-layer/doctor/doctorHarness.ts`
- [ ] T061 [US3] Add RED deterministic-core-without-doctor tests proving reconciliation, failed markers, and known-safe recovery still work when doctor is disabled in `src/main/domain/reconciliation/sessionReconciler.test.ts`
- [ ] T062 [US3] Keep doctor optional and off the happy path through reconciler and recovery options in `src/main/domain/reconciliation/sessionReconciler.ts`

### Implementation for User Story 3

- [ ] T063 [US3] Add RED doctor agent instruction validation tests for authority boundaries, 12-tool limit, two-attempt limit, no direct completion, no raw git/file operations, and ambiguity escalation in `src/main/data-layer/doctor/doctorInstructions.test.ts`
- [ ] T064 [US3] Create bounded doctor agent instructions in `.github/agents/speckit.doctor.agent.md`

**Checkpoint**: User Story 3 works when the doctor is only an anomaly intermediary and every authoritative state change remains deterministic, guarded, audited, and reconciled.

---

## Phase 6: User Story 4 - Manual Nudge For Terminal-Stuck Sessions (Priority: P4)

**Goal**: Terminal-stuck sessions expose a manual nudge that reconciles unambiguous branch mismatches and escalates risky or ambiguous differences.

**Independent Test**: Force a terminal-stuck step after failed automatic remediation; confirm the nudge appears, computes intended state from durable evidence, repairs only unambiguous discrepancies, and escalates ambiguity without destructive changes.

### Tests for User Story 4

- [ ] T065 [US4] Add RED print-mode step adapter tests for exact `copilot -p --agent speckit.<step> --output-format json --session-id <uuid> --log-dir <dir>` invocation, assistant identity capture, log checksum capture, and ACP transport non-use in `src/main/ipc/copilotPassiveAgent.test.ts`
- [ ] T066 [US4] Replace passive step execution transport with the unified print-mode adapter in `src/main/ipc/copilotPassiveAgent.ts`
- [ ] T067 [US4] Add RED facilitator integration tests for create/load manifest, pending attempt append, branch snapshot, owned-path snapshot, print-mode execution, terminal parsing, pre/post reconciliation, doctor escalation, and failed-marker routing in `src/main/ipc/passiveStepIpc.test.ts`
- [ ] T068 [US4] Integrate facilitator step orchestration with manifest store, print-mode adapter, reconciliation, doctor harness, and failed-marker routing in `src/main/ipc/passiveStepIpc.ts`
- [ ] T069 [US4] Add RED main IPC trust-boundary factory tests for manifest read, reconcile, doctor status, nudge request, and nudge result seven-case floors in `src/main/ipc/sessionManifest.factory.spec.ts`
- [ ] T070 [US4] Implement main IPC trust-boundary factories for manifest and nudge capabilities in `src/main/ipc/sessionManifest.factory.ts`
- [ ] T071 [US4] Add RED main IPC handler tests for `sessionManifest:read`, `sessionManifest:reconcile`, `sessionManifest:doctorStatus`, and `sessionManifest:nudge` in `src/main/ipc/sessionManifest.test.ts`
- [ ] T072 [US4] Register manifest, reconcile, doctor-status, and nudge IPC handlers in `src/main/ipc/sessionManifest.ts`
- [ ] T073 [US4] Add RED preload bridge tests proving manifest and nudge channels validate payloads and expose no Node or Electron APIs to renderer callers in `src/preload/index.test.ts`
- [ ] T074 [US4] Expose typed manifest and nudge bridge entries in `src/preload/index.ts`
- [ ] T075 [US4] Add RED renderer API factory and endpoint tests for manifest read, reconcile, doctor status, nudge mutation, cache invalidation, and bridge-exit seven-case floors in `src/renderer/api/sessionManifest.endpoint.test.ts`
- [ ] T076 [US4] Implement renderer manifest endpoint, factories, and root API registration in `src/renderer/api/sessionManifest.endpoint.ts`
- [ ] T077 [US4] Add RED listener tests proving reconciled manifest state updates session and steps slices without making renderer state authoritative in `src/renderer/listeners/sessionLifecycle.listener.test.ts`
- [ ] T078 [US4] Wire reconciled manifest state into renderer listener middleware as derived state only in `src/renderer/listeners/sessionLifecycle.listener.ts`
- [ ] T079 [US4] Add RED `NudgeButton` accessibility and visibility tests for `canNudge`, affected step name, disabled duplicate clicks, status announcement, alert escalation copy, and hidden healthy/running/auto-recoverable states in `src/renderer/components/NudgeButton.test.tsx`
- [ ] T080 [US4] Implement props-only `NudgeButton` and smart container wiring in `src/renderer/components/NudgeButton.tsx`
- [ ] T081 [US4] Add RED `reconcileBranchToIntendedShape` tests for intended shape computation, unambiguous repair, no-op, rejected stale precondition, ambiguous escalation, and no direct completion marking in `src/main/domain/reconciliation/reconcileBranchToIntendedShape.test.ts`
- [ ] T082 [US4] Implement `reconcileBranchToIntendedShape` pure planner and guarded action orchestration in `src/main/domain/reconciliation/reconcileBranchToIntendedShape.ts`
- [ ] T083 [US4] Add RED nudge data-layer tests for re-reading disk truth before each mutation, intervention audit records, reconciliation after each action, and branch-change rejection in `src/main/data-layer/recovery/nudge.test.ts`
- [ ] T084 [US4] Implement nudge execution through guarded deterministic actions in `src/main/data-layer/recovery/nudge.ts`
- [ ] T085 [US4] Add RED E2E nudge flow covering terminal-stuck visibility, unambiguous repair, ambiguous escalation, and healthy-session hidden state in `e2e/hybrid-manifest-nudge.spec.ts`
- [ ] T086 [US4] Wire nudge UI into passive and review step containers in `src/renderer/components/PassiveStepContainer.tsx` and `src/renderer/components/ReviewStepContainer.tsx`

### Implementation for User Story 4

- [ ] T087 [US4] Add RED regression tests preserving maximum reached step advancement, navigation-loop prevention, branch-null routing gates, and Windows-conditional command behavior in `src/renderer/components/WorkspaceContainer.test.tsx`
- [ ] T088 [US4] Preserve derived step advancement, navigation-loop prevention, branch-null routing gates, and Windows command behavior while manifest state becomes authoritative in `src/renderer/components/WorkspaceContainer.tsx`

**Checkpoint**: User Story 4 works when nudge appears only for terminal-stuck sessions after auto-remediation fails and never bypasses deterministic validation.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verify full feature behavior and update directly related documentation after all desired stories are complete.

- [ ] T089 [P] Update Run 13 implementation notes and manual evidence checklist in `specs/0013-hybrid-manifest-architecture/quickstart.md`
- [ ] T090 [P] Update project guidance for manifest authority, print-mode step execution, doctor boundedness, and nudge constraints in `.github/copilot-instructions.md`
- [ ] T091 Run targeted typecheck, lint, unit, and E2E verification using scripts in `package.json`
- [ ] T092 Confirm task and implementation coverage for FR-001 through FR-030 in `specs/0013-hybrid-manifest-architecture/spec.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: No dependencies.
- **Phase 2 Foundational**: Depends on Phase 1.
- **Phase 3 US1 / Milestones 1-4**: Depends on Phase 2 and is the MVP.
- **Phase 4 US2 / Milestones 5-7**: Depends on US1 because dirty-diff gates, failed markers, recovery, and classifier anomalies feed the reconciler.
- **Phase 5 US3 / Milestones 8-9**: Depends on US2 because the doctor consumes deterministic anomaly and recovery contracts.
- **Phase 6 US4 / Milestones 10-11**: Depends on US3 because facilitator integration routes through the full deterministic/doctor stack before nudge is exposed.
- **Phase 7 Polish**: Depends on all implemented stories.

### User Story Dependencies

- **US1 (P1)**: Starts after Foundation; no dependency on other stories.
- **US2 (P2)**: Depends on US1 to reuse manifest authority, branch-history idempotency, and reconciliation.
- **US3 (P3)**: Depends on US2 to reuse anomalies, guarded deterministic recovery, and failed-marker evidence.
- **US4 (P4)**: Depends on US3 to integrate facilitator execution, doctor escalation, and terminal-stuck nudge eligibility.

### Milestone Order Mapping

1. `sessionManifestStore`: T011-T018.
2. `stepContracts` hardening: T019-T024.
3. Branch-history `commitStep` idempotency: T025-T028.
4. `sessionReconciler`: T029-T034.
5. Dirty-diff gates plus failed markers: T035-T042.
6. Guarded `relocateArtifact`: T043-T046.
7. Watchdog/transcript classifier: T047-T052.
8. Bounded 12-tool doctor harness: T053-T062.
9. Doctor agent instructions: T063-T064.
10. Facilitator integration: T065-T078.
11. Nudge button plus `reconcileBranchToIntendedShape`: T079-T088.

---

## Parallel Execution Examples

### Setup

```text
Task: "Create session manifest v1 fixture set for valid, incomplete, invalid-shape, and unknown-schema manifests in tests/fixtures/hybrid-manifest/session-manifest.v1.json"
Task: "Create branch trailer history fixture set covering duplicate, out-of-order, and matching artifact-snapshot trailers in tests/fixtures/hybrid-manifest/branch-trailers.txt"
Task: "Create transcript and print-mode terminal-event fixture set covering success, failure, missing JSON, invalid JSON, killed, interrupted, and watchdog-silence cases in tests/fixtures/hybrid-manifest/terminal-events.jsonl"
```

### User Story 1

```text
After T018, T019 and T021 can be drafted in parallel because they touch src/main/hooks/manifest.test.ts and src/main/domain/factories/artifactSnapshot.factory.test.ts, but T020/T022 must preserve milestone 2 order before T023 starts.
```

### User Story 2

```text
After T042, T043 and T047 can be drafted in parallel because guarded relocation and classifier tests touch different modules, but T046 must complete before doctor guarded tools consume relocateArtifact.
```

### User Story 3

```text
After T054, T055 and T057 can be drafted in parallel because read-only and guarded tool tests touch different files, but T060 must wait for both tool implementations.
```

### User Story 4

```text
After T078, T079 and T081 can be drafted in parallel because renderer nudge UI tests and pure intended-shape tests touch different files, but T085 waits for T080-T084.
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 tasks T011-T034 in strict numeric order.
3. Stop and validate the independent US1 criterion: manifest, branch trailer, artifact snapshot, dirty state, and derived UI status agree before any step is shown as passed.

### Incremental Delivery

1. Deliver US1 to establish deterministic step authority.
2. Deliver US2 to safely recover known irregularities and preserve failed evidence.
3. Deliver US3 to add bounded doctor triage without authority.
4. Deliver US4 to integrate print-mode facilitator flow and terminal-stuck nudge.

### Validation Gates

- Run focused tests after each RED/GREEN pair.
- Run `npm run typecheck`, `npm run lint`, and `npm run test` after each user story phase.
- Run `npm run e2e` after US4 and before marking the feature complete.
- Confirm no runtime dependency additions in `package.json`.
