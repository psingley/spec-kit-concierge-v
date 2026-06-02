# Feature Specification: Hybrid Manifest Architecture

**Feature Branch**: `build/manifest-architecture-dogfood`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "Hybrid Manifest Architecture — deterministic step authority + bounded LLM anomaly-intermediary"

## Clarifications

### Session 2026-06-01

- Q: Which architecture seed governs clarification? -> A: Hybrid deterministic core plus bounded LLM doctor; strict reconciliation; print-mode unification and ACP removal; deterministic code as sole writer and authority; nudge only for terminal-stuck sessions after automatic remediation fails.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Deterministic Step Completion (Priority: P1)

As a user running the six-step Spec Kit pipeline, I need each step to resolve to a trustworthy terminal outcome so I can resume, review, or continue work without guessing which source of state is correct.

**Why this priority**: This is the core value of the feature. Without deterministic step authority, the app continues to regenerate flaky success/failure behavior across runs.

**Independent Test**: Can be tested before facilitator integration by replaying a completed-step fixture and confirming that the durable manifest, branch history, required step artifacts, and completion indicators all agree before the step is shown as complete.

**Acceptance Scenarios**:

1. **Given** a step has produced the required artifacts and the expected branch evidence, **When** reconciliation runs, **Then** the step is recorded as passed only if the manifest, branch evidence, and artifacts agree.
2. **Given** a step exits successfully but required artifacts are missing or branch evidence disagrees, **When** reconciliation runs, **Then** the step is not marked passed and a specific anomaly is recorded.
3. **Given** a user resumes an existing session, **When** the app reconstructs progress, **Then** the manifest and branch/artifact evidence determine current step status instead of transient UI state.

---

### User Story 2 - Recover From Agent Irregularities Safely (Priority: P2)

As a user whose coding agent sometimes writes to the wrong place, wanders off task, or leaves a dirty branch, I need the app to identify these anomalies and attempt only safe, bounded remediation so the branch does not become more corrupt.

**Why this priority**: Agent irregularity is a root cause of repeated failures. Recovery must be possible, but completion authority must remain deterministic.

**Independent Test**: Can be tested by introducing common anomalies such as misplaced artifacts, unrelated file edits, duplicate step commits, interrupted runs, and stranded artifacts, then confirming that safe cases are remediated and unsafe cases are escalated without falsely marking completion.

**Acceptance Scenarios**:

1. **Given** a step-owned artifact is created in the wrong feature directory, **When** deterministic validation identifies an unambiguous relocation, **Then** the artifact is moved by a guarded recovery action and the intervention is audited.
2. **Given** a step changes files outside its owned scope, **When** dirty-diff gates evaluate the branch, **Then** unrelated changes are blocked from step completion and either reverted through a guarded action or escalated.
3. **Given** a step creates duplicate or out-of-order completion commits, **When** commit idempotency is evaluated, **Then** branch history is searched by step-owned artifact snapshot so an existing valid commit is adopted instead of duplicating it.

---

### User Story 3 - Bounded LLM Doctor For Ambiguous Anomalies (Priority: P3)

As a user, I need an LLM intermediary to help triage open-ended anomalies while remaining unable to write authoritative state, mark completion, or bypass deterministic validation.

**Why this priority**: Some failures are too open-ended for a pure state machine to enumerate, but the LLM must not become a second source of truth.

**Independent Test**: Can be tested by presenting ambiguous anomaly evidence to the doctor and verifying that it can read evidence and invoke only approved guarded actions, while deterministic validation remains the only path to manifest updates, commits, failed markers, and completion.

**Acceptance Scenarios**:

1. **Given** deterministic recovery cannot safely resolve an anomaly, **When** the doctor is invoked, **Then** it receives run evidence and may propose or invoke only bounded deterministic tools.
2. **Given** the doctor proposes an unsafe action, **When** the tool harness evaluates the request, **Then** the action is rejected and no authoritative state is changed.
3. **Given** a guarded doctor action succeeds, **When** control returns to reconciliation, **Then** deterministic validation re-reads disk truth before any status changes.

---

### User Story 4 - Manual Nudge For Terminal-Stuck Sessions (Priority: P4)

As a user with a terminal-stuck step after automatic remediation has failed, I need a manual nudge that reconciles the branch toward the intended shape and clearly escalates ambiguous cases.

**Why this priority**: Users need an escape hatch for rare stuck states, but it must not appear during normal happy-path operation or hide risky decisions.

**Independent Test**: Can be tested by forcing a terminal-stuck session with no successful auto-remediation and confirming that the nudge becomes available, computes intended state from durable evidence, fixes unambiguous discrepancies, and asks for human judgment when ambiguity remains.

**Acceptance Scenarios**:

1. **Given** a step is terminal-stuck and no automatic remediation succeeded, **When** the user views the session, **Then** the nudge action is available.
2. **Given** the nudge action finds an unambiguous mismatch between intended and actual branch state, **When** it runs, **Then** the system repairs the mismatch through guarded deterministic actions and reports the result.
3. **Given** the nudge action finds ambiguous or risky differences, **When** it runs, **Then** it escalates to the user without making destructive or authoritative changes.

### Edge Cases

- Step process exits successfully but emits no parseable terminal result.
- Step process is interrupted, killed, or leaves a child process behind.
- Resume starts from a branch where the manifest is present but completion evidence is missing, stale, or contradictory.
- Required artifacts exist in more than one plausible feature directory.
- A prior step has valid artifacts but lacks a valid completion trailer.
- A later step appears complete while an earlier step is failed, killed, interrupted, or superseded.
- The branch contains unrelated user edits alongside step-owned changes.
- The doctor reaches its attempt budget without a safe resolution.
- The nudge action is requested after branch state changes between display and execution.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST maintain a durable on-disk session manifest at `<worktree>/.concierge/session-manifest.json` as the authoritative ledger for session attempt state; step completion still requires reconciled manifest, branch trailer, and artifact evidence.
- **FR-002**: System MUST record each step as one or more attempts using the statuses `pending`, `running`, `pass`, `failed`, `killed`, and `interrupted`.
- **FR-003**: System MUST preserve for each attempt its supersession link, branch state before and after execution, completion commit evidence, full spawn recipe, captured assistant identifiers, log reference and checksum, terminal result, anomalies, and interventions.
- **FR-004**: System MUST write manifest changes atomically and durably so a crash cannot leave a partially written manifest as valid state.
- **FR-005**: System MUST treat deterministic code as the only authority that can write files, manifest state, commits, completion trailers, failed markers, and terminal completion.
- **FR-006**: System MUST reconcile step state from the manifest, branch completion evidence, and required on-disk artifacts before marking a step passed.
- **FR-007**: System MUST prevent a step from being marked passed when any required source of durable evidence disagrees.
- **FR-008**: System MUST reconcile before completion commits are written and again after completion commits are written.
- **FR-009**: System MUST invoke every step agent through the unified print-mode command contract `copilot -p --agent speckit.<step> --output-format json --session-id <uuid> --log-dir <dir>`.
- **FR-010**: System MUST retire ACP as the execution transport for step agents.
- **FR-011**: System MUST resume multi-turn clarification work through the same assistant session identity used for the original clarification attempt.
- **FR-012**: System MUST capture assistant session, message, and turn identifiers from all parseable step output events.
- **FR-013**: System MUST replace head-only completion idempotency with a branch-history search that compares the step-owned artifact snapshot for the relevant step.
- **FR-014**: System MUST adopt an existing valid completion commit when branch history proves that the step-owned artifact snapshot already matches intended completion.
- **FR-015**: System MUST take a step-owned path snapshot at step start and use it to distinguish intended step changes from unrelated branch changes.
- **FR-016**: System MUST block completion when dirty-diff gates detect unrelated, ambiguous, or unsafe changes.
- **FR-017**: System MUST record failed markers with stranded artifact details when a step cannot be safely reconciled.
- **FR-018**: System MUST provide deterministic guarded recovery for the safe recovery catalog before escalating to the doctor, under the Run 13 constitution exception: unambiguous step-owned artifact relocation, duplicate/out-of-order valid completion adoption, failed-marker refresh with stranded artifacts, unrelated-file revert only when a safe restore point is proven, active-step cancellation from observed process state, and pinned-context restart only after explicit user confirmation or an approved guarded doctor request. Recovery MUST append audit records and return to reconciliation, and MUST NOT silently re-run a step, mark completion directly, or write completion trailers outside hook ownership.
- **FR-019**: System MUST classify watchdog and transcript anomalies without allowing the classifier to mark completion or mutate authoritative state.
- **FR-020**: System MUST expose exactly these read-only doctor tools: `readFeatureJson`, `readManifest`, `gitStatusDiff`, `readTrailers`, `readArtifacts`, and `readTranscript`.
- **FR-021**: System MUST expose exactly these guarded doctor tools: `relocateArtifact`, `reRunStepWithPinnedContext`, `issueCorrectionPrompt`, `revertUnrelatedFiles`, `markFailedWithStrandedArtifacts`, and `cancelActiveStep`.
- **FR-022**: System MUST require every mutating doctor tool to re-read current disk truth at execution time, validate preconditions, be idempotent by anomaly identifier, and append an audit record before returning control to reconciliation.
- **FR-023**: System MUST forbid the doctor from directly marking steps complete, writing trailers, performing raw file or branch operations, widening step contracts, guessing on unresolved ambiguity, or exceeding two attempts per step.
- **FR-024**: System MUST keep the deterministic core fully usable without the doctor enabled or invoked.
- **FR-025**: System MUST reveal the nudge action only when a step is terminal-stuck and no successful automatic remediation has happened.
- **FR-026**: System MUST compute the nudge action's intended branch shape from durable manifest state, selected feature directory, step contracts, completion evidence, and trailers.
- **FR-027**: System MUST allow the nudge flow to repair unambiguous discrepancies through guarded deterministic actions and require human escalation for ambiguous discrepancies.
- **FR-028**: System MUST preserve existing resume reconstruction, maximum reached step advancement, navigation-loop prevention, graceful failed-step resume, branch-null routing gates, and Windows-conditional behavior.
- **FR-029**: System MUST maintain and expose, through both renderer bridge and localhost HTTP API, a complete audit trail for anomalies, doctor recommendations, guarded tool invocations, deterministic recoveries, nudge actions, and human escalations.
- **FR-030**: System MUST preserve this 11-milestone build order for planning and task decomposition: (1) sessionManifestStore with atomic writes and anomaly/intervention records, (2) stepContracts hardening and step-start owned-path snapshots, (3) branch-history commitStep idempotency, (4) sessionReconciler, (5) deterministic dirty-diff gates and failed markers with stranded-artifact detail, (6) guarded relocateArtifact tool, (7) deterministic watchdog and transcript classifier, (8) bounded 12-tool doctor harness, (9) doctor agent instructions, (10) facilitator integration, and (11) nudge button/reconcileBranchToIntendedShape.

### Key Entities *(include if feature involves data)*

- **Session Manifest**: Durable per-worktree ledger that represents the authoritative attempt state of a Spec Kit session, including all step attempts, anomalies, interventions, and audit records. Completion authority is the reconciled agreement of manifest, branch trailer evidence, and step-owned artifacts.
- **Step Attempt**: One execution attempt for a pipeline step, including status, branch evidence, invocation details, captured assistant identifiers, log references with checksum, and terminal result.
- **Step-Owned Artifact Snapshot**: The set and content identity of files a step is responsible for producing or modifying, used for reconciliation and commit idempotency.
- **Anomaly**: A deterministic finding that durable evidence does not match expected step state or branch shape.
- **Intervention**: A guarded deterministic action taken to resolve or document an anomaly.
- **Doctor Tool Invocation**: A bounded request from the LLM doctor to a deterministic read-only or guarded mutating tool.
- **Nudge Request**: A user-initiated reconciliation attempt for terminal-stuck sessions after automatic remediation fails.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In validation runs covering normal completion, interrupted execution, duplicate completion evidence, misplaced artifacts, unrelated edits, and resume after restart, 100% of passed steps have matching manifest, branch, and artifact evidence.
- **SC-002**: Resume reconstruction restores the correct current step and terminal status in at least 99% of a 100-case interrupted or restarted session fixture corpus without relying on transient UI state.
- **SC-003**: Duplicate or out-of-order completion commits are prevented or adopted correctly in 100% of tested branch-history idempotency cases.
- **SC-004**: The safe recovery catalog is resolved automatically in at least 90% of a 20-case fixture corpus covering safe and unsafe recovery classes without invoking the doctor.
- **SC-005**: In doctor-assisted scenarios, 100% of authoritative state changes are made by deterministic guarded tools and followed by reconciliation before the user sees completion.
- **SC-006**: The nudge action appears in 0% of healthy or actively recoverable sessions and appears in 100% of terminal-stuck sessions that meet the manual escape-hatch criteria.
- **SC-007**: Users can inspect a complete anomaly and intervention audit trail for any failed, remediated, or nudged step in under 30 seconds.
- **SC-008**: Existing regression cases for resume, maximum reached step advancement, navigation-loop prevention, failed-step resume, branch-null routing, and Windows-conditional behavior continue to pass after the feature is introduced.

## Assumptions

- The six-step pipeline remains Specify, Clarify, Plan, Tasks, Analyze, and Review.
- Each session continues to run in one isolated worktree.
- The manifest location is scoped to the worktree so branch/session evidence travels with the session workspace.
- Existing step contracts remain the basis for determining required artifacts and step-owned paths.
- The doctor is additive and off the happy path; deterministic execution and reconciliation remain sufficient for normal successful runs.
- Ambiguous recovery decisions should escalate rather than guess, even when that leaves a step failed or terminal-stuck.
- The hybrid manifest architecture seed is authoritative for planning: the core is deterministic, reconciliation is strict, ACP is removed from step execution, print-mode is unified, deterministic code is the sole writer and authority, the doctor only reads and invokes bounded guarded tools, and the nudge appears only for terminal-stuck sessions after automatic remediation fails.
