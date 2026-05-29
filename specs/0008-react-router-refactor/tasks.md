# Tasks: React Router Navigation Refactor

**Input**: Design documents from `specs/0008-react-router-refactor/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/routes.md

**Tests**: TDD approach — test tasks are included. Write tests FIRST, verify they FAIL, then implement.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependency and create directory structure

- [x] T001 Install react-router@7 via `npm install react-router@7` and verify package.json updated
- [x] T002 Create directory `src/renderer/components/guards/` for route guard components

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core router infrastructure that MUST be complete before user story work can begin

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests (RED first)

- [x] T003 Write failing test for router creation with 3 routes (sign-in, repos, workspace) in `src/renderer/router.test.ts`
- [x] T004 Write failing test for App rendering RouterProvider in `src/renderer/App.test.tsx`
- [x] T005 Write failing test for Electron back/forward key prevention in `src/main/backForwardBlocker.test.ts`

### Implementation (GREEN)

- [x] T006 Create router configuration with `createMemoryRouter` and route definitions in `src/renderer/router.ts`
- [x] T007 Refactor `src/renderer/App.tsx` to render `<RouterProvider router={router} />` replacing conditional rendering
- [x] T008 Update `src/renderer/index.tsx` to pass router into the component tree
- [x] T009 Add `before-input-event` handler to disable Alt+ArrowLeft/Alt+ArrowRight in `src/main/index.ts`

**Checkpoint**: Router renders, all 3 routes defined, back/forward disabled. Tests pass GREEN.

---

## Phase 3: User Story 1 - Navigate Between Application Screens via URL (Priority: P1) 🎯 MVP

**Goal**: Replace conditional Redux-based rendering with declarative route-based navigation using guards and a navigation listener

**Independent Test**: Navigate between screens and verify URL updates; reload window and confirm correct screen renders based on auth/workspace state

### Tests for User Story 1 (RED first)

- [x] T010 [P] [US1] Write failing test: AuthGuard renders Outlet when authenticated in `src/renderer/components/guards/AuthGuard.test.tsx`
- [x] T011 [P] [US1] Write failing test: AuthGuard redirects to /sign-in when not authenticated in `src/renderer/components/guards/AuthGuard.test.tsx`
- [x] T012 [P] [US1] Write failing test: WorkspaceGuard renders Outlet when repo and branch are set in `src/renderer/components/guards/WorkspaceGuard.test.tsx`
- [x] T013 [P] [US1] Write failing test: WorkspaceGuard redirects to /repos when no workspace in `src/renderer/components/guards/WorkspaceGuard.test.tsx`
- [x] T014 [P] [US1] Write failing test: navigation listener navigates to /sign-in when auth gate closes in `src/renderer/listeners/navigation.listener.test.ts`
- [x] T015 [P] [US1] Write failing test: navigation listener navigates to /repos when auth gate opens and no workspace in `src/renderer/listeners/navigation.listener.test.ts`
- [x] T016 [P] [US1] Write failing test: navigation listener navigates to /workspace when workspaceEntered dispatched in `src/renderer/listeners/navigation.listener.test.ts`
- [x] T017 [P] [US1] Write failing test: navigation listener navigates to /repos when repositoryBrowseReset dispatched in `src/renderer/listeners/navigation.listener.test.ts`
- [x] T018 [US1] Write failing test: catch-all route redirects based on current state in `src/renderer/router.test.ts`

### Implementation for User Story 1 (GREEN)

- [x] T019 [P] [US1] Implement AuthGuard component using useAppSelector and Navigate in `src/renderer/components/guards/AuthGuard.tsx`
- [x] T020 [P] [US1] Implement WorkspaceGuard component using useAppSelector and Navigate in `src/renderer/components/guards/WorkspaceGuard.tsx`
- [x] T021 [US1] Implement navigation listener with auth and workspace watchers in `src/renderer/listeners/navigation.listener.ts`
- [x] T022 [US1] Wire navigation listener into store assembly via `setupNavigationListener` in `src/renderer/store.ts`
- [x] T023 [US1] Update router.ts route definitions to nest routes under AuthGuard and WorkspaceGuard layout routes in `src/renderer/router.ts`
- [x] T024 [US1] Add catch-all `*` route that redirects based on current auth/workspace state in `src/renderer/router.ts`
- [x] T025 [US1] Remove `activeView` field and related reducer from ui slice in `src/renderer/slices/ui.ts`
- [x] T026 [US1] Remove `selectUiActiveView` selector if present in `src/renderer/slices/ui.selectors.ts`

**Checkpoint**: At this point, screens render via routes, guards protect them, navigation listener syncs Redux to URL. User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Preserve Step and View Context in URL Query Parameters (Priority: P2)

**Goal**: Reflect the viewed step as a `?step=` URL query parameter that survives reloads and supports deep-linking

**Independent Test**: Navigate to a step in the stepper, verify URL query param updates; reload and confirm same step is displayed

### Tests for User Story 2 (RED first)

- [x] T027 [P] [US2] Write failing test: navigation listener updates ?step= query param when step viewed action fires in `src/renderer/listeners/navigation.listener.test.ts`
- [x] T028 [P] [US2] Write failing test: navigation listener sets ?step=clarify when specifyCompletedInWorkspace fires in `src/renderer/listeners/navigation.listener.test.ts`
- [x] T029 [P] [US2] Write failing test: workspace route reads valid step param and applies it in `src/renderer/hooks/useStepFromUrl.test.ts`
- [x] T030 [P] [US2] Write failing test: workspace route falls back to activeStep when step param is invalid in `src/renderer/hooks/useStepFromUrl.test.ts`
- [x] T031 [US2] Write failing test: workspace route falls back to activeStep when step is not_available in `src/renderer/hooks/useStepFromUrl.test.ts`

### Implementation for User Story 2 (GREEN)

- [x] T032 [US2] Add step query param sync to navigation listener (workspaceStepViewed, specifyCompletedInWorkspace, workspaceEntered) in `src/renderer/listeners/navigation.listener.ts`
- [x] T033 [US2] Create useStepFromUrl hook that reads ?step= and validates against step availability in `src/renderer/hooks/useStepFromUrl.ts`
- [x] T034 [US2] Remove `viewedStep` field from workspace slice in `src/renderer/slices/workspace.ts`
- [x] T035 [US2] Remove `selectWorkspaceViewedStep` selector in `src/renderer/slices/workspace.selectors.ts`
- [x] T036 [US2] Update WorkspaceContainer to use useStepFromUrl instead of Redux viewedStep selector in `src/renderer/components/WorkspaceContainer.tsx`
- [x] T037 [US2] Update Stepper component props to receive step from URL hook rather than Redux in `src/renderer/components/Stepper.tsx`

**Checkpoint**: At this point, step is reflected in URL, survives reload, validates against availability. User Stories 1 AND 2 are both independently functional.

---

## Phase 5: User Story 3 - Constitution Amendment (Priority: P3)

**Goal**: Amend Section VI of the constitution to formally permit URL-owned navigation state

**Independent Test**: Read the constitution and confirm the amendment is unambiguous — a new contributor can determine URL vs Redux state ownership within 30 seconds

### Implementation for User Story 3

- [x] T038 [US3] Add "URL-Based Navigation State" subsection under Section VI in `.specify/memory/constitution.md`
- [x] T039 [US3] Verify amendment does not contradict existing Section VI rules (no other state library ban, listener middleware as effect layer, selector composite read API)
- [x] T040 [US3] Update CLAUDE.md custom instructions if any Run conventions reference navigation state ownership

**Checkpoint**: Constitution amended. All three user stories complete.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Fix regressions, update dependent tests, add e2e coverage

- [x] T041 [P] Update existing ui.test.ts to remove activeView-related test cases in `src/renderer/slices/ui.test.ts`
- [x] T042 [P] Update existing workspace.test.ts to remove viewedStep-related test cases in `src/renderer/slices/workspace.test.ts`
- [x] T043 Update any components importing removed selectors (selectWorkspaceViewedStep, selectUiActiveView) across `src/renderer/components/`
- [x] T044 [P] Write e2e routing test: full auth → repos → workspace → step navigation flow; verify reload preserves current route and step query param in `e2e/routing.spec.ts`
- [x] T045 [P] Write navigation listener test verifying external agent dispatch of `workspaceEntered` produces same route change as human UI interaction [Story 1] [FR-010] in `src/renderer/listeners/navigation.listener.test.ts`
- [x] T046 Run full test suite (`npm test`) and fix any regressions
- [x] T047 Run typecheck (`npm run typecheck`) and fix type errors from removed fields
- [x] T048 Run lint (`npm run lint`) and fix any violations

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) completion — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) completion
- **User Story 2 (Phase 4)**: Depends on User Story 1 (Phase 3) completion (navigation listener must exist)
- **User Story 3 (Phase 5)**: No code dependency — can run in parallel with Phase 3/4 (documentation only)
- **Polish (Phase 6)**: Depends on User Stories 1 and 2 completion

### Within Each User Story (TDD)

1. Write ALL test tasks for the story (RED — tests fail)
2. Implement in dependency order (GREEN — tests pass one by one)
3. Refactor if needed
4. Checkpoint: verify story is independently testable

### Parallel Opportunities

- T010–T018: All US1 test tasks marked [P] can be written in parallel
- T019–T020: AuthGuard and WorkspaceGuard implementation can be parallel
- T027–T031: All US2 test tasks marked [P] can be written in parallel
- T041–T042, T044: Polish cleanup tasks can be parallel
- Phase 5 (constitution amendment) can run in parallel with any code phase

---

## Parallel Example: User Story 1

```bash
# Write all tests in parallel (RED):
Task: "AuthGuard renders Outlet test" in src/renderer/components/guards/AuthGuard.test.tsx
Task: "AuthGuard redirects test" in src/renderer/components/guards/AuthGuard.test.tsx
Task: "WorkspaceGuard renders Outlet test" in src/renderer/components/guards/WorkspaceGuard.test.tsx
Task: "WorkspaceGuard redirects test" in src/renderer/components/guards/WorkspaceGuard.test.tsx
Task: "Navigation listener auth tests" in src/renderer/listeners/navigation.listener.test.ts

# Then implement guards in parallel (GREEN):
Task: "Implement AuthGuard" in src/renderer/components/guards/AuthGuard.tsx
Task: "Implement WorkspaceGuard" in src/renderer/components/guards/WorkspaceGuard.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (install react-router)
2. Complete Phase 2: Foundational (router + RouterProvider + disable back/forward)
3. Complete Phase 3: User Story 1 (guards + navigation listener + route-based rendering)
4. **STOP and VALIDATE**: Test route transitions, guard redirects, reload behavior
5. App is fully navigable via routes — MVP delivered

### Incremental Delivery

1. Setup + Foundational → Router infrastructure ready
2. Add User Story 1 → Test independently → Route-based navigation works (MVP!)
3. Add User Story 2 → Test independently → Step deep-linking works
4. Add User Story 3 → Constitution formally permits the pattern
5. Polish → Fix regressions, add e2e, clean removed fields
6. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- TDD discipline: Write test (RED) → verify failure → implement (GREEN) → refactor
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- US2 depends on US1 because the navigation listener from US1 is extended in US2
- US3 (constitution) has no code dependency and can be done at any time
