# Research: Run 7 Clarify Vertical

## Decisions

### Reuse ADR-0010 for `copilot:clarify`

**Decision**: `copilot:clarify` uses the shared `StepStreamEvent` shape and transport event `copilot:clarify:event`.

**Rationale**: ADR-0010 already defines the reusable streaming mutation shape for Runs 7-9. The pre-spec refactor extracted shared factories and a generic preload subscription helper.

**Alternatives considered**:

- Clarify-specific stream union: rejected because it duplicates ADR-0010 and increases renderer parsing drift.
- Component-level subscription: rejected by Constitution VI.

### Keep Clarify State in `session`

**Decision**: Extend the existing `session` slice with Clarify questions, answers, active question, Ask Another state, malformed-card state, and re-ask attempts.

**Rationale**: Clarify answers are session-local WIP. Adding a ninth slice violates the locked Run 6/Run 7 state constraint.

**Alternatives considered**:

- New `clarify` slice: rejected because it violates the eight-slice lock.
- Store answers in `steps`: rejected because step lifecycle state should not own HITL form data.

### Correct Clarify Artifact Target to `spec.md`

**Decision**: Run 7 corrects current code paths that still assume `clarifications.md`; accepted answers are persisted in-place to the feature `spec.md` Clarifications section.

**Rationale**: `ROADMAP_DECISIONS.md` states Clarify owns `spec.md` only and no separate `clarifications.md`. The spec clarification locked this target.

**Alternatives considered**:

- Keep `clarifications.md`: rejected as roadmap drift.
- Support both artifacts indefinitely: rejected because it weakens disk truth and makes Step Commit scope ambiguous.

### Same ACP Session for Ask Another and Re-ask

**Decision**: Ask Another and malformed-question Re-ask reuse the active Clarify ACP session.

**Rationale**: Locked grill decisions require same-session continuity. The transcript fixture proves Copilot 1.0.55 supports prompt streaming and model config in one ACP session.

**Alternatives considered**:

- New ACP session per Ask Another: rejected because it loses conversation continuity.
- Local placeholder question: rejected because Run 7 must prove real Clarify interaction.

### Malformation Audit Log in User Data

**Decision**: Append JSONL audit entries to `userData/clarify-malformations.jsonl` from main-process filesystem code.

**Rationale**: Audit data is product runtime evidence, not source-controlled spec content. Main owns filesystem writes.

**Alternatives considered**:

- Feature directory log: rejected because it blurs source artifacts with runtime audit.
- Renderer persistence: rejected by Layered Architecture and Disk Is Truth.

## Risks

- **Artifact drift**: Existing `STEP_ARTIFACT_MANIFEST.clarify` and `clarify.factory.ts` currently expect `clarifications.md`; implementation must fix both with failing tests first.
- **Retry off-by-one**: Current listener exhausts on `>= 3`; Run 7 requires three actual attempts and exhaustion on the fourth failed validation.
- **Partial rendering race**: The user can answer unaffected questions while one card is rewriting; session state must preserve answers by stable id.
- **Prompt drift**: Re-ask must include well-formed ids/text as read-only context and rewrite only the malformed question.
- **Visual parity**: New Clarify body states must match v3 design and not regress the existing 24 screens.

## Verification Implications

- Unit tests for factories, log writer, session reducers/selectors, listener retry semantics, and renderer API parsing.
- Main IPC tests for `copilot:clarify`, terminal guard, artifact readback, and failure path.
- Component tests for keyboard/ARIA/disabled states.
- E2E for happy Clarify completion from completed Specify.
- Visual-diff contracts for `clarify-question`, `clarify-ask-another`, `clarify-malformed-reask`, plus existing 24-screen non-regression.
