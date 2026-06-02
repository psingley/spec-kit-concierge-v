# Tasks: Hybrid Manifest Architecture

**Input**: `specs/0013-hybrid-manifest-architecture/plan.md`, `specs/0013-hybrid-manifest-architecture/spec.md`, `specs/0013-hybrid-manifest-architecture/research.md`, `specs/0013-hybrid-manifest-architecture/data-model.md`, `specs/0013-hybrid-manifest-architecture/contracts/`, and `specs/0013-hybrid-manifest-architecture/quickstart.md`.

**Tests**: Required. The feature spec includes mandatory user-scenario testing and measurable outcomes; implementation must use vertical TDD tracer bullets: one RED test task, one minimal GREEN implementation task, then repeat. Each RED task records visible failing output before its paired GREEN task begins; the active dogfood directive supplies approval to continue after observed RED output unless a real branch decision or unsafe tradeoff appears. Tests exercise public interfaces and may mock only system boundaries: filesystem, git/process commands, Electron IPC, localhost HTTP, preload bridge, child process, time, and logger creation through `createMainLogger`.

**Scope guard**: Implement only Run 13 Hybrid Manifest Architecture. Do not add runtime dependencies. Do not make the doctor, renderer, transcript classifier, or agent prose authoritative. Deterministic app code remains the only writer of `.concierge/session-manifest.json`, step commits/trailers, failed markers, guarded mutations, and completion status.

**FR-030 build order**: Execute milestones in this exact order and do not start a later milestone until the prior milestone is complete: (1) `sessionManifestStore`; (2) `stepContracts` hardening; (3) branch-history `commitStep` idempotency; (4) `sessionReconciler`; (5) dirty-diff gates plus failed markers; (6) guarded `relocateArtifact`; (7) watchdog/transcript classifier; (8) bounded 12-tool doctor harness; (9) doctor agent instructions; (10) facilitator integration; (11) nudge button plus `reconcileBranchToIntendedShape`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other marked tasks in the same phase because it touches different files and has no dependency on incomplete tasks.
- **[Story]**: User-story phase tasks only: `[US1]`, `[US2]`, `[US3]`, or `[US4]`.
- Every task includes exact file paths.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Lock architecture exceptions, fixtures, and test surfaces before source work begins.

- [X] T001 Create ADR, early project guidance, and workflow validation updates for the Run 13 constitution-approved print-mode exception, constitution amendment metadata, dogfood branch exception, TDD RED-output evidence rule, and ACP step-execution retirement in `docs/adr/0017-hybrid-manifest-print-mode.md`, `.github/copilot-instructions.md`, `.specify/scripts/bash/check-prerequisites.sh`, and `.specify/scripts/bash/common.sh`
- [X] T002 [P] Create session manifest v1 fixture set for valid, incomplete, invalid-shape, unknown-schema, and max-size performance manifests in `tests/fixtures/hybrid-manifest/session-manifest.v1.json` and `tests/fixtures/hybrid-manifest/session-manifest.max.json`; max fixture includes six steps, three attempts per step, 30 anomalies, 30 interventions, 12 doctor invocations, and 60 artifact snapshot entries
- [X] T003 [P] Create branch trailer history fixture set covering duplicate, out-of-order, and matching artifact-snapshot trailers in `tests/fixtures/hybrid-manifest/branch-trailers.txt`
- [X] T004 [P] Create transcript and print-mode terminal-event fixture set covering success, failure, missing JSON, invalid JSON, killed, interrupted, watchdog-silence, and parseable assistant identity events with `assistantSessionId`, `messageId`, and `turnId` in `tests/fixtures/hybrid-manifest/terminal-events.jsonl`
- [X] T005 [P] Create deterministic recovery catalog fixture set covering exactly 20 safe and unsafe classes from `contracts/recovery-catalog.md`, doctor exhaustion, nudge eligibility, and needs-attention sessions in `tests/fixtures/hybrid-manifest/recovery-scenarios.json`; the fixture denominator must support the SC-004 90% automatic-safe-recovery assertion without invoking the doctor
- [X] T005a [P] Create 100-case interrupted and restarted resume reconstruction fixture corpus with expected current step and terminal status outcomes in `tests/fixtures/hybrid-manifest/resume-reconstruction-cases.json`; the fixture denominator must support the SC-002 99% reconstruction assertion without transient renderer state

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared typed vocabulary and trust-boundary utilities required by all stories.

**Critical**: No user story work can begin until this phase is complete.

- [X] T006 Create canonical Run 13 step, status, anomaly, intervention, doctor-tool, and nudge result types in `src/main/domain/manifest/types.ts`
- [X] T007 Create strict factory helper primitives for unknown-key rejection, non-empty strings, ISO timestamps, canonical steps, and typed named errors in `src/main/domain/manifest/factoryUtils.ts`
- [X] T008 [P] Create renderer-facing manifest, renderer-status projection, audit-trail, and localhost HTTP API shared types without Electron or Node imports in `src/renderer/api/sessionManifest.types.ts`
- [X] T009 [P] Create main IPC channel constants and localhost HTTP route constants for manifest read, reconcile, audit trail, doctor status, and nudge requests in `src/main/ipc/sessionManifest.channels.ts` and `src/main/http/sessionManifest.routes.ts`
- [X] T010 [P] Export Run 13 feature flags and no-runtime-dependency guidance for tests in `src/main/domain/manifest/run13Policy.ts`

**Checkpoint**: Foundation ready. Begin FR-030 milestone 1.

---

## Phase 3: User Story 1 - Deterministic Step Completion (Priority: P1) - MVP

**Goal**: Passed steps are shown only when manifest attempts, branch completion evidence, required artifacts, and dirty-diff gates agree.

**Independent Test**: Replay a completed-step fixture before facilitator integration and confirm `.concierge/session-manifest.json`, branch `Concierge-Step:` trailer history, step-owned artifact snapshots, failed markers, and UI-derived status all resolve to the same terminal outcome.

### Tests for User Story 1

- [X] T011 [US1] Add RED session manifest factory floor tests for happy path, empty object, null, undefined, hostile status, incomplete plausible input, and extra-key rejection in `src/main/domain/manifest/sessionManifest.factory.test.ts`
- [X] T012 [US1] Implement session manifest factories and typed schema v1 parsing in `src/main/domain/manifest/sessionManifest.factory.ts`
- [X] T013 [US1] Add RED append-only attempt reducer tests for `pending -> running -> pass|failed|killed|interrupted`, supersession links, terminal immutability, and audit record redaction in `src/main/domain/manifest/sessionManifestReducer.test.ts`
- [X] T014 [US1] Implement append-only attempt reducers, anomaly reducers, intervention reducers, and audit redaction in `src/main/domain/manifest/sessionManifestReducer.ts`
- [X] T015 [US1] Add RED atomic read/write tests for temp-file write, file fsync, rename, directory fsync when supported, short-write rejection, and visible parse errors in `src/main/data-layer/manifest/sessionManifestStore.test.ts`
- [X] T016 [US1] Implement `sessionManifestStore` atomic read/write, create/load, append attempt, append anomaly, append intervention, and audit APIs in `src/main/data-layer/manifest/sessionManifestStore.ts`
- [X] T017 [US1] Add RED structured logging tests for milestone-1 manifest-store events only: `session-manifest-read`, `session-manifest-write`, `manifest-anomaly-recorded`, and `manifest-intervention-recorded` in `src/main/data-layer/manifest/sessionManifestStore.logging.test.ts` and `src/main/logging/hybridManifest.logging.test.ts`
- [X] T018 [US1] Implement milestone-1 structured manifest-store logging through `createMainLogger` in `src/main/data-layer/manifest/sessionManifestStore.ts` and `src/main/logging/hybridManifest.logging.ts`

### Implementation for User Story 1

- [X] T019 [US1] Add RED step contract ownership tests for required artifacts, optional artifacts, context-file exceptions, and step-owned path sets for specify, clarify, plan, tasks, analyze, and review in `src/main/hooks/manifest.test.ts`
- [X] T020 [US1] Harden `STEP_ARTIFACT_MANIFEST` with step-owned path sets and context-file exceptions in `src/main/hooks/manifest.ts`
- [X] T021 [US1] Add RED artifact snapshot factory tests for path scope validation, missing required artifact blocking, optional artifact evidence, stable `snapshotHash`, and content metadata hashing in `src/main/domain/factories/artifactSnapshot.factory.test.ts`
- [X] T022 [US1] Implement step-owned artifact snapshot factories and hashing in `src/main/domain/factories/artifactSnapshot.factory.ts`
- [X] T023 [US1] Add RED step-start snapshot tests proving before hooks capture branch state and owned-path snapshots before any step agent execution in `src/main/hooks/hookHelpers.test.ts`
- [X] T024 [US1] Wire step-start owned-path snapshot capture into before-hook helpers in `src/main/hooks/hookHelpers.ts`
- [X] T025 [US1] Add RED branch-history completion evidence tests for matching artifact snapshot adoption, duplicate trailer avoidance, out-of-order valid commit adoption, and trailer/content mismatch rejection in `src/main/data-layer/git/stepCompletionHistory.test.ts`
- [X] T026 [US1] Implement branch-history completion evidence search through the existing git command path in `src/main/data-layer/git/stepCompletionHistory.ts`
- [X] T027 [US1] Add RED `commitWithTrailer` idempotency tests requiring artifact-snapshot comparison before new commit creation and exactly one `Concierge-Step: <step>:pass` trailer in `src/main/data-layer/git/gitCommand.commit.test.ts`
- [X] T028 [US1] Replace head-only `commitWithTrailer` idempotency with branch-history artifact-snapshot adoption in `src/main/data-layer/git/gitCommand.ts`
- [X] T029 [US1] Add RED `sessionReconciler` completion-gate tests for pass, missing artifact, stale manifest attempt, missing trailer, mismatched snapshot, unresolved blocking anomaly, and failed marker inputs in `src/main/domain/reconciliation/sessionReconciler.test.ts`
- [X] T030 [US1] Implement pure `sessionReconciler` completion, pending, running, failed, killed, interrupted, and needs-attention decisions in `src/main/domain/reconciliation/sessionReconciler.ts`
- [X] T031 [US1] Add RED pre-commit and post-commit reconciliation integration tests around after-hook commit writes in `src/main/hooks/hookHelpers.test.ts`
- [X] T032 [US1] Route after-hook completion through pre-commit and post-commit reconciliation in `src/main/hooks/hookHelpers.ts`
- [X] T033 [US1] Add RED resume reconstruction tests proving branch sessions derive progress from manifest, trailers, artifacts, and failed markers instead of renderer memory and assert the 100-case SC-002 fixture corpus reaches at least 99% correct current-step plus terminal-status reconstruction in `src/main/data-layer/git/branchSessions.test.ts`
- [X] T034 [US1] Integrate manifest-backed reconciliation into branch session reconstruction in `src/main/data-layer/git/branchSessions.ts`

**Checkpoint**: MVP complete when User Story 1 independently proves no step can pass unless manifest, branch, artifact, and failure evidence agree.

---

## Phase 4: User Story 2 - Recover From Agent Irregularities Safely (Priority: P2)

**Goal**: Known safe irregularities are remediated by deterministic guarded code, while unsafe or ambiguous diffs block completion and preserve recovery evidence.

**Independent Test**: Introduce misplaced artifacts, unrelated edits, duplicate completion commits, interrupted runs, and stranded artifacts; confirm safe cases are remediated, unsafe cases are escalated, and no case falsely marks completion.

### Tests for User Story 2

- [X] T035 [US2] Add RED dirty-diff gate tests for `owned-safe`, `owned-mismatched`, `unrelated`, `ambiguous`, and `unsafe` classifications in `src/main/domain/reconciliation/dirtyDiffGates.test.ts`
- [X] T036 [US2] Implement deterministic dirty-diff gate classification from step-start snapshots and current git facts in `src/main/domain/reconciliation/dirtyDiffGates.ts`
- [X] T037 [US2] Add RED failed marker factory tests for backward-compatible fields plus `strandedArtifacts` and `anomalyIds` strict validation in `src/main/data-layer/failedSteps.test.ts`
- [X] T038 [US2] Extend failed marker read/write helpers with stranded-artifact details and invalid-marker warnings in `src/main/data-layer/failedSteps.ts`
- [X] T039 [US2] Add RED passive completion-blocking tests for unrelated, ambiguous, unsafe, and owned-mismatched dirty diffs in `src/main/ipc/passiveStepIpc.test.ts`
- [X] T040 [US2] Block passive step completion on unsafe dirty-diff classifications and write failed markers with stranded artifacts in `src/main/ipc/passiveStepIpc.ts`
- [X] T041 [US2] Add RED hook completion-blocking tests for dirty-diff gates and failed-marker persistence in `src/main/hooks/hookHelpers.test.ts`
- [X] T042 [US2] Apply dirty-diff gates and failed-marker writes to after-hook completion in `src/main/hooks/hookHelpers.ts`
- [X] T043 [US2] Add RED safe recovery catalog and guarded recovery request factory tests for all six safe classes, anomaly id, ownership, ambiguity rejection, extra-key rejection, idempotency key validation, and doctor-escalation boundaries in `src/main/domain/recovery/recoveryCatalog.factory.test.ts`
- [X] T044 [US2] Implement safe recovery catalog request and result factories for relocation, valid completion adoption, failed-marker refresh, proven unrelated-file revert, observed active-step cancel, and pinned-context restart only after explicit user confirmation or an approved guarded doctor request in `src/main/domain/recovery/recoveryCatalog.factory.ts`
- [X] T045 [US2] Add RED deterministic recovery data-layer tests for all six safe classes, including re-reading disk truth, rejecting ambiguous destinations, moving only step-owned files, adopting matching completion commits, refreshing failed markers, reverting only proven unrelated files, canceling only observed active processes, requiring explicit user confirmation or an approved guarded doctor request for pinned-context restart, structured recovery-action logging, auditing before return, no silent step re-run, no direct completion marking, and idempotent no-op by anomaly id in `src/main/data-layer/recovery/deterministicRecovery.test.ts`
- [X] T046 [US2] Implement deterministic recovery orchestrator, guarded actions, and recovery-action structured logging for the safe recovery catalog in `src/main/data-layer/recovery/deterministicRecovery.ts`
- [X] T047 [US2] Add RED watchdog and transcript classifier tests for silence, missing terminal output, invalid JSON output, unexpected child exit, killed, interrupted, and transcript irregularity anomalies in `src/main/domain/reconciliation/transcriptClassifier.test.ts`
- [X] T048 [US2] Implement authority-free watchdog and transcript anomaly classifier in `src/main/domain/reconciliation/transcriptClassifier.ts`
- [X] T049 [US2] Add RED passive step classifier integration tests proving classifier anomalies cannot mark completion, write trailers, cancel steps, invoke doctor tools directly, or skip classifier-result structured logging in `src/main/ipc/passiveStepIpc.test.ts`
- [X] T050 [US2] Record classifier anomalies and classifier-result structured logs through manifest append APIs without completion authority in `src/main/ipc/passiveStepIpc.ts`

### Implementation for User Story 2

- [X] T051 [US2] Add RED regression tests preserving graceful failed-step resume with stranded artifacts in `src/main/data-layer/git/branchSessions.test.ts`
- [X] T052 [US2] Preserve graceful failed-step resume while surfacing stranded artifact detail in `src/main/data-layer/git/branchSessions.ts`

**Checkpoint**: User Story 2 works when deterministic recovery fixes only safe recovery catalog cases and all unsafe or ambiguous cases produce durable failed markers and unresolved anomalies.

---

## Phase 5: User Story 3 - Bounded LLM Doctor For Ambiguous Anomalies (Priority: P3)

**Goal**: The doctor can read evidence and request only approved guarded actions while deterministic code remains the sole authority.

**Independent Test**: Present ambiguous anomaly evidence to the doctor harness and verify exactly 12 tools, two attempts per step, guarded mutation preconditions, audit records, and reconciliation after every mutation.

### Tests for User Story 3

- [X] T053 [US3] Add RED doctor tool catalog factory tests proving exactly six read-only tools and exactly six guarded tools from FR-020/FR-021 are accepted and every other tool is rejected in `src/main/domain/doctor/doctorTools.factory.test.ts`
- [X] T054 [US3] Implement doctor tool catalog factories and rejection reasons in `src/main/domain/doctor/doctorTools.factory.ts`
- [X] T055 [US3] Add RED read-only doctor tool tests for bounded outputs from `readFeatureJson`, `readManifest`, `gitStatusDiff`, `readTrailers`, `readArtifacts`, and `readTranscript` in `src/main/data-layer/doctor/readOnlyTools.test.ts`
- [X] T056 [US3] Implement read-only doctor tools without exposing secrets or raw unrelated file contents in `src/main/data-layer/doctor/readOnlyTools.ts`
- [X] T057 [US3] Add RED guarded doctor tool tests for re-read disk truth, precondition validation, anomaly-id idempotency, doctor-invocation structured logging, audit append, reconciliation return, and delegation to deterministic guarded actions for all six guarded tools in `src/main/data-layer/doctor/guardedTools.test.ts`
- [X] T058 [US3] Implement guarded doctor tools and doctor-invocation structured logging for `relocateArtifact`, `reRunStepWithPinnedContext`, `issueCorrectionPrompt`, `revertUnrelatedFiles`, `markFailedWithStrandedArtifacts`, and `cancelActiveStep` by routing through deterministic guarded recovery actions in `src/main/data-layer/doctor/guardedTools.ts`
- [X] T059 [US3] Add RED doctor budget tests for two attempts per step, unsafe request rejection, budget exhaustion anomaly recording, and escalation to needs-attention state in `src/main/data-layer/doctor/doctorHarness.test.ts`
- [X] T060 [US3] Implement bounded doctor harness, per-step budgets, tool invocation records, and escalation results in `src/main/data-layer/doctor/doctorHarness.ts`
- [X] T061 [US3] Add RED deterministic-core-without-doctor tests proving reconciliation, failed markers, and each safe recovery catalog class still work when doctor is disabled in `src/main/domain/reconciliation/sessionReconciler.test.ts`
- [X] T062 [US3] Keep doctor optional and off the happy path through reconciler and recovery options in `src/main/domain/reconciliation/sessionReconciler.ts`

### Implementation for User Story 3

- [ ] T063 [US3] Add RED doctor agent instruction validation tests for authority boundaries, 12-tool limit, two-attempt limit, no direct completion, no raw git/file operations, and ambiguity escalation in `src/main/data-layer/doctor/doctorInstructions.test.ts`
- [ ] T064 [US3] Create bounded doctor agent instructions in `.github/agents/speckit.doctor.agent.md`

**Checkpoint**: User Story 3 works when the doctor is only an anomaly intermediary and every authoritative state change remains deterministic, guarded, audited, and reconciled.

---

## Phase 6: User Story 4 - Manual Nudge For Terminal-Stuck Sessions (Priority: P4)

**Goal**: Needs-attention sessions expose a manual nudge that reconciles unambiguous branch mismatches and escalates risky or ambiguous differences.

**Independent Test**: Force a needs-attention step after failed automatic remediation; confirm the nudge appears, computes intended state from durable evidence, repairs only unambiguous discrepancies, and escalates ambiguity without destructive changes.

### Tests for User Story 4

- [ ] T065 [US4] Add RED print-mode step data-layer adapter tests for exact `copilot -p --agent speckit.<step> --output-format json --session-id <uuid> --log-dir <dir>` invocation, `assistantSessionId`, `messageId`, and `turnId` capture from parseable step output events, log checksum capture, Clarify resume/re-ask reuse of the original assistant session identity, and ACP transport non-use in `src/main/data-layer/agents/copilotPrintModeAdapter.test.ts`
- [ ] T066 [US4] Implement unified print-mode data-layer adapter, capture `assistantSessionId`, `messageId`, and `turnId` from parseable step output events, and preserve original Clarify assistant session identity for resume/re-ask attempts in `src/main/data-layer/agents/copilotPrintModeAdapter.ts`
- [ ] T067 [US4] Add RED facilitator integration tests for create/load manifest, pending attempt append, branch snapshot, owned-path snapshot, print-mode adapter execution, terminal parsing with `assistantSessionId`, `messageId`, and `turnId`, pre/post reconciliation, facilitator/reconciliation structured logging, doctor escalation, failed-marker routing, and after-hook-owned completion commit adoption in `src/main/ipc/passiveStepIpc.test.ts`
- [ ] T068 [US4] Integrate facilitator step orchestration with manifest store, data-layer print-mode adapter, reconciliation, facilitator/reconciliation structured logging, doctor harness, failed-marker routing, and after-hook-owned completion commit adoption in `src/main/ipc/passiveStepIpc.ts`
- [ ] T069 [US4] Add RED main IPC and HTTP trust-boundary factory tests for manifest read, reconcile, audit trail, and doctor status seven-case floors in `src/main/ipc/sessionManifest.factory.spec.ts` and `src/main/http/sessionManifest.factory.spec.ts`
- [ ] T070 [US4] Implement main IPC and HTTP trust-boundary factories for manifest read, reconcile, audit trail, and doctor status capabilities in `src/main/ipc/sessionManifest.factory.ts` and `src/main/http/sessionManifest.factory.ts`
- [ ] T071 [US4] Add RED main IPC and localhost HTTP handler tests for `sessionManifest:read`, `sessionManifest:reconcile`, `sessionManifest:doctorStatus`, `sessionManifest:auditTrail`, manifest HTTP handler structured logging, `GET /v1/session-manifest`, `POST /v1/session-manifest/reconcile`, `GET /v1/session-manifest/audit`, and `GET /v1/session-manifest/doctor-status` in `src/main/ipc/sessionManifest.test.ts` and `src/main/http/sessionManifest.test.ts`
- [ ] T072 [US4] Register manifest, reconcile, doctor-status, and audit-trail IPC handlers plus localhost HTTP routes through the same data-layer path in `src/main/ipc/sessionManifest.ts` and `src/main/http/sessionManifest.ts`
- [ ] T073 [US4] Add RED preload bridge tests proving manifest, reconcile, doctor-status, and audit-trail channels validate payloads and expose no Node or Electron APIs to renderer callers in `src/preload/index.test.ts`
- [ ] T074 [US4] Expose typed manifest, reconcile, doctor-status, and audit-trail bridge entries in `src/preload/index.ts`
- [ ] T075 [US4] Add RED renderer API factory and endpoint tests for manifest read, reconcile, doctor status, audit-trail inspection within the SC-007 target, cache invalidation, HTTP parity state updates, and bridge-exit seven-case floors in `src/renderer/api/sessionManifest.endpoint.test.ts`
- [ ] T076 [US4] Implement renderer manifest, audit-trail, factories, and root API registration without nudge mutation surfaces in `src/renderer/api/sessionManifest.endpoint.ts`
- [ ] T077 [US4] Add RED listener tests proving reconciled manifest state maps to renderer status projection, updates audit summaries, and updates session and steps slices without making renderer state authoritative in `src/renderer/listeners/sessionLifecycle.listener.test.ts`
- [ ] T078 [US4] Wire reconciled manifest state, renderer status projection, and audit summaries into renderer listener middleware as derived state only in `src/renderer/listeners/sessionLifecycle.listener.ts`
- [ ] T079 [US4] Add RED `NudgeButton` accessibility and visibility tests for `canNudge`, affected step name, disabled duplicate clicks, status announcement, alert escalation copy, and hidden healthy/running/auto-recoverable states in `src/renderer/components/NudgeButton.test.tsx`
- [ ] T080 [US4] Implement props-only `NudgeButton` with no store, RTK Query, or workflow branching in `src/renderer/components/NudgeButton.tsx`
- [ ] T081 [US4] Add RED `reconcileBranchToIntendedShape` tests for intended shape computation, unambiguous repair, no-op, rejected stale precondition, ambiguous escalation, and no direct completion marking in `src/main/domain/reconciliation/reconcileBranchToIntendedShape.test.ts`
- [ ] T082 [US4] Implement `reconcileBranchToIntendedShape` pure planner and guarded action orchestration in `src/main/domain/reconciliation/reconcileBranchToIntendedShape.ts`
- [ ] T083 [US4] Add RED nudge data-layer, IPC, HTTP, preload bridge, and renderer API tests for nudge request/result factory floors, `sessionManifest:nudge`, `POST /v1/session-manifest/nudge`, nudge mutation cache invalidation, re-reading disk truth before each mutation, nudge-action structured logging, intervention audit records, reconciliation after each action, and branch-change rejection in `src/main/data-layer/recovery/nudge.test.ts`, `src/main/ipc/sessionManifest.nudge.test.ts`, `src/main/http/sessionManifest.nudge.test.ts`, `src/preload/index.test.ts`, and `src/renderer/api/sessionManifest.endpoint.test.ts`
- [ ] T084 [US4] Implement nudge execution, nudge IPC/HTTP/preload/renderer surfaces, and nudge-action structured logging through guarded deterministic actions in `src/main/data-layer/recovery/nudge.ts`, `src/main/ipc/sessionManifest.ts`, `src/main/http/sessionManifest.ts`, `src/preload/index.ts`, and `src/renderer/api/sessionManifest.endpoint.ts`
- [ ] T085 [US4] Add RED E2E nudge and audit flow covering needs-attention visibility, unambiguous repair, ambiguous escalation, healthy-session hidden state, external-agent HTTP nudge parity, GUI mirroring, and failed/remediated/nudged audit inspection within the SC-007 target in `e2e/hybrid-manifest-nudge.spec.ts`
- [ ] T086 [US4] Wire smart nudge and audit-trail UI into passive and review step containers in `src/renderer/components/PassiveStepContainer.tsx` and `src/renderer/components/ReviewStepContainer.tsx`

### Implementation for User Story 4

- [ ] T087 [US4] Add RED regression tests preserving maximum reached step advancement, navigation-loop prevention, branch-null routing gates, and Windows-conditional command behavior in `src/renderer/components/WorkspaceContainer.test.tsx`
- [ ] T088 [US4] Preserve derived step advancement, navigation-loop prevention, branch-null routing gates, and Windows command behavior while manifest state becomes authoritative in `src/renderer/components/WorkspaceContainer.tsx`

**Checkpoint**: User Story 4 works when nudge appears only for needs-attention sessions after auto-remediation fails and never bypasses deterministic validation.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verify full feature behavior and update directly related documentation after all desired stories are complete.

- [ ] T089 [P] Update Run 13 implementation notes and manual evidence checklist in `specs/0013-hybrid-manifest-architecture/quickstart.md`
- [ ] T090 [P] Reconfirm project guidance for manifest authority, print-mode step execution, doctor boundedness, audit inspection, and nudge constraints in `.github/copilot-instructions.md`
- [ ] T091 Add and run RED performance budget coverage for manifest read plus reconciliation over `tests/fixtures/hybrid-manifest/session-manifest.max.json`, SC-002 99% resume reconstruction threshold coverage over `tests/fixtures/hybrid-manifest/resume-reconstruction-cases.json`, and SC-004 90% automatic recovery threshold coverage over `tests/fixtures/hybrid-manifest/recovery-scenarios.json`, then run targeted typecheck, lint, unit, coverage, and E2E verification using scripts in `package.json`, including `npm run test:coverage`
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
- **US4 (P4)**: Depends on US3 to integrate facilitator execution, doctor escalation, and needs-attention nudge eligibility.

### Milestone Order Mapping

1. `sessionManifestStore`: T011-T018.
2. `stepContracts` hardening: T019-T024.
3. Branch-history `commitStep` idempotency: T025-T028.
4. `sessionReconciler`: T029-T034.
5. Dirty-diff gates plus failed markers: T035-T042.
6. Guarded deterministic recovery catalog: T043-T046.
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
4. Deliver US4 to integrate print-mode facilitator flow and needs-attention nudge.

### Validation Gates

- Run focused tests after each RED/GREEN pair and record the visible RED failure output before starting the paired GREEN task.
- Run `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run test:coverage` after each user story phase.
- Run `npm run e2e` after US4 and before marking the feature complete.
- Confirm no runtime dependency additions in `package.json`.
