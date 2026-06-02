# Tasks: Fix File Display Modals

**Input**: Design documents from `/specs/0014-fix-file-display/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/file-display-modal-ui.md`, `quickstart.md`

**Tests**: Tests are REQUIRED. Each story is ordered as RED tasks, focused fail observation, GREEN implementation, then story-local verification.

**Organization**: Tasks are grouped by user story so each story can be implemented and verified as a vertical tracer-bullet slice.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel only when it touches different files and has no unmet dependency
- **[Story]**: User story label for story-phase tasks only (`[US1]`, `[US2]`, `[US3]`)
- Every task includes exact file path references

## Phase 1: Setup

**Purpose**: Load the feature-specific contracts and verification flow before renderer edits.

- [ ] T001 [P] Review modal state requirements in specs/0014-fix-file-display/data-model.md before editing src/renderer/slices/ui.ts and src/renderer/slices/ui.selectors.ts
- [ ] T002 [P] Review overlay render and dismissal rules in specs/0014-fix-file-display/contracts/file-display-modal-ui.md before editing src/renderer/components/ArtifactViewer.tsx and src/renderer/components/ModalHost.tsx

---

## Phase 2: User Story 1 - Open artifacts in a true overlay modal (Priority: P1) 🎯 MVP

**Goal**: Open `spec.md`, `plan.md`, and `tasks.md` in a centered overlay modal with the standard dimmed backdrop.

**Independent Test**: From a scrolled workspace step at 1280x800 and 1440x900, open `spec.md`, `plan.md`, and `tasks.md` and confirm each renders in a centered `.modal-veil` overlay with backdrop, no workspace reflow, and loading/error states inside the same modal shell.

### RED Slice for User Story 1

- [ ] T003 [US1] Add failing workspace artifact-launch overlay regression coverage in src/renderer/components/WorkspaceContainer.test.tsx
- [ ] T004 [US1] Add failing artifact viewer overlay-shell coverage for loading, error, markdown, task-list, and plain-text states in src/renderer/components/ArtifactViewer.test.tsx
- [ ] T005 [US1] Run focused failing tests for src/renderer/components/WorkspaceContainer.test.tsx and src/renderer/components/ArtifactViewer.test.tsx before implementation
- [ ] T006 [US1] Add failing shared file-display modal reducer/action behavior coverage in src/renderer/slices/ui.test.ts before implementation
- [ ] T007 [US1] Add failing artifact dialog close-control, Escape-key, backdrop-click, focus-return, and remove-veil coverage in src/renderer/components/WorkspaceContainer.test.tsx before implementation
- [ ] T008 [US1] Add failing shared file-display selector coverage in src/renderer/slices/ui.selectors.test.ts before implementation
- [ ] T009 [US1] Add failing global artifact modal routing and accessibility coverage in src/renderer/components/ArtifactViewerModalContainer.test.tsx before implementation

### GREEN Slice for User Story 1

- [ ] T010 [US1] Extend shared file-display modal state and actions in src/renderer/slices/ui.ts
- [ ] T011 [US1] Add shared file-display selectors in src/renderer/slices/ui.selectors.ts
- [ ] T012 [US1] Create global modal orchestrator in src/renderer/components/ArtifactViewerModalContainer.tsx
- [ ] T013 [US1] Mount the shared artifact viewer modal path in src/renderer/components/ModalHost.tsx
- [ ] T014 [US1] Refactor the shared viewer to render `.modal-veil` and centered dialog markup in src/renderer/components/ArtifactViewer.tsx
- [ ] T015 [US1] Dispatch shared artifact viewer open and close actions from src/renderer/components/PassiveStepContainer.tsx
- [ ] T016 [US1] Remove inline artifact viewer mounting and keep callback-only rendering in src/renderer/components/PassiveStep.tsx
- [ ] T017 [US1] Ensure semantic dialog markup, close-control accessibility, and loading/error announcements remain inside the shared modal shell in src/renderer/components/ArtifactViewer.tsx
- [ ] T018 [US1] Update centered sizing, scroll, and viewport-safe modal rules for 1280x800 and 1440x900 in src/renderer/styles/index.css

### Verification for User Story 1

- [ ] T019 [US1] Tighten passive artifact overlay assertions in e2e/visual-diff/contracts/passive-artifact-modal.contract.json
- [ ] T020 [US1] Register passive artifact overlay capture coverage at 1280x800 and 1440x900 in e2e/visual-diff/harness/screens.config.ts

**Checkpoint**: User Story 1 is independently functional and can be validated as the MVP.

---

## Phase 3: User Story 2 - Inspect review task details in the same overlay pattern (Priority: P2)

**Goal**: Open Review task details through the same global overlay modal pattern used for artifacts.

**Independent Test**: In the Review step at 1280x800 and 1440x900, open task details and confirm they appear in the centered overlay with the standard backdrop and dismiss back to the same review context.

### RED Slice for User Story 2

- [ ] T021 [US2] Add failing review task-detail overlay open-close regression coverage in src/renderer/components/ReviewStepContainer.test.tsx
- [ ] T022 [US2] Add failing no-inline-backdrop expectation for Review task-detail rendering in src/renderer/components/ReviewStep.test.tsx
- [ ] T023 [US2] Add failing Review task-detail semantic dialog and accessible close-control coverage in src/renderer/components/ReviewStepContainer.test.tsx
- [ ] T024 [US2] Run focused failing tests for src/renderer/components/ReviewStepContainer.test.tsx and src/renderer/components/ReviewStep.test.tsx before implementation

### GREEN Slice for User Story 2

- [ ] T025 [US2] Route Review task-detail and evidence opens through shared UI actions in src/renderer/components/ReviewStepContainer.tsx
- [ ] T026 [US2] Remove the bespoke inline task modal branch and dead `.modal-backdrop` reference from src/renderer/components/ReviewStep.tsx
- [ ] T027 [US2] Extend shared request routing for `tasks.md` and absolute review evidence paths in src/renderer/components/ArtifactViewerModalContainer.tsx

### Verification for User Story 2

- [ ] T028 [US2] Tighten review task overlay assertions in e2e/visual-diff/contracts/review-task-modal.contract.json
- [ ] T029 [US2] Register review task overlay capture coverage at 1280x800 and 1440x900 in e2e/visual-diff/harness/screens.config.ts

**Checkpoint**: User Stories 1 and 2 both work with the same overlay path.

---

## Phase 4: User Story 3 - Preserve existing working dialogs (Priority: P3)

**Goal**: Keep About, Request, and Customize dialogs unchanged after the shared file-display modal path is introduced.

**Independent Test**: After US1 and US2 are complete, open About, Request, and Customize and confirm their appearance, backdrop, ordering, and dismissal behavior are unchanged.

### Regression Slice for User Story 3

- [ ] T030 [US3] Preserve About modal overlay regression coverage in src/renderer/components/AboutModal.test.tsx and e2e/visual-diff/contracts/about-modal.contract.json
- [ ] T031 [US3] Preserve Request modal overlay regression coverage in src/renderer/components/RequestModal.test.tsx and e2e/visual-diff/contracts/request-modal.contract.json
- [ ] T032 [US3] Preserve Customize modal overlay regression coverage in src/renderer/components/CustomizeModal.test.tsx and e2e/visual-diff/contracts/customize-modal.contract.json
- [ ] T033 [US3] Confirm existing About, Request, and Customize modal ordering and dismissal remain stable in src/renderer/components/ModalHost.tsx
- [ ] T034 [US3] Preserve unchanged about/request/customize capture coverage in e2e/visual-diff/harness/screens.config.ts

**Checkpoint**: Existing standard dialogs remain unchanged after the file-display modal fix.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Run the feature verification flow and lock in cross-story regression coverage.

- [ ] T035 [P] Execute focused artifact verification from specs/0014-fix-file-display/quickstart.md against src/renderer/components/WorkspaceContainer.test.tsx and src/renderer/components/ArtifactViewer.test.tsx
- [ ] T036 [P] Execute review and unchanged-dialog verification from specs/0014-fix-file-display/quickstart.md against src/renderer/components/ReviewStepContainer.test.tsx, src/renderer/components/ReviewStep.test.tsx, src/renderer/components/AboutModal.test.tsx, src/renderer/components/RequestModal.test.tsx, and src/renderer/components/CustomizeModal.test.tsx
- [ ] T037 Run visual-diff capture, diff, and report validation from specs/0014-fix-file-display/quickstart.md against e2e/visual-diff/harness/screens.config.ts, e2e/visual-diff/contracts/passive-artifact-modal.contract.json, e2e/visual-diff/contracts/review-task-modal.contract.json, e2e/visual-diff/contracts/about-modal.contract.json, e2e/visual-diff/contracts/request-modal.contract.json, and e2e/visual-diff/contracts/customize-modal.contract.json
- [ ] T038 Run final lint, typecheck, and full test verification from specs/0014-fix-file-display/quickstart.md for src/renderer/slices/ui.ts, src/renderer/components/ArtifactViewerModalContainer.tsx, src/renderer/components/ModalHost.tsx, and src/renderer/styles/index.css

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1: Setup** -> no dependencies
- **Phase 2: US1** -> depends on Phase 1
- **Phase 3: US2** -> depends on US1 because it reuses the shared modal state and shell established by US1
- **Phase 4: US3** -> depends on US1 and US2 because it validates existing dialogs after the final ModalHost integration
- **Phase 5: Polish** -> depends on all targeted user stories being complete

### User Story Dependencies

- **US1**: First delivery slice and MVP; no story dependency after Setup
- **US2**: Builds on the shared overlay path from US1 to reuse the same modal shell for Review task details
- **US3**: Regression slice that intentionally runs after US1 and US2 to prove About/Request/Customize behavior is unchanged

### Within Each User Story

- RED tasks must be written and observed failing before GREEN implementation tasks
- Shared viewer/container wiring must exist before story-specific trigger updates
- Container changes precede presentational cleanup when both files are touched
- Visual-diff contract tightening follows the relevant UI behavior change

### Suggested Completion Order

1. Phase 1 Setup
2. Phase 2 US1 RED -> GREEN -> verification
3. Phase 3 US2 RED -> GREEN -> verification
4. Phase 4 US3 regression verification
5. Phase 5 Polish

---

## Parallel Opportunities

- **Setup**: T001 and T002 can run in parallel
- **US3**: T030, T031, and T032 can run in parallel after US1 and US2 are complete
- **Polish**: T035 and T036 can run in parallel after all implementation tasks finish

---

## Parallel Example: User Story 3

```bash
Task: "T030 [US3] Preserve About modal overlay regression coverage in src/renderer/components/AboutModal.test.tsx and e2e/visual-diff/contracts/about-modal.contract.json"
Task: "T031 [US3] Preserve Request modal overlay regression coverage in src/renderer/components/RequestModal.test.tsx and e2e/visual-diff/contracts/request-modal.contract.json"
Task: "T032 [US3] Preserve Customize modal overlay regression coverage in src/renderer/components/CustomizeModal.test.tsx and e2e/visual-diff/contracts/customize-modal.contract.json"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 Setup
2. Complete Phase 2 User Story 1 RED -> GREEN -> verification
3. Validate US1 independently with the scrolled-workspace overlay test and passive visual contract at 1280x800 and 1440x900
4. Demo or ship the artifact-overlay fix as the MVP

### Incremental Delivery

1. Deliver US1 for artifact overlays
2. Deliver US2 for Review task details on the same overlay path
3. Deliver US3 regression protection for About/Request/Customize
4. Finish with Phase 5 verification from `quickstart.md`

### Team Strategy

- Engineer A: US1 RED tests and shared modal state/container wiring
- Engineer B: US2 Review task-detail RED tests and routing after US1 completes
- Engineer C: US3 regression tests and visual contracts after US1 and US2 complete

---

## Notes

- `[P]` tasks touch different files or independent verification artifacts
- `[US1]`, `[US2]`, and `[US3]` map directly to the prioritized stories in `spec.md`
- RED tasks are not committed as failing work; each GREEN slice must leave focused tests passing before moving on
- Keep About, Request, and Customize behavior unchanged except for explicit regression validation
- Use `specs/0014-fix-file-display/quickstart.md` as the authoritative verification sequence
