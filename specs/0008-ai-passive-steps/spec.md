# Feature Specification: Run 8 AI-Passive Steps Vertical

**Feature Branch**: `spec/0008-ai-passive-steps`

**Created**: 2026-05-29

**Status**: Draft

**Input**: User description: "AI-Passive Steps Vertical: Plan + Tasks + Analyze. The user watches Plan, Tasks, and Analyze run passively after Specify/Clarify. Build the spec for shipped app behavior, not implementation tasks."

## Clarifications

### Session 2026-05-29

- Q1: Markdown engine extent -> B: Render markdown with `react-markdown`, `rehype-sanitize`, and `remark-gfm` only; do not add `rehype-raw`, syntax highlighting, or raw HTML rendering.
- Q2: Step terminal event artifact payload -> B: Include a compact artifact/remediation manifest summary plus `commitSha`; detailed artifact content remains separate.
- Q3: Navigation during passive execution -> A: Continue running in the background while navigation changes; stepper and activity remain authoritative.
- Q4: Status row model -> C: Use a typed artifact/milestone row union so Plan, Tasks, and Analyze can show different evidence rows through one status surface.
- Q5: Plan artifact contract -> B: Require `plan.md` and `research.md`; discover optional `data-model.md`, `contracts/*`, and `quickstart.md`; keep the Copilot context-file exception.
- Q6: Analyze artifact contract -> B: Analyze validates remediation targets limited to `spec.md`, `plan.md`, and `tasks.md`, allows an empty Step Commit, and does not require `analyze.md`.
- Q7: Artifact viewer kinds -> B: Artifact evidence uses a discriminator covering text, markdown, code, image, and PDF metadata.
- Q8: Artifact fetch timing -> A: Fetch artifact content only when the user clicks an evidence affordance.
- Q9: Task detail depth -> B: Parse task id, title, phase/area, dependencies, files, acceptance notes, and estimate when present.
- Q10: Hang notification -> B: Show a visible soft notification with Cancel/Restart guidance; never auto-fail or auto-retry.
- Q11: Artifact channel naming -> A: Keep the shipped plural `artifacts:read` wording and update Run 8 docs/specs to match.
- Q12: Passive pipeline sharing -> B: Use a small shared passive-step registration helper for Plan, Tasks, and Analyze only; do not refactor Specify or Clarify.
- Q13: Visual contract count -> B: Add exactly 10 new visual screens for Run 8 while preserving the existing 27 screens.
- Q14: Markdown rendering performance -> A: Use plain markdown rendering initially with a size guard; defer virtualization.
- Q: What text size threshold defines an oversized artifact? → A: 512 KiB
- Q: What observability evidence must passive steps emit? → A: IPC, ACP, lifecycle, errors, transcripts

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Watch Plan produce planning evidence (Priority: P1)

As a Concierge user who has completed Specify and Clarify, I need to start Plan and watch it produce planning evidence without driving the conversation, so I can trust that planning artifacts are valid before tasks are generated.

**Why this priority**: Plan is the first passive step and the source of downstream design and task context. If Plan cannot be watched and validated, Tasks and Analyze cannot be trusted.

**Independent Test**: Can be tested by opening a session with Specify and Clarify complete, starting Plan, observing passive progress rows from streamed text/thought/tool activity, and seeing a pass result with required artifacts and a Step Commit identity.

**Acceptance Scenarios**:

1. **Given** Specify and Clarify are complete and Plan is pending, **When** the user starts Plan, **Then** the Plan body replaces the placeholder with a status surface showing Plan is running and the activity stream reflects passive progress.
2. **Given** Plan streams text chunks, thought chunks, tool calls, and tool call updates, **When** those events arrive, **Then** the UI treats them as progress evidence without requiring the user to answer prompts.
3. **Given** Plan completes with valid artifacts, **When** lifecycle validation and Step Commit succeed, **Then** the user sees required rows for `plan.md` and `research.md`, optional discovered rows for available `data-model.md`, `contracts/*`, and `quickstart.md`, the context-file exception when present, and the returned commit identity.
4. **Given** Plan does not provide reliable terminal usage or cost metadata, **When** Plan reaches a valid pass state, **Then** absence of usage/cost data does not block completion and the UI omits or labels that metadata as unavailable.

---

### User Story 2 - Watch Tasks and inspect parsed task details (Priority: P1)

As a Concierge user, I need to watch Tasks generate `tasks.md` and inspect task-level details, so I can understand the implementation sequence before work begins.

**Why this priority**: Tasks is the actionable bridge from planning to execution. Users need more than a raw artifact link; they need readable task rows with dependencies and acceptance context.

**Independent Test**: Can be tested by running Tasks after a valid Plan, waiting for completion, opening task details for at least one parsed task, and verifying id, title, phase/area, dependencies, files, acceptance notes, and estimate are presented when available.

**Acceptance Scenarios**:

1. **Given** Plan is complete and Tasks is pending, **When** the user starts Tasks, **Then** the Tasks body shows passive running state and task-generation milestones without requiring manual input.
2. **Given** Tasks completes with a valid `tasks.md`, **When** the user opens a task detail row, **Then** the detail view shows the parsed task id, title, phase/area, dependency references, related files, acceptance notes, and estimate when those fields exist.
3. **Given** `tasks.md` is malformed or contains unresolved dependencies, **When** validation runs, **Then** Tasks does not show a false pass state and the user sees an actionable failure tied to the malformed task content.
4. **Given** duplicate terminal completion is attempted, **When** the first terminal result has already been accepted, **Then** later terminal attempts are ignored or reported as duplicates without changing the accepted Tasks outcome.

---

### User Story 3 - Watch Analyze validate remediation or no-diff pass (Priority: P1)

As a Concierge user, I need Analyze to inspect the completed spec, plan, and tasks without inventing a separate report artifact, so I can see whether remediation happened or that no changes were needed.

**Why this priority**: Analyze is the passive quality gate before Review. It must be non-destructive, bounded, and auditable even when it produces no diff.

**Independent Test**: Can be tested by running Analyze after Tasks, verifying it reports searched/validated milestones, accepts no-diff completion with a Step Commit identity, and rejects remediation outside the allowed artifact set.

**Acceptance Scenarios**:

1. **Given** Tasks is complete and Analyze is pending, **When** the user starts Analyze, **Then** the Analyze body shows passive progress milestones and does not ask the user to edit content manually.
2. **Given** Analyze finds no required remediation, **When** lifecycle validation completes, **Then** Analyze may pass with an empty Step Commit and visible proof rather than requiring an `analyze.md` artifact.
3. **Given** Analyze remediates allowed files, **When** validation completes, **Then** only changes to `spec.md`, `plan.md`, and `tasks.md` are accepted and summarized.
4. **Given** Analyze attempts to change `analyze.md`, files outside the active feature directory, source code, or unrelated artifacts, **When** validation runs, **Then** Analyze fails through the standard recovery path and does not mark the step complete.

---

### User Story 4 - View evidence artifacts on demand (Priority: P1)

As a Concierge user, I need to open evidence artifacts only when I ask for them, so the passive step screen stays fast while still letting me inspect proof.

**Why this priority**: Plan and Tasks can produce large markdown and contract files. Lazy evidence viewing protects performance while preserving transparency.

**Independent Test**: Can be tested by completing a passive step, clicking an evidence affordance, and verifying the artifact viewer handles markdown, text/code, image/PDF metadata, oversized files, binary files, hostile markdown input, and missing optional artifacts appropriately.

**Acceptance Scenarios**:

1. **Given** a status row has a validated artifact path, **When** the user clicks its evidence affordance, **Then** the app fetches the artifact content or metadata at that moment and opens an accessible viewer.
2. **Given** the artifact is markdown with tables, task lists, code fences, links, blockquotes, nested lists, or inline code, **When** it renders, **Then** those structures are readable and hostile raw HTML is stripped.
3. **Given** the artifact is oversized or binary, **When** the user opens it, **Then** the viewer shows safe metadata, kind, size, and available actions without attempting unsafe or expensive inline rendering.
4. **Given** an optional Plan artifact is absent, **When** the Plan pass state is displayed, **Then** the row is omitted or marked not produced without failing the step.

---

### User Story 5 - Stay informed during long-running passive steps (Priority: P2)

As a Concierge user, I need a visible notification when a passive step appears silent for a long time, so I can decide whether to keep waiting, cancel, or restart without the app making that decision for me.

**Why this priority**: Real ACP transcript probes showed Plan and Tasks can stream for long periods or fail to provide a clean terminal result. Users need guidance without unsafe auto-failure.

**Independent Test**: Can be tested by simulating an in-flight Plan, Tasks, or Analyze step with at least 20 minutes of ACP stream silence and verifying a deduped visible notification with guidance appears while the step remains in progress.

**Acceptance Scenarios**:

1. **Given** a passive step is in flight and no ACP stream event has arrived for the configured silence threshold, **When** hang detection fires, **Then** the app shows a visible soft notification and activity entry with Cancel/Restart guidance.
2. **Given** the hang notification appears, **When** the user takes no action, **Then** the step remains in progress and is not automatically failed, retried, or canceled.
3. **Given** stream activity resumes after a hang notification, **When** new progress arrives, **Then** the user can continue watching without duplicate hang notifications for the same silent interval.

---

### User Story 6 - Preserve architecture and visual fidelity (Priority: P2)

As a Concierge maintainer, I need Run 8 to extend the existing passive-step architecture and design language without adding a ninth renderer slice or regressing prior screens, so Plan, Tasks, and Analyze remain maintainable and visually consistent.

**Why this priority**: Run 8 touches streaming, artifacts, factories, lifecycle hooks, markdown rendering, and visual contracts. Architectural drift would make later Review/JIRA work harder.

**Independent Test**: Can be tested by reviewing the Run 8 inventory: Plan/Tasks/Analyze use the passive-step pattern, state remains in existing slices, artifacts use the plural read capability, visual coverage adds exactly 10 new screens, and the existing 27 visual screens do not regress.

**Acceptance Scenarios**:

1. **Given** Run 8 is complete, **When** renderer state ownership is inspected, **Then** Plan/Tasks/Analyze passive state extends existing session/pipeline state and does not create a ninth slice.
2. **Given** Run 8 streaming is implemented, **When** the three passive steps are inspected, **Then** they share the passive-step registration pattern while Specify and Clarify behavior remains unchanged.
3. **Given** visual-diff contracts run, **When** Run 8 screens are compared, **Then** exactly 10 new visual screens cover passive steps and viewers while all 27 inherited screens remain stable.

### Edge Cases

- ACP transcripts include `tool_call`, `tool_call_update`, text chunks, and thought chunks before, after, or without a clean terminal result.
- Plan or Tasks completes without reliable usage, token, or cost metadata.
- Plan produces required files plus optional `data-model.md`, `contracts/*`, `quickstart.md`, and `.github/copilot-instructions.md`; one or more optional Plan artifacts may be absent.
- Artifact evidence points to an oversized text file, binary file, image, PDF, missing file, moved file, or unsupported extension.
- The user navigates away from Plan, Tasks, or Analyze while the step is in flight.
- A passive step attempts to emit more than one terminal `done` result.
- Analyze produces an empty diff and still needs pass proof.
- Analyze attempts remediation outside `spec.md`, `plan.md`, and `tasks.md`.
- `tasks.md` contains duplicate ids, missing titles, malformed dependencies, unsupported phase/area headings, missing acceptance notes, or estimates in inconsistent formats.
- Markdown artifact content includes hostile raw HTML, scripts, event handlers, unsafe links, very large tables, task lists, nested lists, code fences, or blockquotes.
- `.specify/feature.json` pins an active feature directory that differs from the current branch name or the repository is on detached HEAD.
- Step Commit succeeds but artifact readback fails, or artifact readback succeeds but Step Commit fails.
- Evidence rows reference artifacts before lifecycle validation has accepted them.
- The activity history approaches the existing 256-entry cap during a long passive run.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST implement the shipped passive watching experience for Plan, Tasks, and Analyze after Specify and Clarify are complete.
- **FR-002**: Plan, Tasks, and Analyze MUST use the canonical step order `specify -> clarify -> plan -> tasks -> analyze -> review` and MUST NOT imply Review or JIRA submission behavior.
- **FR-003**: Each passive step MUST expose idle, running, pass, fail, and long-running/silent states in the step body, stepper, and activity stream.
- **FR-004**: Passive step progress MUST accept ACP text chunks, thought chunks, `tool_call`, and `tool_call_update` events as user-visible progress evidence.
- **FR-005**: Passive step completion MUST use progress events plus exactly one terminal `done` result per step attempt.
- **FR-006**: Passive step pass results MUST include a compact manifest/remediation summary and `commitSha`, and MUST NOT include full artifact bodies in the terminal event.
- **FR-007**: Missing usage, token, duration, or cost metadata MUST NOT block a passive step pass state; unavailable metadata MUST be omitted or clearly labeled unavailable.
- **FR-008**: Passive steps MUST continue running in the background when the user navigates elsewhere in the app, with current state visible through the stepper and activity stream.
- **FR-009**: Plan MUST require validated `plan.md` and `research.md` evidence before pass.
- **FR-010**: Plan MUST discover and summarize optional `data-model.md`, `contracts/*`, and `quickstart.md` evidence when present without failing when absent.
- **FR-011**: Plan MUST preserve the allowed Copilot context-file exception for `.github/copilot-instructions.md` when the plan agent updates the SPECKIT-marked section.
- **FR-012**: Tasks MUST require validated `tasks.md` evidence before pass.
- **FR-013**: Tasks MUST parse task id, title, phase/area, dependencies, files, acceptance notes, and estimate when present, and expose those details through a task detail view.
- **FR-014**: Tasks MUST reject malformed task structures that prevent stable task identity, dependency understanding, or safe user presentation.
- **FR-015**: Analyze MUST validate remediation targets limited to the active feature `spec.md`, `plan.md`, and `tasks.md`.
- **FR-016**: Analyze MUST NOT require or invent `analyze.md` as a pass artifact.
- **FR-017**: Analyze MUST allow a valid no-diff pass with an empty Step Commit so lifecycle trailer history remains unbroken.
- **FR-018**: Analyze MUST reject attempted remediation outside the allowed target set and MUST NOT mark Analyze complete after such rejection.
- **FR-019**: The active feature directory MUST be resolved from `.specify/feature.json` when present, even on detached HEAD or when branch naming differs from the feature directory.
- **FR-020**: Status rows MUST support a typed union of artifact rows and milestone rows so each passive step can show evidence appropriate to its artifact and remediation model.
- **FR-021**: Evidence affordances MUST remain disabled or clearly unavailable until the referenced artifact or milestone has passed lifecycle validation.
- **FR-022**: Artifact evidence MUST use a kind discriminator covering text, markdown, code, image, and PDF metadata.
- **FR-023**: Artifact content MUST be fetched only after the user explicitly opens that artifact evidence.
- **FR-024**: The artifact viewer MUST render markdown tables, task lists, fenced code classes, links, blockquotes, nested lists, headings, inline code, and plain text safely.
- **FR-025**: Markdown rendering MUST strip hostile raw HTML, scripts, and unsafe event-handler content and MUST NOT support raw HTML rendering in Run 8.
- **FR-026**: Markdown rendering MUST treat text, markdown, and code artifacts over 512 KiB as oversized metadata-only evidence instead of inline-renderable content.
- **FR-027**: Oversized, binary, image, and PDF artifacts MUST show safe metadata and available actions rather than unsafe inline rendering.
- **FR-028**: The user-facing artifact read capability name for Run 8 MUST remain the shipped plural `artifacts:read`.
- **FR-029**: A visible soft hang notification MUST appear when an in-flight passive step has ACP stream silence for at least 20 minutes.
- **FR-030**: Hang detection MUST NOT auto-fail, auto-cancel, or auto-retry the passive step.
- **FR-031**: Hang notifications MUST provide guidance for manual Cancel or Restart and MUST be deduped for a single silent interval.
- **FR-032**: Cancel from a passive step MUST route through the established Step Escape Hatch confirmation and recovery behavior.
- **FR-033**: Plan, Tasks, and Analyze MUST use strict Step Contract validation at the lifecycle boundary before pass is shown.
- **FR-034**: Passive-step trust-boundary factories MUST follow the seven-case floor: happy path, empty object named error, null named error, undefined named error, one hostile malformed case, one partial structurally plausible case, and extra-key rejection.
- **FR-035**: Runtime markdown dependencies for Run 8 MUST be exactly `react-markdown`, `rehype-sanitize`, and `remark-gfm`; no markdown raw-HTML, highlighting, icon, UI, or animation runtime dependency is added.
- **FR-036**: Passive-step state MUST extend the existing session slice/pipeline state and MUST NOT add a ninth renderer slice.
- **FR-037**: Plan, Tasks, and Analyze MAY share a small passive-step registration helper, but Run 8 MUST NOT refactor Specify or Clarify behavior as part of that sharing.
- **FR-038**: Smart containers MAY coordinate passive-step state, artifact fetches, and task detail fetches, while presentational passive-step components MUST receive data and callbacks as props.
- **FR-039**: The UI MUST meet WCAG 2.1 AA expectations for passive-step screens and viewers, including keyboard operation, focus management, accessible names, live status announcements, and no color-only state communication.
- **FR-040**: Run 8 MUST add exactly 10 new visual screens covering Plan, Tasks, Analyze, evidence/artifact viewing, task details, and hang notification states.
- **FR-041**: Run 8 MUST preserve the existing 27 visual screens without regression.
- **FR-042**: Passive-step activity MUST respect the existing 256-entry activity history cap.
- **FR-043**: Passive-step observability MUST capture IPC handler outcomes, ACP turn events, lifecycle transitions, errors, and local transcript references for Plan, Tasks, and Analyze.

### Key Entities *(include if feature involves data)*

- **Passive Step**: One of Plan, Tasks, or Analyze, with step identity, availability, current status, progress milestones, terminal outcome, and Step Commit proof.
- **Step Stream Event**: A progress or terminal event surfaced during passive execution, including text/thought/tool progress and exactly one terminal `done` result.
- **Artifact Manifest Summary**: A compact pass payload listing validated required artifacts, discovered optional artifacts, remediation targets, artifact kind metadata, and commit identity without full file bodies.
- **Status Row**: A typed row representing either an artifact evidence item or a milestone/progress item, including label, state, evidence availability, and optional viewer action.
- **Artifact Evidence**: A validated path or metadata record that can be opened on demand through the artifact viewer.
- **Task Detail**: A parsed task record from `tasks.md` with id, title, phase/area, dependencies, files, acceptance notes, and estimate when present.
- **Analyze Remediation Summary**: A bounded summary of changed or verified files among `spec.md`, `plan.md`, and `tasks.md`, including the no-diff pass case.
- **Hang Notification**: A visible soft warning tied to an in-flight passive step after prolonged ACP silence, with manual guidance and no automatic state transition.
- **Active Feature Pin**: The `.specify/feature.json` pointer that identifies the feature directory independently of branch name.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of valid Plan pass states show `plan.md`, `research.md`, discovered optional artifact summary, and commit identity before Plan is marked complete.
- **SC-002**: 100% of valid Tasks pass states expose at least task id and title for every parsed task, and expose phase/area, dependencies, files, acceptance notes, and estimate for tasks where those fields are present.
- **SC-003**: 100% of Analyze pass states either summarize allowed remediation targets or explicitly show a no-diff pass, and include commit identity without requiring `analyze.md`.
- **SC-004**: Users can open a validated artifact from a completed passive step in 2 clicks or fewer, and artifact content is not fetched before the open action.
- **SC-005**: 100% of hostile markdown samples containing scripts or raw HTML render without executable raw HTML while preserving supported tables, task lists, code, links, blockquotes, and nested lists.
- **SC-006**: During a simulated 20-minute ACP silence on Plan, Tasks, or Analyze, a visible soft notification appears within the next polling interval and the step remains in progress.
- **SC-007**: 100% of duplicate terminal result attempts preserve the first accepted terminal outcome and do not create a second completion state.
- **SC-008**: The visual-diff suite contains exactly 10 new Run 8 screens and the inherited 27 screens remain non-regressed.
- **SC-009**: 0 new renderer slices are added for Run 8 passive-step state.
- **SC-010**: 100% of passive-step lifecycle pass states occur only after strict artifact/remediation validation succeeds.
- **SC-011**: 100% of text, markdown, and code artifacts over 512 KiB open as metadata-only evidence without inline content rendering.
- **SC-012**: 100% of Plan, Tasks, and Analyze attempts emit observability records for IPC outcome, ACP turn activity, lifecycle transition, error path when present, and transcript reference when captured.

## Assumptions

- Specify and Clarify are already available from Runs 6 and 7; Run 8 starts from a session where those steps can complete.
- Plan, Tasks, and Analyze are user-observed passive steps; user editing of artifacts inside these step bodies is out of scope for Run 8.
- Review and JIRA submission remain future slices and are not implemented by this feature.
- Usage and cost metadata from ACP are opportunistic because captured transcripts did not expose reliable terminal usage/cost fields.
- Optional Plan artifacts are useful evidence when produced, but their absence is not a failure when required Plan artifacts are valid.
- The active feature pin in `.specify/feature.json` is the source of truth when it exists.
- The existing activity history cap remains 256 entries.
