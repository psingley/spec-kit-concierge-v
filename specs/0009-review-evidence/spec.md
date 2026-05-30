# Feature Specification: Run 9 Review & Evidence Vertical

**Feature Branch**: `spec/0009-review-evidence`

**Created**: 2026-05-30

**Status**: Draft

**Input**: User description: "Create the product specification for Run 9 Review & Evidence Vertical. Use branch spec/0009-review-evidence and existing feature directory specs/0009-review-evidence. Read and treat as locked inputs: specs/0009-review-evidence/grill.md and specs/0009-review-evidence/fixtures/pre-spec-probes.md. Include all 15 locked user decisions from the grill, Disk-Is-Truth centrality, the new review:evidence main-process channel, no Review commit, read-on-click evidence bodies, Analyze report capture as app-owned evidence outside the spec-kit artifact contract, Plan optional artifact discovery with manifest optional + disk discovery, 40-minute ACP stream-silence hang notice, Review developer fixture states, Review visual contracts, and the passive visual-contract retrofit. Keep the specification product-focused but concrete enough for planning. Do not ask questions unless a user-judgment issue remains after applying grill/roadmap/constitution. No runtime dependency additions. No ninth Redux slice."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Review trusted step evidence (Priority: P1)

After Specify, Clarify, Plan, Tasks, and Analyze have completed, a developer can open Review and see a single evidence summary that explains what was completed, which committed step trailers prove completion, and which on-disk artifacts are available for inspection. The surface treats disk and git history as the only evidence source; live in-memory state is not a Review evidence source.

**Why this priority**: Review is the terminal Concierge inspection surface. Its core value is giving the developer restart-proof confidence before any later JIRA or handoff flow.

**Independent Test**: Can be tested with a feature directory containing committed Concierge step trailers and artifacts; opening Review shows the same completion and artifact facts after an app restart.

**Acceptance Scenarios**:

1. **Given** a feature with passing committed trailers for prior steps and expected artifacts on disk, **When** the developer opens Review, **Then** the evidence summary lists each completed step, commit proof, artifact metadata, and any warnings from disk/git aggregation.
2. **Given** renderer session memory says a step is complete but disk history has no matching proof, **When** Review loads, **Then** Review does not present that step as authoritatively complete.
3. **Given** an evidence row references a markdown artifact or report, **When** the developer selects it, **Then** the body is read and displayed on click rather than preloaded into the Review summary.

---

### User Story 2 - Inspect clarifications, plan outputs, analyze evidence, and tasks (Priority: P1)

A developer can use Review to inspect resolved clarifications, Plan artifacts, Analyze results, and generated tasks without hunting through files. Review summarizes the committed Clarify answers from the feature specification, includes optional Plan artifacts that were actually produced, shows Analyze report evidence even when Analyze made no source changes, and offers a per-task expansion modal.

**Why this priority**: The terminal Review value depends on showing all decision and evidence material, including previously missing optional Plan and Analyze evidence.

**Independent Test**: Can be tested with fixtures containing Clarifications, optional Plan files, an app-owned Analyze report, an empty Analyze pass, and parsed tasks; Review displays each evidence type with correct required/optional status and task details.

**Acceptance Scenarios**:

1. **Given** the committed specification contains a Clarifications section with Q/A bullets, **When** Review loads, **Then** the resolved clarifications summary is populated from the committed specification.
2. **Given** Plan produced `data-model.md`, `quickstart.md`, and files under `contracts/`, **When** Review loads, **Then** those files appear as optional discovered Plan evidence and absent optional artifacts do not reduce the Plan status.
3. **Given** Analyze completed with an empty pass commit and an app-owned captured Markdown report, **When** Review loads, **Then** Analyze appears as a valid completion with report evidence and an explicit no-diff explanation.
4. **Given** generated tasks exist, **When** the developer opens a task from Review, **Then** a modal shows that task's details without changing the source task parser contract.

---

### User Story 3 - Navigate completed and pending work safely (Priority: P2)

A developer reviewing earlier completed steps sees a view-only treatment that prevents accidental mutation while preserving inspection actions. If work is still pending, the UI offers a clear `Resume {pending}` affordance that targets the active step when known, otherwise the first pending step in canonical order.

**Why this priority**: Review should support safe navigation around the stepper and prevent confusing dead ends while the single-running-step invariant remains unenforced.

**Independent Test**: Can be tested with completed, one-pending, and no-pending fixture states; the read-only banner, dimming, and resume target remain deterministic.

**Acceptance Scenarios**:

1. **Given** a completed non-Review step is viewed while later work is active or pending, **When** the step body renders, **Then** mutation controls are dimmed or disabled and artifact/evidence inspection remains available.
2. **Given** one step is actively running, **When** a completed read-only step is viewed, **Then** the resume affordance targets the running step.
3. **Given** no step is actively running and exactly one incomplete step exists in canonical sequence, **When** the resume affordance is shown, **Then** the UI targets that first incomplete step without adding a defensive multi-pending warning.

---

### User Story 4 - Distinguish long-running activity from silence (Priority: P2)

During passive step execution, developers are not told an agent is hung merely because it has run for a long time. The app only shows a no-recent-output notice after at least 40 minutes with no ACP stream activity, and any real stream activity resets the silence clock.

**Why this priority**: Prior 20-minute copy produced false alarm risk for legitimate long-running Plan work. Review evidence depends on trustworthy passive status and transcript capture.

**Independent Test**: Can be tested with streaming fixtures where activity continues past 40 minutes and with fixtures where stream activity stops for 40 minutes; only the latter shows the no-recent-output notice.

**Acceptance Scenarios**:

1. **Given** a passive step emits ACP stream activity for more than 40 minutes, **When** the step remains active, **Then** no hang warning appears.
2. **Given** no ACP stream activity occurs for 40 minutes or longer, **When** the passive step remains active, **Then** the UI shows a "still working / no recent output" notice without auto-failing, cancelling, or retrying the step.

---

### User Story 5 - Trust visual contracts for Review and passive states (Priority: P3)

Developers and reviewers can rely on visual contracts that exercise the real shipped component paths for Review and passive StatusStep states. Review contracts cover idle, populated, read-only, resume-bounce, and task-modal states; passive contracts are retrofitted away from synthetic injected markup and assert the real status counts, tags, evidence subtitles, and artifact actions.

**Why this priority**: Run 9 changes a terminal surface and also pays down a known visual-contract honesty gap from Run 8.

**Independent Test**: Can be tested by running visual fixtures that drive real app state for Review and passive screens rather than handcrafted markup.

**Acceptance Scenarios**:

1. **Given** Review developer fixture states for idle/unavailable, partial evidence, populated evidence, read-only bounce, resume target, and task modal, **When** visual contracts run, **Then** each fixture renders through the real Review surface.
2. **Given** passive step fixtures for idle, running, and done states, **When** visual contracts run, **Then** they exercise the shipped StatusStep path and validate status count/tag, evidence subtitle, and artifact action behavior.

### Edge Cases

- Review is opened before Analyze has a passing trailer: show Review as unavailable for the normal user journey while keeping developer fixture states for idle and partial evidence.
- Disk contains artifact paths but a selected body read fails: keep the summary visible and show a clear read failure for the selected item.
- Clarifications are absent from the committed specification: show an empty resolved-clarifications section without inventing answers from volatile state.
- Optional Plan artifacts are absent: mark them as not produced or omit them from produced-evidence lists without treating Plan as incomplete.
- The Analyze report is missing even though Analyze has a pass trailer: show the pass proof and a warning that report evidence is unavailable.
- An empty Analyze commit exists: treat it as valid completion and pair it with report/no-diff evidence so the UI does not look empty.
- Review evidence aggregation finds malformed trailers or unexpected statuses: show non-blocking warnings and avoid claiming unsupported completion.
- Evidence body content is large: summary remains metadata-only until click, and body display must respect existing safe-read limits.

## Requirements *(mandatory)*

### Locked Run 9 Decisions

1. **Evidence authority**: Review evidence is main-process disk/git authoritative; renderer session state is not a Review evidence source.
2. **Review evidence channel**: Run 9 adds a `review:evidence` main-process read capability for aggregated Review evidence.
3. **Clarifications source**: Committed `spec.md` Clarifications are the source of truth; same-session clarification state is not used by Review evidence.
4. **Optional Plan artifacts**: Plan optional evidence uses manifest optional entries plus disk discovery for `data-model.md`, `quickstart.md`, and files under `contracts/`.
5. **Analyze report capture**: Analyze report text is captured as app-owned evidence outside the spec-kit artifact contract.
6. **Empty Analyze commits**: Empty Analyze pass commits remain valid completion proof and must be displayed with report or no-diff evidence.
7. **Read-only dim scope**: Completed non-Review steps become view-only for mutation, but evidence inspection stays accessible and Review stays interactive.
8. **Resume target**: `Resume {pending}` targets the running step first, then the first pending step in canonical order; the UI does not add a defensive multi-pending warning.
9. **Task detail UI**: Review uses the existing parsed task detail model and adds per-task expansion without a new task parser contract.
10. **No Review commit**: Run 9 does not write a Review Step Commit or mark Review as committed.
11. **Review availability**: Normal users reach Review after Analyze has a passing disk-backed trailer; developer fixtures may cover partial states.
12. **Visual contracts**: Run 9 adds Review visual contracts and retrofits passive contracts toward real component/state paths.
13. **Hang semantics**: Passive no-recent-output notice is based on 40 minutes or more of ACP stream silence, not wall-clock runtime.
14. **Evidence bodies**: Evidence summaries show metadata first; artifact and report bodies are read on click.
15. **Branch/base baseline**: This specification uses the live `spec/0009-review-evidence` branch state and does not destructively re-baseline.

### Functional Requirements

- **FR-001**: The system MUST provide a Review evidence surface for the existing canonical workflow after Analyze completion; Review MUST NOT be treated as a new spec-kit agent step.
- **FR-002**: The system MUST make disk and git history the authoritative source for Review evidence, including committed Concierge trailers and on-disk artifacts.
- **FR-003**: The system MUST expose Review evidence through a main-process `review:evidence` channel that aggregates step trailers, artifact metadata, optional artifact discovery, clarifications, Analyze report metadata, task metadata, and warnings.
- **FR-004**: The renderer MUST NOT assemble authoritative Review evidence from volatile session memory, and session data MUST NOT be used as a Review evidence source.
- **FR-005**: The Review surface MUST show prior step completion proof from committed `Concierge-Step:` trailers and MUST surface warnings for malformed, missing, or conflicting proof.
- **FR-006**: The Review surface MUST summarize resolved clarifications by reading the committed feature specification Clarifications section and MUST NOT use same-session clarification state as evidence.
- **FR-007**: The system MUST discover Plan optional artifacts through a manifest optional list plus disk discovery for `data-model.md`, `quickstart.md`, and files under `contracts/`.
- **FR-008**: Missing optional Plan artifacts MUST NOT block Plan completion, Step Commit validation, passive summaries, or Review evidence status.
- **FR-009**: Present optional Plan artifacts MUST appear in passive summaries and Review evidence as optional evidence, not required evidence.
- **FR-010**: The system MUST capture the Analyze Markdown report as app-owned evidence outside the spec-kit feature artifact contract.
- **FR-011**: The app-owned Analyze report SHOULD be stored under an app-owned evidence location such as `userData/evidence/{featureKey}/{sessionId}/analyze-report.md` and indexed by feature directory plus Analyze commit SHA so Review can rediscover it after restart without becoming a feature source artifact.
- **FR-011a**: The Analyze report index MUST be app-owned disk data, not renderer memory, and MUST let Review map the committed `analyze:pass` proof to the captured report path when the original ACP session id is not in memory.
- **FR-011b**: Terminal Analyze Markdown extraction MUST prefer final `agent_message_chunk` content from the completed ACP prompt updates, fall back to the prompt transcript's final assistant/message chunks in order, and emit an `ANALYZE_REPORT_MISSING` or `ANALYZE_REPORT_AMBIGUOUS` warning rather than inventing report text when extraction is empty or ambiguous.
- **FR-012**: Analyze MUST remain a read-only source-review step; the system MUST NOT require or ask Analyze to author an `analyze.md` feature artifact.
- **FR-013**: Review MUST display empty Analyze pass commits as valid completion when disk proof exists and MUST pair them with report evidence or a no-diff explanation.
- **FR-014**: Review evidence summaries MUST show artifact metadata and paths first; artifact and report bodies MUST be read only when the developer selects the evidence item.
- **FR-015**: Review MUST provide a task list with per-task expansion using the existing parsed task model; it MUST NOT introduce a separate task parsing contract for per-task details.
- **FR-016**: Completed non-Review step surfaces MUST have a view-only dim treatment when later work is active or pending, while artifact and evidence inspection controls remain usable.
- **FR-017**: Review itself MUST remain interactive for evidence inspection and MUST NOT be disabled by the read-only dim treatment.
- **FR-018**: The `Resume {pending}` affordance MUST target the actively running step when known, otherwise the first pending step in canonical order.
- **FR-019**: The Resume affordance MUST assume the sequential pipeline has at most one incomplete target and MUST NOT add a defensive multi-pending warning in Run 9.
- **FR-020**: Review MUST become available in the normal user journey only after Analyze has a passing disk-backed trailer.
- **FR-021**: Developer fixture states MUST cover Review unavailable/idle, partial evidence, populated evidence, read-only/bounce, resume target, selected evidence read, evidence read failure, and task-modal states.
- **FR-022**: Run 9 MUST NOT write a Review Step Commit and MUST NOT mark Review as committed; any future Review/JIRA commit semantics are deferred to the JIRA slice.
- **FR-023**: The system MUST NOT introduce `copilot:review` or any Review agent invocation in Run 9.
- **FR-024**: Passive execution MUST show a no-recent-output notice only after 40 minutes or more with no ACP stream activity.
- **FR-025**: Any ACP stream activity MUST reset the passive silence timer, and the silence notice MUST NOT auto-fail, auto-cancel, or auto-retry a step.
- **FR-026**: Passive status copy MUST communicate "still working / no recent output" rather than asserting that the agent is hung.
- **FR-027**: Review visual contracts MUST exercise the real Review surface for idle/unavailable, populated, read-only/bounce, and task-modal states.
- **FR-028**: Passive visual contracts MUST be retrofitted to exercise the real shipped StatusStep/component state path, not synthetic injected markup.
- **FR-029**: Passive visual contracts MUST assert status counts/tags, evidence subtitles, and artifact action state for idle, running, and done passive states.
- **FR-030**: Run 9 MUST NOT add runtime dependencies.
- **FR-031**: Run 9 MUST NOT add a ninth Redux slice; Review state must be derived through existing state and the Review evidence read path.
- **FR-032**: The implementation baseline for this specification is the live `spec/0009-review-evidence` branch using the observed current main-derived state, without destructive re-baselining.
- **FR-033**: The system MUST persist the current feature directory pointer as `specs/0009-review-evidence` for downstream spec-kit commands.

### Key Entities

- **Review Evidence Summary**: The aggregated, disk-backed view of step completion proof, artifacts, clarifications, Analyze report evidence, task metadata, and warnings for a feature.
- **Step Proof**: A committed Concierge trailer record that identifies a step, status, commit SHA, and any parse warnings.
- **Artifact Evidence**: Metadata for a produced file or app-owned report, including step, label, path, required/optional status, body-read availability, and read warnings.
- **Clarification Answer**: A resolved Q/A entry parsed from the committed specification.
- **Analyze Report Evidence**: App-owned Markdown evidence captured from Analyze output outside the feature artifact contract, with an app-owned index from feature directory and Analyze commit SHA to report path.
- **Task Detail**: A parsed task entry that can be shown in a Review list and expanded in a modal.
- **Pending Navigation State**: The running or single pending step information used to render `Resume {pending}`.
- **Passive Silence Notice**: A non-terminal user notice shown after 40 minutes of no ACP stream activity.
- **Visual Fixture State**: A deterministic developer scenario used to validate Review and passive UI contracts through real component paths.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a restart scenario with valid disk/git evidence, Review shows the same completed-step statuses and artifact list before and after restart in 100% of covered fixtures.
- **SC-002**: Review lists all produced required and optional artifacts from the covered Plan fixtures, including `data-model.md`, `quickstart.md`, and every produced file under `contracts/`.
- **SC-003**: Missing optional Plan artifacts cause 0 false incomplete Plan statuses across covered fixtures.
- **SC-004**: Analyze pass states with no source changes still show valid completion and report/no-diff evidence in 100% of covered fixtures.
- **SC-005**: Evidence bodies are not loaded in the initial Review summary and are loaded only after user selection in covered body-read scenarios.
- **SC-006**: Developers can open a task detail modal from Review in 2 interactions or fewer from the populated Review state.
- **SC-007**: Passive no-recent-output notices appear only after at least 40 minutes without ACP stream activity and never during covered active-stream scenarios.
- **SC-008**: Review visual contracts cover at least idle/unavailable, populated, read-only/bounce, resume target, selected evidence, evidence read failure, and task-modal states.
- **SC-009**: Passive visual contracts for idle, running, and done states use the real shipped component path and validate status count/tag, evidence subtitle, and artifact action behavior.
- **SC-010**: Run 9 adds 0 runtime dependencies and 0 additional Redux slices.
- **SC-011**: Review creates 0 Review Step Commits during normal use in Run 9.
- **SC-012**: At least 90% of developers validating a completed feature can identify completed steps, produced evidence, unresolved warnings, and next action from Review without opening the file tree.

## Assumptions

- The locked grill decisions and pre-spec probes are authoritative inputs for this specification.
- The current branch is already `spec/0009-review-evidence`; the spec uses the live branch state rather than resetting to an older base.
- Review is a Concierge application inspection surface. It is not a canonical spec-kit agent and does not create its own artifact in Run 9.
- JIRA submission and any Review/JIRA commit behavior remain out of scope for Run 9.
- The existing task parsing contract is sufficient for Review task presentation and per-task expansion.
- Existing safe file-read limits and artifact read rules continue to apply to read-on-click evidence bodies.
- Existing smart-container and presentational-component boundaries continue to apply: Review wiring may own data access, while dumb visual surfaces receive props.
- Visual-contract fixture data may include developer-only states that are not reachable in the normal user journey, such as partial Review evidence before Analyze pass.
