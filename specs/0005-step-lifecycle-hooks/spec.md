# Feature Specification: Run 5 Step Lifecycle & Hook Infrastructure

**Feature Branch**: `spec/0005-step-lifecycle-hooks`

**Created**: 2026-05-27

**Status**: Draft

**Input**: User description: "Run 5: Step Lifecycle & Hook Infrastructure, preserving the resolved grill decisions in `specs/0005-step-lifecycle-hooks/grill.md` as source of truth."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Own every Spec Kit step lifecycle seam (Priority: P1)

As a Concierge maintainer, I need every supported Spec Kit step to enter and exit through named before/after hooks with a shared artifact manifest, so the app has one deterministic lifecycle spine before product journey UI begins.

**Why this priority**: Principle VII makes step lifecycle ownership non-negotiable. This is the Run 5 foundation that all later Specify, Clarify, Plan, Tasks, Analyze, Review, and vertical journey work depends on.

**Independent Test**: Can be fully tested by registering and dispatching all twelve lifecycle hooks for the six steps and verifying that each hook resolves to the sanctioned per-step file, consults the manifest, and emits the required lifecycle activity without adding product UI.

**Acceptance Scenarios**:

1. **Given** `.specify/extensions.yml` is loaded, **When** hook registrations are inspected, **Then** all `before_<step>` and `after_<step>` hooks for specify, clarify, plan, tasks, analyze, and review point at the dispatcher.
2. **Given** the dispatcher receives any registered before or after hook invocation, **When** the step and phase are recognized, **Then** it routes to the corresponding named hook file and records a structured lifecycle event.
3. **Given** a hook needs expected artifact information, **When** it reads the artifact manifest, **Then** it receives the grill-locked required files, optional files, plan context-file exception, and analyze empty-commit allowance for that step.

---

### User Story 2 - Validate and commit step artifacts safely (Priority: P1)

As a Concierge maintainer, I need each step's completed artifacts to pass a Step Contract factory before a Concierge Step Commit is written, so resume, recovery, and downstream work rely on verified disk state instead of logs or implicit assumptions.

**Why this priority**: Principle VIII requires step contracts, and Principle VII requires Step Commit trailers with pre-commit hooks honored. Without this, later vertical slices cannot prove or resume completed work.

**Independent Test**: Can be fully tested by supplying valid and invalid artifacts to each of the six factories, confirming the standard rejection floor, then verifying that successful results produce trailer commits that honor repository hooks and never bypass verification.

**Acceptance Scenarios**:

1. **Given** a step has all required artifacts in the feature directory, **When** its factory validates the artifacts, **Then** it returns a successful Step Commit candidate naming the step, status, files, and commit message intent.
2. **Given** a step artifact is missing, malformed, or contains unexpected disk-input keys, **When** its factory validates the artifacts, **Then** it returns a Step Escape Hatch reason rather than silently accepting the output.
3. **Given** a successful Step Commit is written, **When** commit history is inspected, **Then** the latest commit contains exactly one `Concierge-Step: <step>:<status>` trailer and repository pre-commit hooks were allowed to run.
4. **Given** the analyze step produces no file diff, **When** its successful Step Commit is written, **Then** a trailer-bearing empty commit is still allowed so resume history remains unbroken.

---

### User Story 3 - Restore, resume, and recover steps deterministically (Priority: P1)

As a user returning to a repository, I need Concierge to restore step progress from committed trailers and in-flight markers without interrupting me, so a crash or dirty workspace does not corrupt or hide step state.

**Why this priority**: Deterministic resume and the Step Escape Hatch are the recovery mechanisms that keep the product story credible once real user journeys start in Runs 6-9.

**Independent Test**: Can be fully tested by changing the active repository, providing trailer history and marker files, and verifying that the steps slice reaches the correct three-state values while dirty resume stays silent and recoverable.

**Acceptance Scenarios**:

1. **Given** the active workspace changes, **When** Concierge reads Concierge-Step trailer history, **Then** the most recent trailer for each step wins and maps to `not_available`, `pending`, or `complete` according to the grill-locked mapping.
2. **Given** a step has uncommitted expected artifacts and an in-flight marker, **When** a session resumes, **Then** Concierge logs `workspace-dirty-resume`, keeps the user flow uninterrupted, and treats the step as pending work for recovery purposes.
3. **Given** a failure mode requires Step Escape Hatch, **When** the hatch is triggered, **Then** the active turn is cancelled, expected artifacts are reverted to the last Step Commit, and the step state resets to `not_available` for manual retry.
4. **Given** the first vertical tracer bullet starts with an empty steps slice, **When** `steps/restored` fires for specify with `complete`, **Then** specify reaches `complete` monotonically and no unrelated slice changes.

---

### User Story 4 - Enforce Clarify rigor and bounded re-ask (Priority: P2)

As a Concierge user answering clarification questions, I need malformed Clarify questions to remain visible while Concierge asks the step agent to rewrite only the broken question, so I am never left with hidden or silently corrupted HITL choices.

**Why this priority**: Clarify is the only intra-step HITL flow in this run's constitutional scope. Its rigor mandate is load-bearing but can be tested after the core lifecycle spine exists.

**Independent Test**: Can be independently tested by feeding well-formed and malformed clarification output through the Clarify factory and listener routing, verifying visible malformed rendering, per-question re-ask prompts, and the three-attempt bound before escape.

**Acceptance Scenarios**:

1. **Given** a Clarify question has empty text, too few choices, missing choice labels, missing short-answer affordance, parser-breaking emphasis, or inconsistent line endings, **When** the Clarify factory validates it, **Then** the malformed question is reported with its reason and remains visible to the UI.
2. **Given** one Clarify question is malformed and others are well-formed, **When** the listener handles the malformation action, **Then** it prompts the agent to rewrite only the malformed question and preserves the well-formed questions.
3. **Given** the same question fails rewrite validation three times, **When** the retry bound is reached, **Then** Concierge triggers Step Escape Hatch with `clarify-rigor-exhausted`.

---

### User Story 5 - Surface lifecycle drift and hangs without blocking work (Priority: P3)

As a power user or maintainer, I need lifecycle drift, activity, and suspected hangs to appear in structured logs and activity history without automatic failure, so long-running agents remain observable while the app avoids false-negative interruptions.

**Why this priority**: Observability and drift warnings are required to make the scaffold operable, but they do not block the core hook, contract, and recovery path.

**Independent Test**: Can be independently tested by starting the app with agent files, streaming ACP events, simulating 20 minutes of ACP silence, and checking that structured activity is recorded with no automatic step failure.

**Acceptance Scenarios**:

1. **Given** installed Spec Kit agent files declare outputs that differ from the manifest, **When** the app starts, **Then** Concierge logs and records `agent-manifest-drift` as a warning without preventing startup.
2. **Given** ACP stream activity is flowing, **When** transcript capture receives stream events, **Then** activity entries and the latest ACP event timestamp are updated.
3. **Given** no ACP stream event has occurred for 20 minutes, **When** the 30-second hang check runs, **Then** Concierge records `hang-suspected` as a soft notification and does not auto-fail the step.

---

### Edge Cases

- Hook dispatch rejects unrecognized step names or phases without falling through to the wrong hook file.
- Missing optional Specify checklist output does not fail Specify, while missing required artifacts fail their owning step contract.
- Plan is the only step permitted to include the Bound-CLI context file outside the feature directory during commit or revert.
- Analyze is the only step permitted to write an empty trailer commit when there is no artifact diff.
- `complete` is terminal during a session except through Step Escape Hatch reset; no direct transition from `complete` to `pending` is allowed.
- Trailer statuses `fail` and `skipped` restore as `not_available`, not as distinct renderer states.
- In-flight marker files persist across app crashes and are removed only after Step Commit success.
- Dirty workspace resume never displays a toast, modal, or banner; it is visible only through info-level logs and activity history.
- Pre-commit hook rejection is treated as hook failure and routes through Step Escape Hatch with hook output surfaced.
- Clarify re-ask retry counts are tracked per malformed question, not globally across all questions.
- Malformed Clarify output is never hidden merely because it failed validation.
- Agent-manifest drift is warn-not-fail even when upstream Spec Kit agent files change unexpectedly.
- Hang detection is based on ACP stream silence only, uses the 20-minute threshold, and never auto-cancels or auto-retries.
- Run 5 must not redo Run 2 data-layer, Run 3 ACP supervisor, or Run 4 IPC/listener/slice scaffolding.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a manifest of expected artifacts for specify, clarify, plan, tasks, analyze, and review matching the grill-locked shape: specify requires `spec.md` and may include `checklists/requirements.md`; clarify requires `clarifications.md`; plan requires `plan.md` and `research.md` and has the context-file exception; tasks requires `tasks.md`; analyze requires `analyze.md` and allows empty commits; review has no required artifact files.
- **FR-002**: The system MUST register all twelve lifecycle hooks in `.specify/extensions.yml`: `before_specify`, `after_specify`, `before_clarify`, `after_clarify`, `before_plan`, `after_plan`, `before_tasks`, `after_tasks`, `before_analyze`, `after_analyze`, `before_review`, and `after_review`.
- **FR-003**: The system MUST route all registered lifecycle hooks through a single dispatcher to one named hook file per step and phase.
- **FR-004**: The system MUST provide six before-hook files and six after-hook files named according to the grill decision for specify, clarify, plan, tasks, analyze, and review.
- **FR-005**: Before-hook success MUST move the step from `not_available` to `pending`, write the in-flight marker, and emit structured lifecycle activity.
- **FR-006**: After-hook success MUST validate expected artifacts, write the Step Commit, remove the in-flight marker, move the step from `pending` to `complete`, and emit structured lifecycle activity.
- **FR-007**: The in-flight marker MUST live at `userData/in-flight/${sessionId}/${step}.marker` and contain JSON with the step, start time, session id, and expected artifacts.
- **FR-008**: The system MUST provide six Step Contract factories, one each for specify, clarify, plan, tasks, analyze, and review.
- **FR-009**: Each Step Contract factory MUST return either a successful Step Commit candidate or a Step Escape Hatch reason.
- **FR-010**: Step Escape Hatch reasons MUST cover factory rejection, Bound CLI crash, ACP error, hook failure, and malformed clarify output.
- **FR-011**: Each Step Contract factory MUST include co-located tests meeting the seven-case trust-boundary floor, including rejection of extra keys on disk-derived inputs.
- **FR-012**: The Step Commit writer MUST create real git commits with `Concierge-Step: <step>:<status>` trailers and MUST honor repository pre-commit hooks.
- **FR-013**: The Step Commit writer MUST NOT use or expose any bypass that skips repository verification hooks.
- **FR-014**: Analyze Step Commits MUST support the no-diff case while preserving trailer history.
- **FR-015**: The steps state machine MUST use exactly three states: `not_available`, `pending`, and `complete`.
- **FR-016**: The only ordinary in-session state progression MUST be `not_available` to `pending` to `complete`.
- **FR-017**: Step Escape Hatch MUST reset any step state to `not_available` after reverting expected artifacts.
- **FR-018**: Trailer restoration MUST map `pass` to `complete`, `pending` to `pending`, and `fail` or `skipped` to `not_available`.
- **FR-019**: Trailer restoration MUST use last-trailer-wins semantics per step.
- **FR-020**: The steps restoration listener MUST fire when `workspace.activeRepoPath` changes and dispatch restored step state without mutating unrelated slices.
- **FR-021**: Workspace Dirty Resume MUST be silent in the main UI and MUST log an info-level `workspace-dirty-resume` event with step and paths.
- **FR-022**: Step Escape Hatch MUST cancel the active turn, allow a 5-second graceful cancellation window before supervisor fallback, revert expected artifacts, and reset state for manual retry.
- **FR-023**: Plan Step Escape Hatch revert MAY include the Bound-CLI context file outside the feature directory and no other step may use that exception.
- **FR-024**: The Clarify factory MUST enforce non-empty trimmed question text, at least two well-formed choices with key and label, rendered short-answer affordance, no parser-breaking markdown emphasis at start of line, and consistent line endings.
- **FR-025**: Malformed Clarify questions MUST remain visibly represented to the UI rather than being silently hidden or discarded.
- **FR-026**: Clarify re-ask routing MUST occur through listener middleware that prompts the agent to rewrite the malformed question only.
- **FR-027**: Clarify re-ask MUST be bounded to three attempts per malformed question before Step Escape Hatch with `clarify-rigor-exhausted`.
- **FR-028**: Transcript capture MUST record ACP stream events into the activity slice and maintain the latest ACP event timestamp.
- **FR-029**: Hang detection MUST trigger after 20 minutes of ACP stream silence, check every 30 seconds, emit `hang-suspected`, and never auto-fail a step.
- **FR-030**: Startup drift verification MUST parse installed Spec Kit agent files, compare declared outputs against the manifest, and warn plus record activity on drift without failing startup.
- **FR-031**: Step lifecycle structured logs MUST use the grill-locked event names and include step, session id, optional latency, optional reason, and optional trailer as applicable.
- **FR-032**: Activity filtering for step lifecycle events MUST integrate through transcript capture and preserve the Run 4 activity cap.
- **FR-033**: The project MUST document Run 5 conventions in ADRs and Copilot instructions, including hook layout, factory paths, state vocabulary, trailer mapping, clarify re-ask routing, and in-flight marker path.
- **FR-034**: Final verification tasks MUST extend the Run 4 T167-T169 pattern with executable assertions for Run 5 state-machine invariants, drift verifier presence, 20-minute hang threshold, and trailer commits honoring hooks.
- **FR-035**: The first implementation test for this feature MUST be the vertical tracer bullet: empty steps slice, restored specify `complete`, monotonic transition to `complete`, and no unrelated slice change.
- **FR-036**: Run 5 MUST introduce zero new runtime dependencies.
- **FR-037**: Run 5 MUST NOT introduce product UI for Step Escape Hatch, product UI for hang notification, Specify/Clarify/Plan/Tasks/Analyze UI flows, an HTTP API, MCP integration, Jira submission UI, or Windows packaging changes.
- **FR-038**: Run 5 MUST build on the completed Run 2 data layer, Run 3 ACP supervisor, and Run 4 slice/listener/IPC scaffolding without re-authoring those foundations.

### Key Entities *(include if feature involves data)*

- **Step**: One of the six lifecycle stages: specify, clarify, plan, tasks, analyze, or review.
- **Step Artifact Manifest**: The sanctioned expected-output catalog for each step, including required files, optional files, and step-specific exceptions.
- **Lifecycle Hook**: A before or after step integration point that validates prerequisites, reads artifacts, coordinates state, and records lifecycle activity.
- **Step Contract Factory**: A trust-boundary validator for one step's artifacts that returns either a commit candidate or an escape-hatch reason.
- **Concierge Step Commit**: A verified git commit carrying a `Concierge-Step` trailer that proves a step state for deterministic restore.
- **Step State**: Renderer state for a step, limited to `not_available`, `pending`, and `complete`.
- **Step Escape Hatch**: The canonical recovery path that cancels active work, reverts expected artifacts, resets state, and allows manual retry.
- **In-flight Marker**: Crash-recovery marker at `userData/in-flight/${sessionId}/${step}.marker` describing a step that started but has not committed.
- **Clarify Question**: A HITL question with text, choices, short-answer affordance, parser-safe formatting, and line-ending consistency requirements.
- **Clarify Re-ask Attempt**: A bounded rewrite request for a malformed Clarify question, tracked per question up to three attempts.
- **Agent Manifest Drift Record**: A warning and activity entry indicating installed Spec Kit agent outputs differ from the expected-artifact manifest.
- **Lifecycle Activity Event**: Structured activity/log event for hook, prompt, commit, recovery, dirty-resume, drift, or hang observation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 12 of 12 required lifecycle hooks are registered and routed through the dispatcher to the correct named hook file.
- **SC-002**: 6 of 6 Step Contract factories exist with co-located seven-case-floor tests, including extra-key rejection for disk-derived inputs.
- **SC-003**: 100% of supported steps use only `not_available`, `pending`, and `complete`, and tests cover every allowed transition plus rejected or reset paths.
- **SC-004**: Trailer restoration tests prove last-trailer-wins behavior for all 6 steps and the full `pass`, `pending`, `fail`, and `skipped` mapping.
- **SC-005**: Step Commit verification proves pre-commit hooks are honored, no hook-bypass flag is used, and analyze can preserve trailer history with no artifact diff.
- **SC-006**: Clarify rigor tests cover all 5 mandated validation rules, visible malformed output, successful per-question re-ask, and the 3-attempt exhaustion path.
- **SC-007**: Crash recovery tests prove marker write on before-hook success, marker removal on Step Commit success, and marker persistence across simulated app restart.
- **SC-008**: Hang detection tests prove no `hang-suspected` event before 20 minutes of ACP stream silence and one soft activity notification at or after the threshold.
- **SC-009**: Drift verification tests prove startup drift is logged and recorded as activity without blocking app startup.
- **SC-010**: Lint, typecheck, coverage, and end-to-end verification all exit successfully before Run 5 is considered complete.
- **SC-011**: Test coverage grows to at least 600 tests while existing smoke and ACP proof paths continue to pass.
- **SC-012**: All Run 5 documentation deliverables are present: ADR-0008, ADR-0009, and the Copilot instructions convention block.
- **SC-013**: 0 new runtime dependencies and 0 out-of-scope product UI, HTTP API, MCP, Jira UI, or Windows packaging changes are introduced.

## Assumptions

- Runs 2, 3, and 4 are complete and merged to main, including the data-layer git and filesystem helpers, ACP supervisor/session infrastructure, typed but mostly empty slices, listener files, IPC infrastructure, and structured logging discipline.
- The target feature directory is explicitly resolved from the existing Run 5 grill location as `specs/0005-step-lifecycle-hooks/`, independent of the generated git branch `spec/0005-step-lifecycle-hooks`.
- `specs/0005-step-lifecycle-hooks/grill.md` is the source of truth when it differs from abbreviated command input, prior draft thinking, or branch numbering.
- Constitution Principle VII and Principle VIII are load-bearing for this run; violating either fails the product story rather than becoming a minor implementation defect.
- Run 5 is an architecture-spine and lifecycle-infrastructure feature, so this specification names sanctioned artifact paths and externally verifiable file surfaces while deferring internal implementation design to planning.
- The activity slice remains the power-user surface for lifecycle observations in Run 5; visible product UI affordances for retry, hang notification, and step journeys are deferred to later vertical runs.

## Deviations from grill

None. This specification follows `specs/0005-step-lifecycle-hooks/grill.md` as the source of truth. No deliverable is deferred or split from the grill-locked Run 5 scope.
