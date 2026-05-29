# Feature Specification: Run 7 Clarify Vertical

**Feature Branch**: `spec/0007-clarify-vertical`

**Created**: 2026-05-29

**Status**: Draft

**Input**: User description: "Create the product specification for Run 7 Clarify Vertical. After Specify completes, users should run Clarify, see generated clarification questions, answer choices with short-answer affordances, request another question, recover malformed questions through bounded re-ask, and finish with validated artifacts, Step Commit proof, and visual-diff coverage. Use branch `spec/0007-clarify-vertical`, base `c21bcc0086785a65d30848b897c11d4011f113c5`, grill decisions, constitution, ADR-0010, ADR-0009, and the Clarify ACP transcript fixture as locked inputs."

## Clarifications

### Session 2026-05-29

- Q: Should Ask Another start a new ACP session or continue the active Clarify conversation? → A: Same ACP session.
- Q: Which Clarify API operations are in Run 7 scope? → A: `clarify:next`, `clarify:answer`, `clarify:reaskMalformed`, `clarify:askAnother`, `clarify:commit`.
- Q: Who supplies the short-answer affordance when agent output omits it? → A: Renderer supplies textarea.
- Q: How many malformed-question rewrites happen before escape? → A: Three attempts; fourth fails.
- Q: Where are accepted Clarify answers persisted? → A: `spec.md` in-place.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Answer Clarify questions after Specify (Priority: P1)

As a Concierge user with a completed Specify step, I need Clarify to show real clarification questions, let me choose answers, add optional short-answer notes, and move between questions, so the product captures missing requirements before planning begins.

**Why this priority**: This is the core Clarify value. Without an answerable question flow, Run 7 is only a shell and cannot prepare a specification for planning.

**Independent Test**: Can be fully tested by starting from a completed Specify session, running Clarify, rendering at least two validated questions, selecting choices, entering optional notes, navigating between questions, and verifying the chosen answers remain visible.

**Acceptance Scenarios**:

1. **Given** Specify is complete and Clarify is pending, **When** the user opens the Clarify step, **Then** the Clarify body replaces the previous placeholder and shows a progress row, question card, answer choices, short-answer textarea, pips, navigation controls, and Ask Another affordance.
2. **Given** Clarify returns multiple well-formed questions, **When** the user selects an answer on one question and navigates away and back, **Then** the selected answer and short-answer text remain associated with that stable question.
3. **Given** not all visible questions have selected choices, **When** the user inspects the Finish control, **Then** Finish is disabled and explains that all current questions need selected choices.
4. **Given** all visible questions have selected choices and no re-ask is in flight, **When** the user clicks Finish, **Then** completion begins and the UI prevents duplicate submission.

---

### User Story 2 - Request another clarification question (Priority: P1)

As a Concierge user, I need to ask for one more clarification question inside the same Clarify conversation, so I can resolve an important requirement gap without starting a new session or losing existing answers.

**Why this priority**: Ask Another is the primary human-in-the-loop expansion path for Clarify. It proves the step can remain interactive after the initial question set.

**Independent Test**: Can be fully tested by answering existing questions, clicking Ask Another, receiving one added well-formed question from the same active Clarify conversation, and verifying previous answers remain intact.

**Acceptance Scenarios**:

1. **Given** at least one Clarify question is visible, **When** the user clicks Ask Another, **Then** the same Clarify conversation is reused and a progress state communicates that another question is being requested.
2. **Given** the added question is well formed, **When** it appears, **Then** existing questions and answers remain unchanged and the added question becomes part of the visible question set.
3. **Given** Ask Another fails, **When** the user returns to the Clarify body, **Then** existing answers remain available and the activity stream explains the failure without marking Clarify complete.

---

### User Story 3 - Recover malformed questions with bounded re-ask (Priority: P1)

As a Concierge user, I need malformed Clarify questions to remain visible and be repaired automatically in place, so one bad question does not hide useful questions or force me to restart the entire step.

**Why this priority**: Clarify has a constitutional rigor mandate. Run 7 must prove strict validation and humane recovery work together.

**Independent Test**: Can be fully tested by feeding Clarify output with one malformed question and one well-formed question, observing both cards render, confirming only the malformed card is in-flight, and verifying the fourth failed validation triggers the `clarify-rigor-exhausted` escape path after three actual rewrite attempts.

**Acceptance Scenarios**:

1. **Given** Clarify output contains well-formed and malformed questions, **When** validation completes, **Then** well-formed question cards and visibly malformed cards render simultaneously.
2. **Given** one malformed question is being rewritten, **When** the user navigates or answers unaffected questions, **Then** those actions remain available while Finish and the in-flight malformed card are disabled.
3. **Given** a malformed question is rewritten successfully, **When** the rewritten result validates, **Then** the malformed card is replaced with the corrected question and existing answers keyed by stable question ids are preserved.
4. **Given** the same malformed question fails validation after three actual rewrite attempts, **When** the next failed validation occurs, **Then** Clarify triggers the Step Escape Hatch with reason `clarify-rigor-exhausted` and does not silently retry again.

---

### User Story 4 - Complete Clarify with auditable proof (Priority: P1)

As a Concierge user, I need Clarify to finish only after answers and artifacts are valid, so downstream Plan and Tasks work from trustworthy committed clarifications in the feature `spec.md`.

**Why this priority**: Clarify completion is the handoff into the rest of the Spec Kit pipeline. False completion would corrupt planning.

**Independent Test**: Can be fully tested by answering all questions, clicking Finish, waiting for completion, and verifying the visible done result includes the artifact path, Step Commit SHA, and a parsed summary of questions and answers.

**Acceptance Scenarios**:

1. **Given** all visible questions have selected choices, optional notes are captured, and no malformed question remains, **When** Finish is clicked, **Then** Clarify validates the Step Contract before any pass is shown.
2. **Given** Step Contract validation and Step Commit succeed, **When** Clarify reports completion, **Then** the user sees a pass state with `artifactPath`, `commitSha`, and parsed questions/answers summary.
3. **Given** validation, artifact readback, or Step Commit fails, **When** Clarify reports failure, **Then** no pass state is shown, no false completion is recorded, and the activity stream explains the failure.

---

### User Story 5 - Preserve product architecture and visual fidelity (Priority: P2)

As a Concierge maintainer, I need Run 7 to extend existing state, stream, lifecycle, and visual-contract patterns without adding a ninth slice or new dependency, so Clarify remains compatible with Runs 2-6 and the constitution.

**Why this priority**: Clarify crosses UI, streaming, factories, listener middleware, audit logging, and Step Commit flow. The vertical must be safe to build and verify incrementally.

**Independent Test**: Can be tested by reviewing the final Run 7 inventory: the existing eight renderer slices remain intact, Clarify uses the shared step stream shape, no runtime dependency is added, and the visual-diff suite includes exactly three new Clarify body screens while the existing 24 screens continue to pass.

**Acceptance Scenarios**:

1. **Given** Run 7 is complete, **When** renderer state ownership is inspected, **Then** Clarify questions, answers, active question, Ask Another state, and re-ask state live under the existing session state rather than a ninth slice.
2. **Given** Clarify starts, progresses, succeeds, or fails, **When** events cross the product boundary, **Then** they follow the shared step stream contract with progress events and exactly one terminal done event.
3. **Given** visual-diff contracts are run, **When** Clarify screens are compared, **Then** `clarify-question`, `clarify-ask-another`, and `clarify-malformed-reask` are covered and the prior 24 visual screens do not regress.

### Edge Cases

- Specify is not complete or lacks a readable committed artifact when the user attempts to start Clarify.
- Clarify returns no questions because no clarification is needed.
- Clarify returns duplicate question ids, missing question text, fewer than two choices, missing choice keys or labels, parser-confusing line-start emphasis, inconsistent line endings, or extra unrecognized data.
- Clarify returns a short-answer marker, omits a short-answer marker, or provides agent text that conflicts with the UI-supplied short-answer affordance.
- Well-formed and malformed questions arrive in the same artifact.
- A re-ask rewrite changes the malformed question id, duplicates another id, changes unrelated well-formed questions, or returns another malformed version.
- The user answers unaffected questions, changes active question, opens other app navigation, or clicks Ask Another while one malformed card is in flight.
- Ask Another returns a malformed question, no question, or a duplicate of an existing question.
- The user attempts Finish while a re-ask or Ask Another request is still in flight.
- Step Commit succeeds but artifact readback fails, or artifact readback succeeds but Step Commit fails.
- The malformation audit log cannot be written or contains data that must be sanitized before persistence.
- Progress and done events arrive rapidly, out of expected order, or a duplicate terminal event is attempted.
- Dynamic status, malformed-card announcements, and disabled states must remain perceivable without relying on color alone.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST implement the Clarify vertical after Specify completes, covering the Clarify body, streaming execution, answer capture, Ask Another, malformed-question re-ask, Finish validation, and completion proof.
- **FR-002**: The Clarify body MUST include the Run 7 product states for normal question answering, asking another question, malformed re-ask, completion in progress, pass, and fail.
- **FR-003**: The Clarify body MUST use the v3 design language already adopted by the product and MUST NOT regress the shell, titlebar, stepper, activity, customization, modal, or Specify visual states from Run 6.
- **FR-004**: Clarify MUST become available only from a session where Specify is complete according to the established step lifecycle state, and it MUST not imply Plan, Tasks, Analyze, Review, or JIRA sync body support.
- **FR-005**: Clarify MUST show well-formed generated questions as answerable cards with a question label, question text, choice cards, a short-answer textarea, progress pips, previous/next navigation, Ask Another, and Finish.
- **FR-006**: The persisted agent output for a Clarify question MUST require choices, while the rendered UI MUST always provide the renderer-supplied short-answer textarea whether or not the persisted output mentions short answers.
- **FR-007**: Answers MUST be keyed by stable question ids and MUST survive navigation, Ask Another additions, and malformed-question rewrite cycles for unaffected questions.
- **FR-008**: Finish MUST remain unavailable until every currently visible well-formed question has one selected choice, all malformed questions are resolved or escaped, and no Clarify request is in flight.
- **FR-009**: Ask Another MUST reuse the same active ACP session and Clarify conversation and MUST add at most one new question per user request.
- **FR-010**: Ask Another MUST preserve all existing questions, selected choices, short-answer text, active question context, and activity history unless a validation failure requires the standard recovery path.
- **FR-011**: Clarify stream transport MUST use capability `copilot:clarify` and transport event `copilot:clarify:event`.
- **FR-012**: Clarify streaming MUST use the shared step stream event shape: zero or more progress events and exactly one terminal `done` event.
- **FR-013**: Clarify `done/pass` MUST include `artifactPath`, `commitSha`, and a parsed questions/answers summary.
- **FR-014**: Clarify `done/fail` MUST include a user-actionable reason and MUST NOT mark Clarify complete.
- **FR-015**: The renderer endpoint/API for Clarify MUST expose `clarify:next`, `clarify:answer`, `clarify:reaskMalformed`, `clarify:askAnother`, and `clarify:commit`, and MUST subscribe and unsubscribe through the generic preload step-stream subscription path rather than component-level event handling.
- **FR-016**: Clarify renderer state MUST extend the existing session state with questions, answers, active question, Ask Another state, malformed-card state, and re-ask attempts; it MUST NOT add a ninth Redux slice.
- **FR-017**: Smart Clarify containers MAY coordinate product state and endpoints, but presentational Clarify components MUST receive data and callbacks as props.
- **FR-018**: Clarify question validation MUST enforce strict Step Contract rules: trimmed non-empty question text, normalized and consistent line endings, at least two choices, each choice having key and label, no parser-confusing markdown emphasis at the start of a line, and no unrecognized extra data at the disk-entry boundary.
- **FR-019**: The Clarify Step Contract factory MUST use the seven-case trust-boundary test floor: happy path, empty object named error, null named error, undefined named error, one hostile malformed case, one partial structurally-plausible case, and extra-key rejection.
- **FR-020**: Malformed-question detection MUST produce a partial result containing well-formed questions, malformed questions, malformation category, raw malformed text safe for display, stable question ids, and position.
- **FR-021**: Malformed questions MUST render as visibly malformed cards at the same time as well-formed cards and MUST never be silently hidden or rendered as unsafe raw markdown.
- **FR-022**: Re-ask context MUST include the malformed question text, position, malformation category, and the ids/text of well-formed questions as read-only context.
- **FR-023**: Re-ask MUST rewrite only the malformed question and MUST preserve well-formed question ids/text as read-only context.
- **FR-024**: Re-ask retry semantics MUST allow rewrite attempts 1, 2, and 3 for the same malformed question and MUST exhaust only on the fourth failed validation.
- **FR-025**: Re-ask exhaustion MUST trigger the Step Escape Hatch with reason `clarify-rigor-exhausted`.
- **FR-026**: While a malformed question re-ask is in flight, the user MUST be able to navigate and answer unaffected questions; Finish and only the in-flight malformed card MUST be disabled.
- **FR-027**: Every Clarify malformation MUST be recorded in the activity stream and in a global audit stream at `userData/clarify-malformations.jsonl`.
- **FR-028**: Each malformation audit record MUST include question id, malformation category, raw output or safe excerpt, timestamp, model id when known, session id, and step name, without recording secrets or unrelated personal data.
- **FR-029**: Clarify completion MUST occur only after all current questions have selected choices, accepted answers are written in-place to the feature `spec.md` Clarifications section, the Clarify factory validates the artifact, the after-Clarify lifecycle succeeds, and a Step Commit SHA is returned.
- **FR-030**: The Clarify pass Step Commit MUST use the established step lifecycle trailer semantics for `Concierge-Step: clarify:pass`.
- **FR-031**: The Clarify fail path MUST preserve observable activity, avoid false completion, and route unrecoverable validation or hook failures through the Step Escape Hatch.
- **FR-032**: The Clarify ACP transcript fixture at `specs/0007-clarify-vertical/fixtures/clarify-transcript.jsonl` MUST remain valid evidence for initialization, model selection, prompt streaming, and generated Clarify question chunks.
- **FR-033**: Run 7 MUST add no runtime dependencies and MUST NOT implement Plan, Tasks, Analyze, Review, JIRA sync UI, or a ninth renderer state slice.
- **FR-034**: Clarify UI MUST meet WCAG 2.1 AA expectations: keyboard operability, visible focus, accessible labels/instructions for every choice group and textarea, programmatic disabled/error messaging, live announcements for dynamic status and malformation events, and no color-only state communication.
- **FR-035**: Clarify visual contracts MUST include exactly these three new body screens: `clarify-question`, `clarify-ask-another`, and `clarify-malformed-reask`.
- **FR-036**: Run 7 verification MUST include the new Clarify visual contracts and non-regression of the existing 24 visual screens.
- **FR-037**: Clarify progress and completion activity MUST be reflected in the existing activity stream without increasing the 256-entry activity history cap.
- **FR-038**: Clarify MUST keep the step order canonical: specify, clarify, plan, tasks, analyze, review.

### Key Entities *(include if feature involves data)*

- **Clarify Question**: A generated question with a stable id, position, text, choices, validation state, and optional malformation details.
- **Clarify Choice**: A selectable answer option with a key, label, and relationship to one Clarify question.
- **Clarify Answer**: The user's selected choice and optional short-answer text, keyed by question id.
- **Clarify Session State**: The active Clarify question set, active question id or index, Ask Another status, re-ask status, selected answers, and completion status inside the existing session state.
- **Malformed Question Record**: A safe product representation of a rejected question, including category, raw excerpt, position, attempts, and disabled/in-flight state.
- **Malformation Audit Entry**: A disk-backed audit line for a malformed question, including session id, step, question id, category, timestamp, model id when known, and safe raw output or excerpt.
- **Step Stream Event**: A user-visible progress or terminal event for the Clarify step, using the shared event semantics with exactly one terminal done event.
- **Clarify Completion Proof**: The final pass payload containing artifact path, Step Commit SHA, and parsed questions/answers summary.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a completed Specify session with two well-formed Clarify questions, users can start Clarify, answer all questions, and see a pass result with artifact path and commit identity in under 3 minutes.
- **SC-002**: 100% of Clarify pass completions include `artifactPath`, `commitSha`, and parsed questions/answers summary before the UI marks Clarify complete.
- **SC-003**: 100% of malformed-question cases render both well-formed and malformed cards together before any rewrite result is applied.
- **SC-004**: A malformed question receives exactly three rewrite opportunities before a fourth failed validation triggers `clarify-rigor-exhausted`.
- **SC-005**: Existing answers for unaffected question ids are retained across 100% of Ask Another and re-ask rewrite cycles.
- **SC-006**: The three required Clarify visual-diff screens pass, and the 24 existing visual screens remain non-regressed.
- **SC-007**: Keyboard-only users can answer questions, enter short-answer text, navigate between questions, request another question, and identify malformed/in-flight states without a mouse.
- **SC-008**: No Run 7 completion path creates a ninth renderer state slice or adds a runtime dependency.

## Assumptions

- The branch `spec/0007-clarify-vertical` already exists and is the active work branch.
- The pre-spec refactor for the shared step stream event factory and generic preload `subscribeStepStream(channel)` has already landed on this branch.
- Run 6 Specify completion, repository selection, auth gating, activity stream, stepper, and visual-diff harness are available and remain the baseline.
- The Clarify Step Contract writes and validates clarifications in-place in the feature `spec.md` under the spec-kit Clarifications section; Run 7 must correct any current code path that still assumes a separate `clarifications.md`.
- The design source remains `design/v3-fetch/project/`, with locked Run 7 overrides from `specs/0007-clarify-vertical/grill.md` and this specification.
- The user-facing short-answer textarea is always supplied by the UI; persisted agent output is only required to provide question text and choices.
- The product treats the malformation audit log as userData audit material, not source-controlled specification content.
