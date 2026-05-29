---
feature: Run 7 Clarify Vertical
branch: spec/0007-clarify-vertical
created: 2026-05-29
source_plan: specs/0007-clarify-vertical/plan.md
---

# Tasks: Run 7 Clarify Vertical

**Input**: `specs/0007-clarify-vertical/plan.md`, `specs/0007-clarify-vertical/spec.md`, `specs/0007-clarify-vertical/research.md`, `specs/0007-clarify-vertical/data-model.md`, `specs/0007-clarify-vertical/contracts/clarify-api.md`, `specs/0007-clarify-vertical/quickstart.md`, and `.agents/skills/tdd/SKILL.md`.

**Tests**: Required. Run 7 is TDD-first and must proceed as vertical tracer bullets: write one failing test, implement the thinnest GREEN, then move to the next failing behavior.

**Organization**: Tasks are grouped by user story so each story can be built and verified independently once the foundational work is complete.

**Run 7 guards**:
- Preserve the existing eight renderer slices; do not add a ninth slice.
- Reuse the existing preload `subscribeStepStream(channel)` helper; do not add component-level stream subscriptions.
- Add no runtime dependencies.
- Correct Clarify artifact handling from `clarifications.md` to in-place `spec.md` Clarifications persistence.
- Keep the seven-case trust-boundary floor for Clarify factories, with the `describe` structure written as sequential RED -> GREEN tightening rather than one horizontal batch.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Put the Run 7 execution scaffold in place before shared contracts and story work begin.

- [ ] T001 Create the initial failing Run 7 journey scaffold in `e2e/clarify-vertical.spec.ts`
- [ ] T002 Extend the Run 7 boundary fixture plumbing for Clarify transcript replay in `e2e/support/boundaries.ts` and `specs/0007-clarify-vertical/fixtures/clarify-transcript.jsonl`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared contracts and bridge seams that every Clarify story depends on.

**⚠️ CRITICAL**: No user story work starts until this phase is complete.

- [ ] T003 Add failing `spec.md` artifact correction and seven-case `describe` floor coverage in `src/main/domain/factories/clarify.factory.test.ts` and `src/main/hooks/manifest.ts`
- [ ] T004 Implement `spec.md` artifact correction, normalized question parsing, and seven-case Clarify factory hardening in `src/main/domain/factories/clarify.factory.ts` and `src/main/hooks/manifest.ts`
- [ ] T005 Add failing `copilot:clarify` request/ack/parser factory tests in `src/main/ipc/copilotClarify.factory.spec.ts` and `src/renderer/api/clarify.factory.test.ts`
- [ ] T006 Implement the main-side and renderer-side Clarify trust-boundary factories in `src/main/ipc/copilotClarify.factory.ts` and `src/renderer/api/clarify.factory.ts`
- [ ] T007 Add failing Clarify bridge exposure tests for preload reuse and root API export wiring in `src/preload/index.test.ts` and `src/renderer/api/index.test.ts`
- [ ] T008 Implement the Clarify preload bridge and root API registration in `src/preload/index.ts` and `src/renderer/api/index.ts`

**Checkpoint**: Artifact validation, IPC factories, and preload/API seams are ready for story work.

---

## Phase 3: User Story 1 - Answer Clarify questions after Specify (Priority: P1) 🎯 MVP

**Goal**: Replace the Clarify placeholder with the real answer flow so users can review generated questions, pick choices, add notes, navigate, and keep answers stable by question id.

**Independent Test**: Starting from a completed Specify session, run Clarify, render at least two well-formed questions, answer them with optional notes, navigate between them, and confirm the selections remain visible when revisiting each question.

### Tests for User Story 1

- [ ] T009 [US1] Add the failing happy-path Clarify journey assertions to `e2e/clarify-vertical.spec.ts`
- [ ] T010 [US1] Add failing Clarify session-state tests for questions, answers, active question, and finish gating in `src/renderer/slices/session.test.ts` and `src/renderer/slices/session.selectors.ts`
- [ ] T011 [US1] Extend the `session` slice and selectors for Clarify question/answer state in `src/renderer/slices/session.ts` and `src/renderer/slices/session.selectors.ts`
- [ ] T012 [US1] Add failing renderer endpoint tests for `clarify:next` streaming start and local `clarify:answer` updates in `src/renderer/api/clarify.endpoint.test.ts`
- [ ] T013 [US1] Implement `clarify:next` and `clarify:answer` behavior in `src/renderer/api/clarify.endpoint.ts`
- [ ] T014 [US1] Add failing main IPC happy-path tests for `copilot:clarify` next-mode streaming in `src/main/ipc/copilotClarify.test.ts`
- [ ] T015 [US1] Implement `copilot:clarify` next-mode orchestration in `src/main/ipc/copilotClarify.ts` and `src/main/index.ts`
- [ ] T016 [US1] Add failing presentational and smart-container tests for the Clarify body in `src/renderer/components/ClarifyStep.test.tsx`, `src/renderer/components/ClarifyStepContainer.test.tsx`, and `src/renderer/components/WorkspaceContainer.test.tsx`

### Implementation for User Story 1

- [ ] T017 [US1] Implement `ClarifyStep`, `ClarifyStepContainer`, and workspace routing in `src/renderer/components/ClarifyStep.tsx`, `src/renderer/components/ClarifyStepContainer.tsx`, and `src/renderer/components/WorkspaceContainer.tsx`
- [ ] T018 [US1] Make the core Clarify answer flow pass end-to-end in `e2e/clarify-vertical.spec.ts`, `src/renderer/api/clarify.endpoint.ts`, and `src/renderer/components/ClarifyStep.tsx`

**Checkpoint**: User Story 1 delivers the MVP Clarify question-and-answer flow.

---

## Phase 4: User Story 2 - Request another clarification question (Priority: P1)

**Goal**: Let the user request one additional Clarify question inside the same active Clarify conversation without losing existing answers or context.

**Independent Test**: After the initial question set is visible and answered, click Ask Another, receive exactly one additional well-formed question from the same session, and verify earlier answers remain intact.

### Tests for User Story 2

- [ ] T019 [US2] Add failing same-session Ask Another tests in `src/renderer/api/clarify.endpoint.test.ts`, `src/main/ipc/copilotClarify.test.ts`, and `src/renderer/components/ClarifyStep.test.tsx`

### Implementation for User Story 2

- [ ] T020 [US2] Implement `clarify:askAnother` same-session behavior in `src/renderer/api/clarify.endpoint.ts`, `src/main/ipc/copilotClarify.ts`, `src/renderer/components/ClarifyStep.tsx`, and `src/renderer/slices/session.ts`
- [ ] T021 [US2] Make the Ask Another vertical pass in `e2e/clarify-vertical.spec.ts` and `e2e/support/boundaries.ts`

**Checkpoint**: User Story 2 adds interactive question expansion without restarting Clarify.

---

## Phase 5: User Story 3 - Recover malformed questions with bounded re-ask (Priority: P1)

**Goal**: Keep malformed questions visible, repair them in place through same-session re-ask, log each malformation safely, and exhaust only after the fourth failed validation.

**Independent Test**: Feed Clarify one malformed question and one well-formed question, verify both cards render together, confirm only the malformed card is blocked during re-ask, and confirm the fourth failed validation triggers `clarify-rigor-exhausted` after three real rewrite attempts.

### Tests for User Story 3

- [ ] T022 [US3] Add failing malformed-question recovery tests in `src/main/ipc/copilotClarify.test.ts`, `src/renderer/api/clarify.endpoint.test.ts`, `src/renderer/components/ClarifyStep.test.tsx`, and `src/renderer/listeners/stepLifecycle.listener.test.ts`
- [ ] T023 [P] [US3] Add failing malformation audit log writer tests in `src/main/data-layer/fs/clarifyMalformationLog.test.ts`

### Implementation for User Story 3

- [ ] T024 [P] [US3] Implement the malformation audit writer in `src/main/data-layer/fs/clarifyMalformationLog.ts`
- [ ] T025 [US3] Complete the listener body and fix fourth-failure exhaustion semantics in `src/renderer/listeners/stepLifecycle.listener.ts` and `src/renderer/listeners/stepLifecycle.listener.test.ts`
- [ ] T026 [US3] Implement malformed-card parsing, same-session `clarify:reaskMalformed`, and safe partial rendering in `src/main/ipc/copilotClarify.ts`, `src/renderer/api/clarify.endpoint.ts`, `src/renderer/slices/session.ts`, `src/renderer/components/ClarifyStep.tsx`, and `src/renderer/components/ClarifyStepContainer.tsx`
- [ ] T027 [US3] Make malformed-question recovery pass end-to-end in `e2e/clarify-vertical.spec.ts` and `e2e/support/boundaries.ts`

**Checkpoint**: User Story 3 proves strict validation, visible partial recovery, retry bounds, and audit logging.

---

## Phase 6: User Story 4 - Complete Clarify with auditable proof (Priority: P1)

**Goal**: Finish Clarify only after accepted answers are persisted back into `spec.md`, validated, committed through the lifecycle hook, and reported with artifact and commit proof.

**Independent Test**: Answer every visible question, click Finish, wait for completion, and verify the terminal pass includes `artifactPath`, `commitSha`, and a parsed summary of questions and answers; verify failures do not mark Clarify complete.

### Tests for User Story 4

- [ ] T028 [US4] Add failing `clarify:commit` pass/fail tests for in-place `spec.md` persistence and Step Commit proof in `src/main/ipc/copilotClarify.test.ts` and `src/main/domain/factories/clarify.factory.test.ts`
- [ ] T029 [US4] Add failing renderer finish-flow tests for disable rules, completion proof rendering, and failure observability in `src/renderer/api/clarify.endpoint.test.ts`, `src/renderer/components/ClarifyStep.test.tsx`, and `src/renderer/slices/session.test.ts`

### Implementation for User Story 4

- [ ] T030 [US4] Implement `clarify:commit` writeback, validation, lifecycle completion, and terminal proof payloads in `src/main/ipc/copilotClarify.ts`, `src/main/domain/factories/clarify.factory.ts`, and `src/main/hooks/manifest.ts`
- [ ] T031 [US4] Implement finish gating and completion proof rendering in `src/renderer/api/clarify.endpoint.ts`, `src/renderer/components/ClarifyStep.tsx`, `src/renderer/components/ClarifyStepContainer.tsx`, and `src/renderer/slices/session.ts`
- [ ] T032 [US4] Make the auditable Clarify completion path pass in `e2e/clarify-vertical.spec.ts` and `e2e/support/boundaries.ts`

**Checkpoint**: User Story 4 completes Clarify with trustworthy artifact and commit proof.

---

## Phase 7: User Story 5 - Preserve product architecture and visual fidelity (Priority: P2)

**Goal**: Land Run 7 without adding runtime dependencies or a ninth slice, preserve canonical step order, and cover the three required Clarify visual contracts.

**Independent Test**: Confirm the existing eight slices remain intact, `package.json` adds no runtime dependency, Clarify follows the shared step-stream pattern, the canonical step order remains `specify -> clarify -> plan -> tasks -> analyze -> review`, and the three new Clarify visual contracts pass without regressing the existing 24 screens.

### Tests for User Story 5

- [ ] T033 [P] [US5] Add failing architecture guard tests for eight-slice state, no runtime dependency growth, and canonical step ordering in `src/renderer/store.test.ts`, `src/renderer/api/index.test.ts`, `src/renderer/components/RepoBrowseScreen.test.tsx`, and `package.json`
- [ ] T034 [P] [US5] Add failing visual-contract coverage for `clarify-question`, `clarify-ask-another`, and `clarify-malformed-reask` in `e2e/visual-diff/harness/screens.config.ts`, `e2e/design-fidelity.spec.ts`, and `src/renderer/components/ClarifyStep.test.tsx`

### Implementation for User Story 5

- [ ] T035 [US5] Preserve the locked Run 7 architecture in `src/renderer/store.ts`, `src/renderer/api/index.ts`, `src/renderer/components/RepoBrowseScreen.tsx`, and `package.json`
- [ ] T036 [US5] Implement the three Clarify visual contracts in `e2e/visual-diff/harness/screens.config.ts`, `e2e/visual-diff/contracts/clarify-question.contract.json`, `e2e/visual-diff/contracts/clarify-ask-another.contract.json`, and `e2e/visual-diff/contracts/clarify-malformed-reask.contract.json`

**Checkpoint**: User Story 5 locks in the Run 7 architectural and visual contract requirements.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Run the prescribed verification loops after all story behavior is in place.

- [ ] T037 [P] Run the focused Run 7 verification loop from `specs/0007-clarify-vertical/quickstart.md` against `src/main/domain/factories/clarify.factory.test.ts`, `src/renderer/listeners/stepLifecycle.listener.test.ts`, `src/main/ipc/copilotClarify.test.ts`, and `src/renderer/components/ClarifyStep.test.tsx`
- [ ] T038 Run the full Run 7 validation commands from `specs/0007-clarify-vertical/quickstart.md` against `e2e/clarify-vertical.spec.ts` and `e2e/visual-diff/harness/screens.config.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1: Setup** -> no dependencies.
- **Phase 2: Foundational** -> depends on Phase 1 and blocks every user story.
- **Phase 3: User Story 1** -> depends on Phase 2 and is the MVP.
- **Phase 4: User Story 2** -> depends on User Story 1 because Ask Another extends the active Clarify flow.
- **Phase 5: User Story 3** -> depends on User Story 1 and the shared IPC/session seams from Phases 1-2.
- **Phase 6: User Story 4** -> depends on User Stories 1 and 3 because finish gating requires validated visible questions and resolved malformed flows.
- **Phase 7: User Story 5** -> depends on the implemented Clarify states from User Stories 1-4.
- **Phase 8: Polish** -> depends on all desired stories being complete.

### User Story Dependencies

- **US1**: Starts immediately after Foundational; no dependency on other stories.
- **US2**: Builds on US1's active Clarify session and UI shell.
- **US3**: Builds on US1's stream/session/UI path; independent of US2.
- **US4**: Builds on US1 and US3 so completion proof uses validated answers and resolved malformed states.
- **US5**: Verifies architecture and visual fidelity across the full Run 7 surface.

### Within Each User Story

- Write the RED test task before the paired GREEN implementation task.
- Keep each GREEN task minimal: only satisfy the immediately preceding failing behavior.
- Re-run the focused test before moving to the next task.
- Do not horizontally batch all factory cases, listener branches, or UI states before implementation.

### Parallel Opportunities

- T023 and T024 can proceed in parallel once T022 defines the malformed audit shape.
- T033 and T034 can proceed in parallel after US4 lands because they touch separate guard surfaces.
- T037 can be split across focused test commands for factories, listeners, IPC, and components.

---

## Parallel Example: User Story 3

```bash
# After T022 defines the malformed recovery contract:
Task: "T023 Add failing malformation audit log writer tests in src/main/data-layer/fs/clarifyMalformationLog.test.ts"
Task: "T024 Implement the malformation audit writer in src/main/data-layer/fs/clarifyMalformationLog.ts"
```

## Parallel Example: User Story 5

```bash
# After US4 is complete:
Task: "T033 Add failing architecture guard tests in src/renderer/store.test.ts, src/renderer/api/index.test.ts, src/renderer/components/RepoBrowseScreen.test.tsx, and package.json"
Task: "T034 Add failing visual-contract coverage in e2e/visual-diff/harness/screens.config.ts, e2e/design-fidelity.spec.ts, and src/renderer/components/ClarifyStep.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1.
2. Complete Phase 2.
3. Complete Phase 3.
4. Validate the Clarify question-and-answer flow independently before expanding scope.

### Incremental Delivery

1. Ship the answerable Clarify MVP with US1.
2. Add same-session expansion with US2.
3. Add malformed recovery and auditability with US3.
4. Add auditable completion proof with US4.
5. Lock architecture and visual fidelity with US5.

### Suggested MVP Scope

Only **User Story 1** is required for the first shippable increment. It proves the real Clarify vertical exists and unblocks the later Ask Another, malformed recovery, and completion-proof work.

---

## Notes

- All task lines follow the required checklist format: checkbox, task ID, optional `[P]`, required `[US#]` in story phases, and exact file paths.
- The Clarify factory floor must stay sequential and explicit: happy path, empty object named error, `null` named error, `undefined` named error, hostile case, partial structurally plausible case, then extra-key rejection.
- Run 7 must preserve the shared step stream contract, activity cap 256, and canonical step order without introducing new runtime dependencies.
