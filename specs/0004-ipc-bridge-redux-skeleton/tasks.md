---
feature: IPC Bridge & Redux Store Skeleton
branch: spec/0004-ipc-bridge-redux-skeleton
created: 2026-05-27
source_plan: specs/0004-ipc-bridge-redux-skeleton/plan.md
---

# Tasks: Run 4 IPC Bridge & Redux Store Skeleton

**Input**: `specs/0004-ipc-bridge-redux-skeleton/plan.md`, especially the source-tree, public interfaces, IPC catalog, factory convention, and TDD vertical tracer-bullet sequence.

**TDD discipline**: Run 4 must proceed vertically: one RED behavior test, one minimal GREEN implementation, then repeat. Do not batch all slice tests, handler tests, endpoint tests, or listener tests ahead of implementation. Tests must exercise public interfaces and may mock only system boundaries: Electron IPC, preload bridge, filesystem, git/process commands, child process, and time. Do not mock Run 3 ACP internal collaborators such as `BoundCLISupervisor`, `BoundCLISession`, `ClientSideConnection`, slice reducers, or listener setup modules except where a test proves store assembly invocation order.

**Scope guard**: These tasks intentionally exclude ADR-0007, constitution v1.0.4, ADRs 0002-0006, `.github/copilot-instructions.md` Run 4 conventions, dependency installation for `@reduxjs/toolkit`, `react-redux`, and `@agentclientprotocol/sdk`, Run 2 data-layer work, Run 3 ACP supervisor work, RTK Query `baseQuery` and fixed tag taxonomy, and existing `app:getVersion` plus `acp:probeBoundCLI` handlers/endpoints. These tasks also exclude domain reducers, domain extra reducers, non-empty listener effect bodies, product UI beyond the existing proof surface, Step Commit writers, hook execution, MCP integration, Jira submission, and packaging changes.

**Task format**: Each task names concrete paths, explicit dependencies, and the acceptance condition that must be true before the task is marked complete.

**Factory-spec floor for every Run 4 trust-boundary factory**:
1. Happy path: valid input returns the typed shape.
2. Empty object: `{}` returns a stable named error.
3. Null: `null` returns a stable named error.
4. Undefined: `undefined` returns a stable named error.
5. Hostile malformed input: a factory-specific wrong type, unexpected key, or malicious shape returns a stable named error.
6. Partial structurally plausible input: missing one required field from an otherwise plausible shape returns a stable named error.

## Phase 1 - First store assembly vertical tracer bullet

- [ ] T001 Write the FIRST product store assembly behavior test (RED).
  - Paths: `src/renderer/store.test.ts`.
  - Dependencies: none.
  - Acceptance: The failing test asserts `createProductStore().getState()` exposes canonical initial state for all eight slices exactly: `ui` = `{ theme: 'system', sidebarOpen: true, activeView: null }`, `preferences` = `{ hydratedFromDisk: false, theme: 'system' }`, `auth` = `{ copilotLoggedIn: null, githubLoggedIn: null }`, `workspace` = `{ activeRepoPath: null, agents: null, branch: null, ahead: 0, behind: 0, dirty: false }`, `steps` = `{ entities: {}, ids: [] }`, `session` = `{ activeSessionId: null, modelId: null, modeId: null }`, `activity` = `{ entries: [], cap: 256 }`, and `copilot` = `{ capabilities: null, lastProbeAt: null }`; includes `[api.reducerPath]`; prepends listener middleware, appends RTK Query middleware, and initializes all six listener setup functions without dispatching domain actions.

- [ ] T002 Implement minimal product store assembly to pass T001 (GREEN).
  - Paths: `src/renderer/store.ts`, `src/renderer/slices/ui.ts`, `src/renderer/slices/preferences.ts`, `src/renderer/slices/auth.ts`, `src/renderer/slices/workspace.ts`, `src/renderer/slices/steps.ts`, `src/renderer/slices/session.ts`, `src/renderer/slices/activity.ts`, `src/renderer/slices/copilot.ts`, `src/renderer/listeners/acpStreamSubscription.listener.ts`, `src/renderer/listeners/preferencesPersistence.listener.ts`, `src/renderer/listeners/sessionLifecycle.listener.ts`, `src/renderer/listeners/stepLifecycle.listener.ts`, `src/renderer/listeners/transcriptCapture.listener.ts`, `src/renderer/listeners/workspaceChange.listener.ts`.
  - Dependencies: T001.
  - Acceptance: `createProductStore()`, `store`, `RootState`, `AppDispatch`, and `AppStore` are exported; reducers include all eight slices plus `[api.reducerPath]`; listener setup functions are invoked alphabetically by filename; listener bodies are empty; slice reducers and extra reducers are empty; `steps` uses `createEntityAdapter`; RTK Query middleware integrates; `store.test.ts` passes.

## Phase 2 - Slice initial-state tracer bullets

- [ ] T003 Add the `ui` slice initial-state test (RED).
  - Paths: `src/renderer/slices/ui.test.ts`.
  - Dependencies: T002.
  - Acceptance: The failing test imports the public `ui` reducer and asserts its initial state is `{ theme: 'system', sidebarOpen: true, activeView: null }`.

- [ ] T004 Refine the `ui` slice implementation (GREEN).
  - Paths: `src/renderer/slices/ui.ts`.
  - Dependencies: T003.
  - Acceptance: The `ui` slice exposes the locked initial state, has no reducers or domain extra reducers, and `ui.test.ts` passes.

- [ ] T005 Add the `preferences` slice initial-state test (RED).
  - Paths: `src/renderer/slices/preferences.test.ts`.
  - Dependencies: T004.
  - Acceptance: The failing test imports the public `preferences` reducer and asserts its initial state is `{ hydratedFromDisk: false, theme: 'system' }`.

- [ ] T006 Refine the `preferences` slice implementation (GREEN).
  - Paths: `src/renderer/slices/preferences.ts`.
  - Dependencies: T005.
  - Acceptance: The `preferences` slice exposes the locked initial state, has no reducers or domain extra reducers, and `preferences.test.ts` passes.

- [ ] T007 Add the `auth` slice initial-state test (RED).
  - Paths: `src/renderer/slices/auth.test.ts`.
  - Dependencies: T006.
  - Acceptance: The failing test imports the public `auth` reducer and asserts its initial state is `{ copilotLoggedIn: null, githubLoggedIn: null }`.

- [ ] T008 Refine the `auth` slice implementation (GREEN).
  - Paths: `src/renderer/slices/auth.ts`.
  - Dependencies: T007.
  - Acceptance: The `auth` slice exposes the locked initial state, has no reducers or domain extra reducers, and `auth.test.ts` passes.

- [ ] T009 Add the `workspace` slice initial-state test (RED).
  - Paths: `src/renderer/slices/workspace.test.ts`.
  - Dependencies: T008.
  - Acceptance: The failing test imports the public `workspace` reducer and asserts its initial state is `{ activeRepoPath: null, agents: null, branch: null, ahead: 0, behind: 0, dirty: false }`.

- [ ] T010 Refine the `workspace` slice implementation (GREEN).
  - Paths: `src/renderer/slices/workspace.ts`.
  - Dependencies: T009.
  - Acceptance: The `workspace` slice exposes the locked initial state, has no reducers or domain extra reducers, and `workspace.test.ts` passes.

- [ ] T011 Add the `steps` slice initial-state test (RED).
  - Paths: `src/renderer/slices/steps.test.ts`.
  - Dependencies: T010.
  - Acceptance: The failing test imports the public `steps` reducer and asserts its initial state is `stepsAdapter.getInitialState()` with `{ entities: {}, ids: [] }`.

- [ ] T012 Refine the `steps` slice implementation (GREEN).
  - Paths: `src/renderer/slices/steps.ts`.
  - Dependencies: T011.
  - Acceptance: The `steps` slice owns `createEntityAdapter`, exposes adapter initial state, has no reducers or domain extra reducers, and `steps.test.ts` passes.

- [ ] T013 Add the `session` slice initial-state test (RED).
  - Paths: `src/renderer/slices/session.test.ts`.
  - Dependencies: T012.
  - Acceptance: The failing test imports the public `session` reducer and asserts its initial state is `{ activeSessionId: null, modelId: null, modeId: null }`.

- [ ] T014 Refine the `session` slice implementation (GREEN).
  - Paths: `src/renderer/slices/session.ts`.
  - Dependencies: T013.
  - Acceptance: The `session` slice exposes the locked initial state, has no reducers or domain extra reducers, and `session.test.ts` passes.

- [ ] T015 Add the `activity` slice initial-state test (RED).
  - Paths: `src/renderer/slices/activity.test.ts`.
  - Dependencies: T014.
  - Acceptance: The failing test imports the public `activity` reducer and asserts its initial state is `{ entries: [], cap: 256 }`.

- [ ] T016 Refine the `activity` slice implementation (GREEN).
  - Paths: `src/renderer/slices/activity.ts`.
  - Dependencies: T015.
  - Acceptance: The `activity` slice exposes the locked initial state with cap `256`, has no reducers or domain extra reducers, and `activity.test.ts` passes.

- [ ] T017 Add the `copilot` slice initial-state test (RED).
  - Paths: `src/renderer/slices/copilot.test.ts`.
  - Dependencies: T016.
  - Acceptance: The failing test imports the public `copilot` reducer and asserts its initial state is `{ capabilities: null, lastProbeAt: null }`.

- [ ] T018 Refine the `copilot` slice implementation (GREEN).
  - Paths: `src/renderer/slices/copilot.ts`.
  - Dependencies: T017.
  - Acceptance: The `copilot` slice exposes the locked initial state, has no reducers or domain extra reducers, and `copilot.test.ts` passes.

## Phase 3 - Selectors, typed hooks, and cross-slice placeholder

- [ ] T019 Add `ui` base selector tests (RED).
  - Paths: `src/renderer/slices/ui.test.ts`.
  - Dependencies: T018.
  - Acceptance: The failing tests call selectors through a `RootState`-shaped value and assert `selectUiState`, `selectUiTheme`, `selectUiSidebarOpen`, and `selectUiActiveView` return stable public values.

- [ ] T020 Implement `ui` selectors (GREEN).
  - Paths: `src/renderer/slices/ui.selectors.ts`.
  - Dependencies: T019.
  - Acceptance: `ui` selectors follow `select<Slice><Field>` naming, import no effect-layer modules, return the locked values, and `ui.test.ts` passes.

- [ ] T021 Add `preferences` base selector tests (RED).
  - Paths: `src/renderer/slices/preferences.test.ts`.
  - Dependencies: T020.
  - Acceptance: The failing tests call selectors through a `RootState`-shaped value and assert `selectPreferencesState`, `selectPreferencesHydratedFromDisk`, and `selectPreferencesTheme` return stable public values.

- [ ] T022 Implement `preferences` selectors (GREEN).
  - Paths: `src/renderer/slices/preferences.selectors.ts`.
  - Dependencies: T021.
  - Acceptance: `preferences` selectors follow `select<Slice><Field>` naming, import no effect-layer modules, return the locked values, and `preferences.test.ts` passes.

- [ ] T023 Add `auth` base selector tests (RED).
  - Paths: `src/renderer/slices/auth.test.ts`.
  - Dependencies: T022.
  - Acceptance: The failing tests call selectors through a `RootState`-shaped value and assert `selectAuthState`, `selectAuthCopilotLoggedIn`, and `selectAuthGithubLoggedIn` return stable public values.

- [ ] T024 Implement `auth` selectors (GREEN).
  - Paths: `src/renderer/slices/auth.selectors.ts`.
  - Dependencies: T023.
  - Acceptance: `auth` selectors follow `select<Slice><Field>` naming, import no effect-layer modules, return the locked values, and `auth.test.ts` passes.

- [ ] T025 Add `workspace` base selector tests (RED).
  - Paths: `src/renderer/slices/workspace.test.ts`.
  - Dependencies: T024.
  - Acceptance: The failing tests call selectors through a `RootState`-shaped value and assert `selectWorkspaceState`, `selectWorkspaceActiveRepoPath`, `selectWorkspaceAgents`, `selectWorkspaceBranch`, `selectWorkspaceAhead`, `selectWorkspaceBehind`, and `selectWorkspaceDirty` return stable public values.

- [ ] T026 Implement `workspace` selectors (GREEN).
  - Paths: `src/renderer/slices/workspace.selectors.ts`.
  - Dependencies: T025.
  - Acceptance: `workspace` selectors follow `select<Slice><Field>` naming, import no effect-layer modules, return the locked values, and `workspace.test.ts` passes.

- [ ] T027 Add `steps` base selector tests (RED).
  - Paths: `src/renderer/slices/steps.test.ts`.
  - Dependencies: T026.
  - Acceptance: The failing tests call selectors through a `RootState`-shaped value and assert `selectStepsState`, adapter-backed `selectStepIds`, `selectStepEntities`, `selectAllSteps`, and `selectStepById` expose stable values without fresh-object churn beyond memoized adapter selectors.

- [ ] T028 Implement `steps` selectors (GREEN).
  - Paths: `src/renderer/slices/steps.selectors.ts`, `src/renderer/slices/steps.ts`.
  - Dependencies: T027.
  - Acceptance: `steps` selectors use `stepsAdapter.getSelectors`, follow naming conventions, import no effect-layer modules, return stable adapter values, and `steps.test.ts` passes.

- [ ] T029 Add `session` base selector tests (RED).
  - Paths: `src/renderer/slices/session.test.ts`.
  - Dependencies: T028.
  - Acceptance: The failing tests call selectors through a `RootState`-shaped value and assert `selectSessionState`, `selectSessionActiveSessionId`, `selectSessionModelId`, and `selectSessionModeId` return stable public values.

- [ ] T030 Implement `session` selectors (GREEN).
  - Paths: `src/renderer/slices/session.selectors.ts`.
  - Dependencies: T029.
  - Acceptance: `session` selectors follow `select<Slice><Field>` naming, import no effect-layer modules, return the locked values, and `session.test.ts` passes.

- [ ] T031 Add `activity` base selector tests (RED).
  - Paths: `src/renderer/slices/activity.test.ts`.
  - Dependencies: T030.
  - Acceptance: The failing tests call selectors through a `RootState`-shaped value and assert `selectActivityState`, `selectActivityEntries`, and `selectActivityCap` return stable public values.

- [ ] T032 Implement `activity` selectors (GREEN).
  - Paths: `src/renderer/slices/activity.selectors.ts`.
  - Dependencies: T031.
  - Acceptance: `activity` selectors follow `select<Slice><Field>` naming, memoize any fresh-array/derived selectors if added, import no effect-layer modules, return locked values, and `activity.test.ts` passes.

- [ ] T033 Add `copilot` base selector tests (RED).
  - Paths: `src/renderer/slices/copilot.test.ts`.
  - Dependencies: T032.
  - Acceptance: The failing tests call selectors through a `RootState`-shaped value and assert `selectCopilotState`, `selectCopilotCapabilities`, and `selectCopilotLastProbeAt` return stable public values.

- [ ] T034 Implement `copilot` selectors (GREEN).
  - Paths: `src/renderer/slices/copilot.selectors.ts`.
  - Dependencies: T033.
  - Acceptance: `copilot` selectors follow `select<Slice><Field>` naming, import no effect-layer modules, return locked values, and `copilot.test.ts` passes.

- [ ] T035 Add typed store hooks contract test (RED).
  - Paths: `src/renderer/store.test.ts`, `src/renderer/hooks/store.ts`.
  - Dependencies: T034.
  - Acceptance: The failing type-level test imports `useAppDispatch`, `useAppSelector`, and `useAppStore` and proves they align with `AppDispatch`, `RootState`, and `AppStore` from `src/renderer/store.ts`.

- [ ] T036 Implement typed store hooks (GREEN).
  - Paths: `src/renderer/hooks/store.ts`.
  - Dependencies: T035.
  - Acceptance: Hooks use React Redux `.withTypes()` only, live only in `src/renderer/hooks/store.ts`, import no Electron/Node APIs, and the typed hook contract passes.

- [ ] T037 Add cross-slice selector placeholder test (RED).
  - Paths: `src/renderer/store.test.ts`, `src/renderer/selectors/crossSlice.selectors.ts`.
  - Dependencies: T036.
  - Acceptance: The failing test imports the reserved cross-slice selector module and asserts it exposes only a placeholder surface with no domain derivation.

- [ ] T038 Implement the cross-slice selector placeholder (GREEN).
  - Paths: `src/renderer/selectors/crossSlice.selectors.ts`.
  - Dependencies: T037.
  - Acceptance: The module exports the placeholder only, imports no effect-layer modules, contains no domain derivation, and the placeholder test passes.

## Phase 4 - Listener presence and store-order tracer bullets

- [ ] T039 Add ACP stream subscription listener presence test (RED).
  - Paths: `src/renderer/listeners/acpStreamSubscription.listener.test.ts`.
  - Dependencies: T038.
  - Acceptance: The failing test imports `setupAcpStreamSubscriptionListener` and its topic descriptor, passes a fake `startListening` API, and asserts no domain actions or stream subscriptions are registered in Run 4.

- [ ] T040 Implement ACP stream subscription listener stub (GREEN).
  - Paths: `src/renderer/listeners/acpStreamSubscription.listener.ts`.
  - Dependencies: T039.
  - Acceptance: The listener exports the descriptor and `setupAcpStreamSubscriptionListener(startListening)`, accepts the API, registers no effect body, owns the single future ACP stream subscription topic, and its presence test passes.

- [ ] T041 Add preferences persistence listener presence test (RED).
  - Paths: `src/renderer/listeners/preferencesPersistence.listener.test.ts`.
  - Dependencies: T040.
  - Acceptance: The failing test imports `setupPreferencesPersistenceListener` and its topic descriptor, passes a fake `startListening` API, and asserts no domain actions or persistence writes are registered in Run 4.

- [ ] T042 Implement preferences persistence listener stub (GREEN).
  - Paths: `src/renderer/listeners/preferencesPersistence.listener.ts`.
  - Dependencies: T041.
  - Acceptance: The listener exports the descriptor and `setupPreferencesPersistenceListener(startListening)`, accepts the API, registers no effect body, and its presence test passes.

- [ ] T043 Add session lifecycle listener presence test (RED).
  - Paths: `src/renderer/listeners/sessionLifecycle.listener.test.ts`.
  - Dependencies: T042.
  - Acceptance: The failing test imports `setupSessionLifecycleListener` and its topic descriptor, passes a fake `startListening` API, and asserts no session/model/mode effects are registered in Run 4.

- [ ] T044 Implement session lifecycle listener stub (GREEN).
  - Paths: `src/renderer/listeners/sessionLifecycle.listener.ts`.
  - Dependencies: T043.
  - Acceptance: The listener exports the descriptor and `setupSessionLifecycleListener(startListening)`, accepts the API, registers no effect body, and its presence test passes.

- [ ] T045 Add step lifecycle listener presence test (RED).
  - Paths: `src/renderer/listeners/stepLifecycle.listener.test.ts`.
  - Dependencies: T044.
  - Acceptance: The failing test imports `setupStepLifecycleListener` and its topic descriptor, passes a fake `startListening` API, and asserts no step lifecycle effects are registered in Run 4.

- [ ] T046 Implement step lifecycle listener stub (GREEN).
  - Paths: `src/renderer/listeners/stepLifecycle.listener.ts`.
  - Dependencies: T045.
  - Acceptance: The listener exports the descriptor and `setupStepLifecycleListener(startListening)`, accepts the API, registers no effect body, and its presence test passes.

- [ ] T047 Add transcript capture listener presence test (RED).
  - Paths: `src/renderer/listeners/transcriptCapture.listener.test.ts`.
  - Dependencies: T046.
  - Acceptance: The failing test imports `setupTranscriptCaptureListener` and its topic descriptor, passes a fake `startListening` API, and asserts no transcript capture effects are registered in Run 4.

- [ ] T048 Implement transcript capture listener stub (GREEN).
  - Paths: `src/renderer/listeners/transcriptCapture.listener.ts`.
  - Dependencies: T047.
  - Acceptance: The listener exports the descriptor and `setupTranscriptCaptureListener(startListening)`, accepts the API, registers no effect body, and its presence test passes.

- [ ] T049 Add workspace change listener presence test (RED).
  - Paths: `src/renderer/listeners/workspaceChange.listener.test.ts`.
  - Dependencies: T048.
  - Acceptance: The failing test imports `setupWorkspaceChangeListener` and its topic descriptor, passes a fake `startListening` API, and asserts no workspace-change effects are registered in Run 4.

- [ ] T050 Implement workspace change listener stub (GREEN).
  - Paths: `src/renderer/listeners/workspaceChange.listener.ts`.
  - Dependencies: T049.
  - Acceptance: The listener exports the descriptor and `setupWorkspaceChangeListener(startListening)`, accepts the API, registers no effect body, and its presence test passes.

- [ ] T051 Add store listener initialization order test (RED).
  - Paths: `src/renderer/store.test.ts`.
  - Dependencies: T050.
  - Acceptance: The failing test proves `createProductStore()` invokes setup functions alphabetically by filename: `setupAcpStreamSubscriptionListener`, `setupPreferencesPersistenceListener`, `setupSessionLifecycleListener`, `setupStepLifecycleListener`, `setupTranscriptCaptureListener`, `setupWorkspaceChangeListener`.

- [ ] T052 Enforce listener initialization order in store assembly (GREEN).
  - Paths: `src/renderer/store.ts`.
  - Dependencies: T051.
  - Acceptance: Store assembly preserves the ADR-0007 alphabetical order, listener setup still dispatches no domain actions, and `store.test.ts` passes.

## Phase 5 - Provider mount tracer bullet

- [ ] T053 Add renderer Provider mount behavior test (RED).
  - Paths: `src/renderer/index.test.tsx`, `src/renderer/index.tsx`.
  - Dependencies: T052.
  - Acceptance: The failing test proves the existing proof UI renders through exactly one React Redux `<Provider>` using the product `store` from `src/renderer/store.ts`, and that the old inline `proofStore` path is gone.

- [ ] T054 Mount the product Provider around the existing proof UI (GREEN).
  - Paths: `src/renderer/index.tsx`.
  - Dependencies: T053.
  - Acceptance: `index.tsx` imports `store` from `src/renderer/store.ts`, wraps the existing proof rendering in `<Provider store={store}>`, preserves current proof dispatches and display behavior, and the renderer Provider test passes.

## Phase 6 - Preload bridge extension tracer bullets

- [ ] T055 Add `workspace:read` preload bridge test (RED).
  - Paths: `src/preload/index.test.ts`.
  - Dependencies: T054.
  - Acceptance: The failing test proves the preload bridge exposes one narrow renderer-callable method for `workspace:read` and does not expose raw `ipcRenderer`, Electron, or Node APIs.

- [ ] T056 Implement the `workspace:read` preload bridge method (GREEN).
  - Paths: `src/preload/index.ts`.
  - Dependencies: T055.
  - Acceptance: The bridge invokes `workspace:read` through the existing narrow pattern, exposes no raw IPC surface, preserves existing `app:getVersion` and `acp:probeBoundCLI` methods, and `index.test.ts` passes.

- [ ] T057 Add `git:read` preload bridge test (RED).
  - Paths: `src/preload/index.test.ts`.
  - Dependencies: T056.
  - Acceptance: The failing test proves the preload bridge exposes one narrow renderer-callable method for `git:read` and does not expose raw `ipcRenderer`.

- [ ] T058 Implement the `git:read` preload bridge method (GREEN).
  - Paths: `src/preload/index.ts`.
  - Dependencies: T057.
  - Acceptance: The bridge invokes `git:read` through the existing narrow pattern, exposes no raw IPC surface, preserves earlier bridge methods, and `index.test.ts` passes.

- [ ] T059 Add `steps:read` preload bridge test (RED).
  - Paths: `src/preload/index.test.ts`.
  - Dependencies: T058.
  - Acceptance: The failing test proves the preload bridge exposes one narrow renderer-callable method for `steps:read` and does not expose raw `ipcRenderer`.

- [ ] T060 Implement the `steps:read` preload bridge method (GREEN).
  - Paths: `src/preload/index.ts`.
  - Dependencies: T059.
  - Acceptance: The bridge invokes `steps:read` through the existing narrow pattern, exposes no raw IPC surface, preserves earlier bridge methods, and `index.test.ts` passes.

- [ ] T061 Add `preferences:read` preload bridge test (RED).
  - Paths: `src/preload/index.test.ts`.
  - Dependencies: T060.
  - Acceptance: The failing test proves the preload bridge exposes one narrow renderer-callable method for `preferences:read` and does not expose raw `ipcRenderer`.

- [ ] T062 Implement the `preferences:read` preload bridge method (GREEN).
  - Paths: `src/preload/index.ts`.
  - Dependencies: T061.
  - Acceptance: The bridge invokes `preferences:read` through the existing narrow pattern, exposes no raw IPC surface, preserves earlier bridge methods, and `index.test.ts` passes.

- [ ] T063 Add `preferences:write` preload bridge test (RED).
  - Paths: `src/preload/index.test.ts`.
  - Dependencies: T062.
  - Acceptance: The failing test proves the preload bridge exposes one narrow renderer-callable method for `preferences:write`, marks it as the only Run 4 write-side bridge method, and does not expose raw `ipcRenderer`.

- [ ] T064 Implement the `preferences:write` preload bridge method (GREEN).
  - Paths: `src/preload/index.ts`.
  - Dependencies: T063.
  - Acceptance: The bridge invokes `preferences:write` through the existing narrow pattern, exposes no raw IPC surface, preserves earlier bridge methods, and `index.test.ts` passes.

- [ ] T065 Add `auth:status` preload bridge test (RED).
  - Paths: `src/preload/index.test.ts`.
  - Dependencies: T064.
  - Acceptance: The failing test proves the preload bridge exposes one narrow renderer-callable method for `auth:status` and does not expose raw `ipcRenderer`.

- [ ] T066 Implement the `auth:status` preload bridge method (GREEN).
  - Paths: `src/preload/index.ts`.
  - Dependencies: T065.
  - Acceptance: The bridge invokes `auth:status` through the existing narrow pattern, exposes no raw IPC surface, preserves earlier bridge methods, and `index.test.ts` passes.

- [ ] T067 Add `session:listAcp` preload bridge test (RED).
  - Paths: `src/preload/index.test.ts`.
  - Dependencies: T066.
  - Acceptance: The failing test proves the preload bridge exposes one narrow renderer-callable method for `session:listAcp` and does not expose raw `ipcRenderer`.

- [ ] T068 Implement the `session:listAcp` preload bridge method (GREEN).
  - Paths: `src/preload/index.ts`.
  - Dependencies: T067.
  - Acceptance: The bridge invokes `session:listAcp` through the existing narrow pattern, exposes no raw IPC surface, preserves earlier bridge methods, and `index.test.ts` passes.

- [ ] T069 Add `session:createAcp` preload bridge test (RED).
  - Paths: `src/preload/index.test.ts`.
  - Dependencies: T068.
  - Acceptance: The failing test proves the preload bridge exposes one narrow renderer-callable method for `session:createAcp` and does not expose raw `ipcRenderer`.

- [ ] T070 Implement the `session:createAcp` preload bridge method (GREEN).
  - Paths: `src/preload/index.ts`.
  - Dependencies: T069.
  - Acceptance: The bridge invokes `session:createAcp` through the existing narrow pattern, exposes no raw IPC surface, preserves earlier bridge methods, and `index.test.ts` passes.

- [ ] T071 Add `activity:read` preload bridge test (RED).
  - Paths: `src/preload/index.test.ts`.
  - Dependencies: T070.
  - Acceptance: The failing test proves the preload bridge exposes one narrow renderer-callable method for `activity:read` and does not expose raw `ipcRenderer`.

- [ ] T072 Implement the `activity:read` preload bridge method (GREEN).
  - Paths: `src/preload/index.ts`.
  - Dependencies: T071.
  - Acceptance: The bridge invokes `activity:read` through the existing narrow pattern, exposes no raw IPC surface, preserves earlier bridge methods, and `index.test.ts` passes.

## Phase 7 - Main IPC handler tracer bullets

- [ ] T073 Add `workspace:read` main factory floor tests (RED).
  - Paths: `src/main/ipc/workspace.factory.spec.ts`.
  - Dependencies: T072.
  - Acceptance: The failing spec covers all six factory-floor cases for `workspace:read` request and response payloads, including active repo path and agent manifest summary.

- [ ] T074 Implement `workspace:read` main factory (GREEN).
  - Paths: `src/main/ipc/workspace.factory.ts`.
  - Dependencies: T073.
  - Acceptance: The factory returns typed workspace payloads for valid input, returns stable named errors for invalid input, and `workspace.factory.spec.ts` passes.

- [ ] T075 Add `workspace:read` handler success test (RED).
  - Paths: `src/main/ipc/workspace.test.ts`.
  - Dependencies: T074.
  - Acceptance: The failing test registers the public handler through fake `ipcMain.handle`, invokes `workspace:read`, and asserts it reads active workspace plus agent manifest summary through existing Run 2 data-layer capabilities.

- [ ] T076 Implement `workspace:read` handler success path (GREEN).
  - Paths: `src/main/ipc/workspace.ts`, `src/main/index.ts`.
  - Dependencies: T075.
  - Acceptance: The handler validates inputs and output, uses existing workspace/agent manifest data-layer APIs, registers exactly once at boot, returns no success-shaped fallback, and `workspace.test.ts` passes.

- [ ] T077 Add `workspace:read` structured logging and failure test (RED).
  - Paths: `src/main/ipc/workspace.test.ts`.
  - Dependencies: T076.
  - Acceptance: The failing test asserts success and failure logs include channel, context, success flag, latency, and error details, and that data-layer errors propagate explicitly.

- [ ] T078 Implement `workspace:read` structured logging and failure path (GREEN).
  - Paths: `src/main/ipc/workspace.ts`.
  - Dependencies: T077.
  - Acceptance: Success and failure paths log required structured fields, preserve explicit errors, and all workspace IPC tests pass.

- [ ] T079 Add `git:read` main factory floor tests (RED).
  - Paths: `src/main/ipc/git.factory.spec.ts`.
  - Dependencies: T078.
  - Acceptance: The failing spec covers all six factory-floor cases for `git:read` request and response payloads, including branch, ahead, behind, dirty, and uncommitted paths.

- [ ] T080 Implement `git:read` main factory (GREEN).
  - Paths: `src/main/ipc/git.factory.ts`.
  - Dependencies: T079.
  - Acceptance: The factory returns typed git payloads for valid input, returns stable named errors for invalid input, and `git.factory.spec.ts` passes.

- [ ] T081 Add `git:read` handler success test (RED).
  - Paths: `src/main/ipc/git.test.ts`.
  - Dependencies: T080.
  - Acceptance: The failing test registers the public handler through fake `ipcMain.handle`, invokes `git:read`, and asserts it reads branch state plus uncommitted paths through existing Run 2 git readers while mocking only git/filesystem boundaries.

- [ ] T082 Implement `git:read` handler success path (GREEN).
  - Paths: `src/main/ipc/git.ts`, `src/main/index.ts`.
  - Dependencies: T081.
  - Acceptance: The handler validates inputs and output, uses existing Run 2 git readers, registers exactly once at boot, returns no success-shaped fallback, and `git.test.ts` passes.

- [ ] T083 Add `git:read` structured logging and failure test (RED).
  - Paths: `src/main/ipc/git.test.ts`.
  - Dependencies: T082.
  - Acceptance: The failing test asserts success and failure logs include channel, context, success flag, latency, and error details, and that git reader errors propagate explicitly.

- [ ] T084 Implement `git:read` structured logging and failure path (GREEN).
  - Paths: `src/main/ipc/git.ts`.
  - Dependencies: T083.
  - Acceptance: Success and failure paths log required structured fields, preserve explicit errors, and all git IPC tests pass.

- [ ] T085 Add `steps:read` main factory floor tests (RED).
  - Paths: `src/main/ipc/steps.factory.spec.ts`.
  - Dependencies: T084.
  - Acceptance: The failing spec covers all six factory-floor cases for `steps:read` request and response payloads, including Concierge-Step trailer-derived state.

- [ ] T086 Implement `steps:read` main factory (GREEN).
  - Paths: `src/main/ipc/steps.factory.ts`.
  - Dependencies: T085.
  - Acceptance: The factory returns typed step-state payloads for valid input, returns stable named errors for invalid input, and `steps.factory.spec.ts` passes.

- [ ] T087 Add `steps:read` handler success test (RED).
  - Paths: `src/main/ipc/steps.test.ts`.
  - Dependencies: T086.
  - Acceptance: The failing test registers the public handler through fake `ipcMain.handle`, invokes `steps:read`, and asserts it reads Concierge-Step trailer recovery state only, without adding Step Commit writing.

- [ ] T088 Implement `steps:read` handler success path (GREEN).
  - Paths: `src/main/ipc/steps.ts`, `src/main/index.ts`.
  - Dependencies: T087.
  - Acceptance: The handler validates inputs and output, uses existing Run 2 trailer recovery APIs, registers exactly once at boot, performs no writes, returns no success-shaped fallback, and `steps.test.ts` passes.

- [ ] T089 Add `steps:read` structured logging and failure test (RED).
  - Paths: `src/main/ipc/steps.test.ts`.
  - Dependencies: T088.
  - Acceptance: The failing test asserts success and failure logs include channel, context, success flag, latency, and error details, and that trailer-reader errors propagate explicitly.

- [ ] T090 Implement `steps:read` structured logging and failure path (GREEN).
  - Paths: `src/main/ipc/steps.ts`.
  - Dependencies: T089.
  - Acceptance: Success and failure paths log required structured fields, preserve explicit errors, and all steps IPC tests pass.

- [ ] T091 Add `preferences:read` main factory floor tests (RED).
  - Paths: `src/main/ipc/preferences.factory.spec.ts`.
  - Dependencies: T090.
  - Acceptance: The failing spec covers all six factory-floor cases for `preferences:read` request and response payloads, including persisted minimal preferences.

- [ ] T092 Implement `preferences:read` main factory support (GREEN).
  - Paths: `src/main/ipc/preferences.factory.ts`.
  - Dependencies: T091.
  - Acceptance: The factory returns typed preference-read payloads for valid input, returns stable named errors for invalid input, and the read cases in `preferences.factory.spec.ts` pass.

- [ ] T093 Add `preferences:read` handler success test (RED).
  - Paths: `src/main/ipc/preferences.test.ts`.
  - Dependencies: T092.
  - Acceptance: The failing test registers the public handler through fake `ipcMain.handle`, invokes `preferences:read`, and asserts it reads minimal persisted preferences from the sanctioned filesystem path.

- [ ] T094 Implement `preferences:read` handler success path (GREEN).
  - Paths: `src/main/ipc/preferences.ts`, `src/main/index.ts`.
  - Dependencies: T093.
  - Acceptance: The handler validates inputs and output, reads existing preferences storage without writing, registers exactly once at boot, returns no success-shaped fallback, and the read handler test passes.

- [ ] T095 Add `preferences:read` structured logging and failure test (RED).
  - Paths: `src/main/ipc/preferences.test.ts`.
  - Dependencies: T094.
  - Acceptance: The failing test asserts success and failure logs include channel, context, success flag, latency, and error details, and that filesystem read errors propagate explicitly.

- [ ] T096 Implement `preferences:read` structured logging and failure path (GREEN).
  - Paths: `src/main/ipc/preferences.ts`.
  - Dependencies: T095.
  - Acceptance: Success and failure paths log required structured fields, preserve explicit errors, and all preference-read IPC tests pass.

- [ ] T097 Add `preferences:write` main factory floor tests (RED).
  - Paths: `src/main/ipc/preferences.factory.spec.ts`.
  - Dependencies: T096.
  - Acceptance: The failing spec extends `preferences.factory.spec.ts` with all six factory-floor cases for `preferences:write` request and response payloads, including a hostile malformed theme or unexpected write shape.

- [ ] T098 Implement `preferences:write` main factory support (GREEN).
  - Paths: `src/main/ipc/preferences.factory.ts`.
  - Dependencies: T097.
  - Acceptance: The factory returns typed preference-write payloads for valid input, returns stable named errors for invalid input, preserves read factory behavior, and all preferences factory cases pass.

- [ ] T099 Add `preferences:write` handler success test (RED).
  - Paths: `src/main/ipc/preferences.test.ts`.
  - Dependencies: T098.
  - Acceptance: The failing test registers the public handler through fake `ipcMain.handle`, invokes `preferences:write`, asserts it is the only Run 4 write-side handler, and proves it uses the existing Run 2 safe-write path.

- [ ] T100 Implement `preferences:write` handler success path (GREEN).
  - Paths: `src/main/ipc/preferences.ts`, `src/main/index.ts`.
  - Dependencies: T099.
  - Acceptance: The handler validates inputs and output, persists minimal preferences through existing safe-write helpers, registers exactly once at boot, no other Run 4 write handler exists, and the write handler test passes.

- [ ] T101 Add `preferences:write` structured logging and failure test (RED).
  - Paths: `src/main/ipc/preferences.test.ts`.
  - Dependencies: T100.
  - Acceptance: The failing test asserts success and failure logs include channel, context, success flag, latency, and error details, and that safe-write errors propagate explicitly.

- [ ] T102 Implement `preferences:write` structured logging and failure path (GREEN).
  - Paths: `src/main/ipc/preferences.ts`.
  - Dependencies: T101.
  - Acceptance: Success and failure paths log required structured fields, preserve explicit errors, keep `preferences:write` as the only Run 4 write channel, and all preferences IPC tests pass.

- [ ] T103 Add `auth:status` main factory floor tests (RED).
  - Paths: `src/main/ipc/auth.factory.spec.ts`.
  - Dependencies: T102.
  - Acceptance: The failing spec covers all six factory-floor cases for `auth:status` request and response payloads, including nullable `copilotLoggedIn` and `githubLoggedIn` booleans.

- [ ] T104 Implement `auth:status` main factory (GREEN).
  - Paths: `src/main/ipc/auth.factory.ts`.
  - Dependencies: T103.
  - Acceptance: The factory returns typed auth status payloads for valid input, returns stable named errors for invalid input, and `auth.factory.spec.ts` passes.

- [ ] T105 Add `auth:status` handler success test (RED).
  - Paths: `src/main/ipc/auth.test.ts`.
  - Dependencies: T104.
  - Acceptance: The failing test registers the public handler through fake `ipcMain.handle`, invokes `auth:status`, fakes only external command/process boundaries, and asserts it reports Copilot and GitHub CLI login status without initiating login.

- [ ] T106 Implement `auth:status` handler success path (GREEN).
  - Paths: `src/main/ipc/auth.ts`, `src/main/index.ts`.
  - Dependencies: T105.
  - Acceptance: The handler validates inputs and output, checks status without side effects, registers exactly once at boot, returns no success-shaped fallback, and `auth.test.ts` passes.

- [ ] T107 Add `auth:status` structured logging and failure test (RED).
  - Paths: `src/main/ipc/auth.test.ts`.
  - Dependencies: T106.
  - Acceptance: The failing test asserts success and failure logs include channel, context, success flag, latency, and error details, and that process-boundary errors propagate explicitly.

- [ ] T108 Implement `auth:status` structured logging and failure path (GREEN).
  - Paths: `src/main/ipc/auth.ts`.
  - Dependencies: T107.
  - Acceptance: Success and failure paths log required structured fields, preserve explicit errors, never start login flows, and all auth IPC tests pass.

- [ ] T109 Add `session:listAcp` main factory floor tests (RED).
  - Paths: `src/main/ipc/session.factory.spec.ts`.
  - Dependencies: T108.
  - Acceptance: The failing spec covers all six factory-floor cases for `session:listAcp` request and response payloads, including typed ACP session summaries.

- [ ] T110 Implement `session:listAcp` main factory support (GREEN).
  - Paths: `src/main/ipc/session.factory.ts`.
  - Dependencies: T109.
  - Acceptance: The factory returns typed ACP session-list payloads for valid input, returns stable named errors for invalid input, and the list cases in `session.factory.spec.ts` pass.

- [ ] T111 Add `session:listAcp` handler success test (RED).
  - Paths: `src/main/ipc/session.test.ts`.
  - Dependencies: T110.
  - Acceptance: The failing test registers the public handler through fake `ipcMain.handle`, invokes `session:listAcp`, instantiates real Run 3 ACP modules with fake child-process/filesystem/time boundaries as needed, and does not mock `BoundCLISupervisor`, `BoundCLISession`, or ACP SDK connection types.

- [ ] T112 Implement `session:listAcp` handler success path (GREEN).
  - Paths: `src/main/ipc/session.ts`, `src/main/index.ts`.
  - Dependencies: T111.
  - Acceptance: The handler validates inputs and output, uses the Run 3 ACP data-layer contract to list sessions, registers exactly once at boot, returns no success-shaped fallback, and the list handler test passes.

- [ ] T113 Add `session:listAcp` structured logging and failure test (RED).
  - Paths: `src/main/ipc/session.test.ts`.
  - Dependencies: T112.
  - Acceptance: The failing test asserts success and failure logs include channel, context, success flag, latency, and error details, and that ACP session-list errors propagate explicitly.

- [ ] T114 Implement `session:listAcp` structured logging and failure path (GREEN).
  - Paths: `src/main/ipc/session.ts`.
  - Dependencies: T113.
  - Acceptance: Success and failure paths log required structured fields, preserve explicit errors, and all session-list IPC tests pass.

- [ ] T115 Add `session:createAcp` main factory floor tests (RED).
  - Paths: `src/main/ipc/session.factory.spec.ts`.
  - Dependencies: T114.
  - Acceptance: The failing spec extends `session.factory.spec.ts` with all six factory-floor cases for `session:createAcp` request and response payloads, including working directory, optional MCP server metadata, mode/model request fields, and created session identity.

- [ ] T116 Implement `session:createAcp` main factory support (GREEN).
  - Paths: `src/main/ipc/session.factory.ts`.
  - Dependencies: T115.
  - Acceptance: The factory returns typed ACP session-create payloads for valid input, returns stable named errors for invalid input, preserves list factory behavior, and all session factory cases pass.

- [ ] T117 Add `session:createAcp` handler success test (RED).
  - Paths: `src/main/ipc/session.test.ts`.
  - Dependencies: T116.
  - Acceptance: The failing test registers the public handler through fake `ipcMain.handle`, invokes `session:createAcp`, instantiates real Run 3 ACP modules with fake child-process/filesystem/time boundaries as needed, creates an ACP session through the Run 3 contract, and does not mock `BoundCLISupervisor`, `BoundCLISession`, or ACP SDK connection types.

- [ ] T118 Implement `session:createAcp` handler success path (GREEN).
  - Paths: `src/main/ipc/session.ts`, `src/main/index.ts`.
  - Dependencies: T117.
  - Acceptance: The handler validates inputs and output, uses the Run 3 ACP supervisor/session contract to create a session, respects Run 3 mode/model policy, registers exactly once at boot, returns no success-shaped fallback, and the create handler test passes.

- [ ] T119 Add `session:createAcp` structured logging and failure test (RED).
  - Paths: `src/main/ipc/session.test.ts`.
  - Dependencies: T118.
  - Acceptance: The failing test asserts success and failure logs include channel, context, success flag, latency, and error details, and that ACP session-create errors propagate explicitly.

- [ ] T120 Implement `session:createAcp` structured logging and failure path (GREEN).
  - Paths: `src/main/ipc/session.ts`.
  - Dependencies: T119.
  - Acceptance: Success and failure paths log required structured fields, preserve explicit errors, dispose/cleanup according to existing Run 3 contracts when creation fails, and all session IPC tests pass.

- [ ] T121 Add `activity:read` main factory floor tests (RED).
  - Paths: `src/main/ipc/activity.factory.spec.ts`.
  - Dependencies: T120.
  - Acceptance: The failing spec covers all six factory-floor cases for `activity:read` request and response payloads, including capped structured activity entries.

- [ ] T122 Implement `activity:read` main factory (GREEN).
  - Paths: `src/main/ipc/activity.factory.ts`.
  - Dependencies: T121.
  - Acceptance: The factory returns typed activity payloads for valid input, returns stable named errors for invalid input, enforces renderer-safe capped output shape, and `activity.factory.spec.ts` passes.

- [ ] T123 Add `activity:read` handler success test (RED).
  - Paths: `src/main/ipc/activity.test.ts`.
  - Dependencies: T122.
  - Acceptance: The failing test registers the public handler through fake `ipcMain.handle`, invokes `activity:read`, fakes filesystem log reads only at the boundary, and asserts it returns at most 256 structured entries for renderer cache use.

- [ ] T124 Implement `activity:read` handler success path (GREEN).
  - Paths: `src/main/ipc/activity.ts`, `src/main/index.ts`.
  - Dependencies: T123.
  - Acceptance: The handler validates inputs and output, tails structured activity logs from the pino log path, caps entries at 256, does not wire transcript capture listener behavior, registers exactly once at boot, and `activity.test.ts` passes.

- [ ] T125 Add `activity:read` structured logging and failure test (RED).
  - Paths: `src/main/ipc/activity.test.ts`.
  - Dependencies: T124.
  - Acceptance: The failing test asserts success and failure logs include channel, context, success flag, latency, and error details, and that filesystem log read errors propagate explicitly.

- [ ] T126 Implement `activity:read` structured logging and failure path (GREEN).
  - Paths: `src/main/ipc/activity.ts`.
  - Dependencies: T125.
  - Acceptance: Success and failure paths log required structured fields, preserve explicit errors, and all activity IPC tests pass.

## Phase 8 - Renderer endpoint and renderer-entry factory tracer bullets

- [ ] T127 Add `workspace` renderer-entry factory floor tests (RED).
  - Paths: `src/renderer/api/workspace.factory.spec.ts`.
  - Dependencies: T126.
  - Acceptance: The failing spec covers all six factory-floor cases for unknown preload results entering the renderer for workspace state.

- [ ] T128 Implement `workspace` renderer-entry factory (GREEN).
  - Paths: `src/renderer/api/workspace.factory.ts`.
  - Dependencies: T127.
  - Acceptance: The factory validates preload-returned `unknown`, returns typed workspace data or stable named errors, imports no Electron/Node APIs, and `workspace.factory.spec.ts` passes.

- [ ] T129 Add `workspace` endpoint behavior test (RED).
  - Paths: `src/renderer/api/workspace.endpoint.test.ts`.
  - Dependencies: T128.
  - Acceptance: The failing endpoint test uses the real preload bridge mock, calls `workspace:read` through `ipcBaseQuery`, validates through the renderer factory, preserves IPC/factory errors, and provides the `Workspace` tag.

- [ ] T130 Implement `workspace` endpoint (GREEN).
  - Paths: `src/renderer/api/workspace.endpoint.ts`, `src/renderer/api/baseQuery.ts`, `src/renderer/api/index.ts`.
  - Dependencies: T129.
  - Acceptance: The endpoint is injected/exported through the API surface, uses only the preload bridge, provides `Workspace`, preserves fixed tag taxonomy, imports no Electron/Node APIs, and `workspace.endpoint.test.ts` passes.

- [ ] T131 Add `git` renderer-entry factory floor tests (RED).
  - Paths: `src/renderer/api/git.factory.spec.ts`.
  - Dependencies: T130.
  - Acceptance: The failing spec covers all six factory-floor cases for unknown preload results entering the renderer for git state.

- [ ] T132 Implement `git` renderer-entry factory (GREEN).
  - Paths: `src/renderer/api/git.factory.ts`.
  - Dependencies: T131.
  - Acceptance: The factory validates preload-returned `unknown`, returns typed git data or stable named errors, imports no Electron/Node APIs, and `git.factory.spec.ts` passes.

- [ ] T133 Add `git` endpoint behavior test (RED).
  - Paths: `src/renderer/api/git.endpoint.test.ts`.
  - Dependencies: T132.
  - Acceptance: The failing endpoint test uses the real preload bridge mock, calls `git:read` through `ipcBaseQuery`, validates through the renderer factory, preserves IPC/factory errors, and provides `GitState` plus any required `Workspace` tags.

- [ ] T134 Implement `git` endpoint (GREEN).
  - Paths: `src/renderer/api/git.endpoint.ts`, `src/renderer/api/baseQuery.ts`, `src/renderer/api/index.ts`.
  - Dependencies: T133.
  - Acceptance: The endpoint is injected/exported through the API surface, uses only the preload bridge, provides `GitState` and necessary `Workspace` tags, preserves fixed tag taxonomy, imports no Electron/Node APIs, and `git.endpoint.test.ts` passes.

- [ ] T135 Add `steps` renderer-entry factory floor tests (RED).
  - Paths: `src/renderer/api/steps.factory.spec.ts`.
  - Dependencies: T134.
  - Acceptance: The failing spec covers all six factory-floor cases for unknown preload results entering the renderer for step state.

- [ ] T136 Implement `steps` renderer-entry factory (GREEN).
  - Paths: `src/renderer/api/steps.factory.ts`.
  - Dependencies: T135.
  - Acceptance: The factory validates preload-returned `unknown`, returns typed step-state data or stable named errors, imports no Electron/Node APIs, and `steps.factory.spec.ts` passes.

- [ ] T137 Add `steps` endpoint behavior test (RED).
  - Paths: `src/renderer/api/steps.endpoint.test.ts`.
  - Dependencies: T136.
  - Acceptance: The failing endpoint test uses the real preload bridge mock, calls `steps:read` through `ipcBaseQuery`, validates through the renderer factory, preserves IPC/factory errors, and provides `StepState` plus `Step` tags as appropriate.

- [ ] T138 Implement `steps` endpoint (GREEN).
  - Paths: `src/renderer/api/steps.endpoint.ts`, `src/renderer/api/baseQuery.ts`, `src/renderer/api/index.ts`.
  - Dependencies: T137.
  - Acceptance: The endpoint is injected/exported through the API surface, uses only the preload bridge, provides `StepState` and appropriate `Step` tags, preserves fixed tag taxonomy, imports no Electron/Node APIs, and `steps.endpoint.test.ts` passes.

- [ ] T139 Add `preferences:read` renderer-entry factory floor tests (RED).
  - Paths: `src/renderer/api/preferences.factory.spec.ts`.
  - Dependencies: T138.
  - Acceptance: The failing spec covers all six factory-floor cases for unknown preload results entering the renderer for preference reads.

- [ ] T140 Implement `preferences:read` renderer-entry factory support (GREEN).
  - Paths: `src/renderer/api/preferences.factory.ts`.
  - Dependencies: T139.
  - Acceptance: The factory validates preload-returned `unknown`, returns typed preference-read data or stable named errors, imports no Electron/Node APIs, and the read cases in `preferences.factory.spec.ts` pass.

- [ ] T141 Add `preferences:read` endpoint behavior test (RED).
  - Paths: `src/renderer/api/preferences.endpoint.test.ts`.
  - Dependencies: T140.
  - Acceptance: The failing endpoint test uses the real preload bridge mock, calls `preferences:read` through `ipcBaseQuery`, validates through the renderer factory, preserves IPC/factory errors, and provides the `Preferences` tag.

- [ ] T142 Implement `preferences:read` endpoint query (GREEN).
  - Paths: `src/renderer/api/preferences.endpoint.ts`, `src/renderer/api/baseQuery.ts`, `src/renderer/api/index.ts`.
  - Dependencies: T141.
  - Acceptance: The read query is injected/exported through the API surface, uses only the preload bridge, provides `Preferences`, preserves fixed tag taxonomy, imports no Electron/Node APIs, and the read endpoint test passes.

- [ ] T143 Add `preferences:write` renderer-entry factory floor tests (RED).
  - Paths: `src/renderer/api/preferences.factory.spec.ts`.
  - Dependencies: T142.
  - Acceptance: The failing spec extends `preferences.factory.spec.ts` with all six factory-floor cases for unknown preload results entering the renderer for preference writes.

- [ ] T144 Implement `preferences:write` renderer-entry factory support (GREEN).
  - Paths: `src/renderer/api/preferences.factory.ts`.
  - Dependencies: T143.
  - Acceptance: The factory validates preload-returned `unknown`, returns typed preference-write data or stable named errors, preserves read factory behavior, imports no Electron/Node APIs, and all preferences factory cases pass.

- [ ] T145 Add `preferences:write` endpoint behavior test (RED).
  - Paths: `src/renderer/api/preferences.endpoint.test.ts`.
  - Dependencies: T144.
  - Acceptance: The failing endpoint test uses the real preload bridge mock, calls `preferences:write` through `ipcBaseQuery`, validates through the renderer factory, preserves IPC/factory errors, invalidates/provides `Preferences` consistently, and proves it is the only Run 4 write mutation.

- [ ] T146 Implement `preferences:write` endpoint mutation (GREEN).
  - Paths: `src/renderer/api/preferences.endpoint.ts`, `src/renderer/api/baseQuery.ts`, `src/renderer/api/index.ts`.
  - Dependencies: T145.
  - Acceptance: The write mutation is injected/exported through the API surface, uses only the preload bridge, invalidates/provides `Preferences` consistently, preserves fixed tag taxonomy, imports no Electron/Node APIs, and all preferences endpoint tests pass.

- [ ] T147 Add `auth` renderer-entry factory floor tests (RED).
  - Paths: `src/renderer/api/auth.factory.spec.ts`.
  - Dependencies: T146.
  - Acceptance: The failing spec covers all six factory-floor cases for unknown preload results entering the renderer for auth status.

- [ ] T148 Implement `auth` renderer-entry factory (GREEN).
  - Paths: `src/renderer/api/auth.factory.ts`.
  - Dependencies: T147.
  - Acceptance: The factory validates preload-returned `unknown`, returns typed nullable auth status data or stable named errors, imports no Electron/Node APIs, and `auth.factory.spec.ts` passes.

- [ ] T149 Add `auth` endpoint behavior test (RED).
  - Paths: `src/renderer/api/auth.endpoint.test.ts`.
  - Dependencies: T148.
  - Acceptance: The failing endpoint test uses the real preload bridge mock, calls `auth:status` through `ipcBaseQuery`, validates through the renderer factory, preserves IPC/factory errors, and provides the `Agent` tag where auth affects agent availability.

- [ ] T150 Implement `auth` endpoint (GREEN).
  - Paths: `src/renderer/api/auth.endpoint.ts`, `src/renderer/api/baseQuery.ts`, `src/renderer/api/index.ts`.
  - Dependencies: T149.
  - Acceptance: The endpoint is injected/exported through the API surface, uses only the preload bridge, returns validated nullable booleans, provides the planned tag, preserves fixed tag taxonomy, imports no Electron/Node APIs, and `auth.endpoint.test.ts` passes.

- [ ] T151 Add `session:listAcp` renderer-entry factory floor tests (RED).
  - Paths: `src/renderer/api/session.factory.spec.ts`.
  - Dependencies: T150.
  - Acceptance: The failing spec covers all six factory-floor cases for unknown preload results entering the renderer for ACP session lists.

- [ ] T152 Implement `session:listAcp` renderer-entry factory support (GREEN).
  - Paths: `src/renderer/api/session.factory.ts`.
  - Dependencies: T151.
  - Acceptance: The factory validates preload-returned `unknown`, returns typed ACP session-list data or stable named errors, imports no Electron/Node APIs, and the list cases in `session.factory.spec.ts` pass.

- [ ] T153 Add `session:listAcp` endpoint behavior test (RED).
  - Paths: `src/renderer/api/session.endpoint.test.ts`.
  - Dependencies: T152.
  - Acceptance: The failing endpoint test uses the real preload bridge mock, calls `session:listAcp` through `ipcBaseQuery`, validates through the renderer factory, preserves IPC/factory errors, and provides the `Session` tag.

- [ ] T154 Implement `session:listAcp` endpoint query (GREEN).
  - Paths: `src/renderer/api/session.endpoint.ts`, `src/renderer/api/baseQuery.ts`, `src/renderer/api/index.ts`.
  - Dependencies: T153.
  - Acceptance: The list query is injected/exported through the API surface, uses only the preload bridge, provides `Session`, preserves fixed tag taxonomy, imports no Electron/Node APIs, and the list endpoint test passes.

- [ ] T155 Add `session:createAcp` renderer-entry factory floor tests (RED).
  - Paths: `src/renderer/api/session.factory.spec.ts`.
  - Dependencies: T154.
  - Acceptance: The failing spec extends `session.factory.spec.ts` with all six factory-floor cases for unknown preload results entering the renderer for ACP session creation.

- [ ] T156 Implement `session:createAcp` renderer-entry factory support (GREEN).
  - Paths: `src/renderer/api/session.factory.ts`.
  - Dependencies: T155.
  - Acceptance: The factory validates preload-returned `unknown`, returns typed ACP session-create data or stable named errors, preserves list factory behavior, imports no Electron/Node APIs, and all session factory cases pass.

- [ ] T157 Add `session:createAcp` endpoint behavior test (RED).
  - Paths: `src/renderer/api/session.endpoint.test.ts`.
  - Dependencies: T156.
  - Acceptance: The failing endpoint test uses the real preload bridge mock, calls `session:createAcp` through `ipcBaseQuery`, validates through the renderer factory, preserves IPC/factory errors, and invalidates/provides `Session` consistently.

- [ ] T158 Implement `session:createAcp` endpoint mutation (GREEN).
  - Paths: `src/renderer/api/session.endpoint.ts`, `src/renderer/api/baseQuery.ts`, `src/renderer/api/index.ts`.
  - Dependencies: T157.
  - Acceptance: The create mutation is injected/exported through the API surface, uses only the preload bridge, validates create responses before exposing them, invalidates/provides `Session` consistently, preserves fixed tag taxonomy, imports no Electron/Node APIs, and all session endpoint tests pass.

- [ ] T159 Add `activity` renderer-entry factory floor tests (RED).
  - Paths: `src/renderer/api/activity.factory.spec.ts`.
  - Dependencies: T158.
  - Acceptance: The failing spec covers all six factory-floor cases for unknown preload results entering the renderer for activity entries, including the 256-entry cap.

- [ ] T160 Implement `activity` renderer-entry factory (GREEN).
  - Paths: `src/renderer/api/activity.factory.ts`.
  - Dependencies: T159.
  - Acceptance: The factory validates preload-returned `unknown`, returns typed capped activity data or stable named errors, imports no Electron/Node APIs, and `activity.factory.spec.ts` passes.

- [ ] T161 Add `activity` endpoint behavior test (RED).
  - Paths: `src/renderer/api/activity.endpoint.test.ts`.
  - Dependencies: T160.
  - Acceptance: The failing endpoint test uses the real preload bridge mock, calls `activity:read` through `ipcBaseQuery`, validates through the renderer factory, preserves IPC/factory errors, and provides the `Transcript` tag where activity entries expose transcript/log state.

- [ ] T162 Implement `activity` endpoint (GREEN).
  - Paths: `src/renderer/api/activity.endpoint.ts`, `src/renderer/api/baseQuery.ts`, `src/renderer/api/index.ts`.
  - Dependencies: T161.
  - Acceptance: The endpoint is injected/exported through the API surface, uses only the preload bridge, provides the planned activity/transcript tag, preserves fixed tag taxonomy, imports no Electron/Node APIs, and `activity.endpoint.test.ts` passes.

## Phase 9 - RTK Query API integration and preservation

- [ ] T163 Add API surface integration and preservation test (RED).
  - Paths: `src/renderer/api/index.test.ts`.
  - Dependencies: T162.
  - Acceptance: The failing test proves all Run 4 endpoints are reachable from the API module, the existing `getAppVersion` and `getBoundCLICapabilities` proof behavior remains unchanged, and the fixed tag taxonomy remains exactly `Workspace`, `StepState`, `GitState`, `Agent`, `Session`, `Step`, `Transcript`, `Preferences`.

- [ ] T164 Complete API module integration without changing fixed tags (GREEN).
  - Paths: `src/renderer/api/index.ts`, `src/renderer/api/baseQuery.ts`, `src/renderer/api/workspace.endpoint.ts`, `src/renderer/api/git.endpoint.ts`, `src/renderer/api/steps.endpoint.ts`, `src/renderer/api/preferences.endpoint.ts`, `src/renderer/api/auth.endpoint.ts`, `src/renderer/api/session.endpoint.ts`, `src/renderer/api/activity.endpoint.ts`.
  - Dependencies: T163.
  - Acceptance: All endpoint modules are exported/injected, existing proof endpoints remain compatible, `RUN2_TAG_TYPES` or equivalent fixed tag list is unchanged, renderer API imports no Electron/Node APIs, and `src/renderer/api/index.test.ts` passes.

## Phase 10 - Boundary and no-domain verification

- [ ] T165 Add no-domain and boundary verification checks (RED).
  - Paths: `src/renderer/store.test.ts`, `src/renderer/listeners/acpStreamSubscription.listener.test.ts`, `src/renderer/listeners/preferencesPersistence.listener.test.ts`, `src/renderer/listeners/sessionLifecycle.listener.test.ts`, `src/renderer/listeners/stepLifecycle.listener.test.ts`, `src/renderer/listeners/transcriptCapture.listener.test.ts`, `src/renderer/listeners/workspaceChange.listener.test.ts`, `src/renderer/slices/ui.test.ts`, `src/renderer/slices/preferences.test.ts`, `src/renderer/slices/auth.test.ts`, `src/renderer/slices/workspace.test.ts`, `src/renderer/slices/steps.test.ts`, `src/renderer/slices/session.test.ts`, `src/renderer/slices/activity.test.ts`, `src/renderer/slices/copilot.test.ts`, `src/renderer/api/workspace.endpoint.test.ts`, `src/renderer/api/git.endpoint.test.ts`, `src/renderer/api/steps.endpoint.test.ts`, `src/renderer/api/preferences.endpoint.test.ts`, `src/renderer/api/auth.endpoint.test.ts`, `src/renderer/api/session.endpoint.test.ts`, `src/renderer/api/activity.endpoint.test.ts`.
  - Dependencies: T164.
  - Acceptance: Verification fails if any Run 4 slice has non-empty domain reducers, any slice has non-empty domain extra-reducer behavior, any listener registers a non-empty effect body, renderer code imports Electron/Node APIs, or renderer code invokes IPC outside the preload bridge.

- [ ] T166 Remove accidental domain behavior and boundary violations (GREEN).
  - Paths: `src/renderer/store.ts`, `src/renderer/slices/ui.ts`, `src/renderer/slices/preferences.ts`, `src/renderer/slices/auth.ts`, `src/renderer/slices/workspace.ts`, `src/renderer/slices/steps.ts`, `src/renderer/slices/session.ts`, `src/renderer/slices/activity.ts`, `src/renderer/slices/copilot.ts`, `src/renderer/listeners/acpStreamSubscription.listener.ts`, `src/renderer/listeners/preferencesPersistence.listener.ts`, `src/renderer/listeners/sessionLifecycle.listener.ts`, `src/renderer/listeners/stepLifecycle.listener.ts`, `src/renderer/listeners/transcriptCapture.listener.ts`, `src/renderer/listeners/workspaceChange.listener.ts`, `src/renderer/api/baseQuery.ts`, `src/renderer/api/index.ts`, `src/renderer/api/workspace.endpoint.ts`, `src/renderer/api/git.endpoint.ts`, `src/renderer/api/steps.endpoint.ts`, `src/renderer/api/preferences.endpoint.ts`, `src/renderer/api/auth.endpoint.ts`, `src/renderer/api/session.endpoint.ts`, `src/renderer/api/activity.endpoint.ts`, `src/preload/index.ts`.
  - Dependencies: T165.
  - Acceptance: No domain reducers, no domain extra reducers, no non-empty listener effects, no renderer Electron/Node imports, and no renderer raw IPC calls remain; the verification checks pass.

## Phase 11 - Final verification

- [ ] T167 Verify Run 4 automated checks and boundary greps.
  - Paths: `package.json`, `src/main/index.ts`, `src/main/ipc/workspace.ts`, `src/main/ipc/workspace.test.ts`, `src/main/ipc/workspace.factory.ts`, `src/main/ipc/workspace.factory.spec.ts`, `src/main/ipc/git.ts`, `src/main/ipc/git.test.ts`, `src/main/ipc/git.factory.ts`, `src/main/ipc/git.factory.spec.ts`, `src/main/ipc/steps.ts`, `src/main/ipc/steps.test.ts`, `src/main/ipc/steps.factory.ts`, `src/main/ipc/steps.factory.spec.ts`, `src/main/ipc/preferences.ts`, `src/main/ipc/preferences.test.ts`, `src/main/ipc/preferences.factory.ts`, `src/main/ipc/preferences.factory.spec.ts`, `src/main/ipc/auth.ts`, `src/main/ipc/auth.test.ts`, `src/main/ipc/auth.factory.ts`, `src/main/ipc/auth.factory.spec.ts`, `src/main/ipc/session.ts`, `src/main/ipc/session.test.ts`, `src/main/ipc/session.factory.ts`, `src/main/ipc/session.factory.spec.ts`, `src/main/ipc/activity.ts`, `src/main/ipc/activity.test.ts`, `src/main/ipc/activity.factory.ts`, `src/main/ipc/activity.factory.spec.ts`, `src/preload/index.ts`, `src/preload/index.test.ts`, `src/renderer/index.tsx`, `src/renderer/index.test.tsx`, `src/renderer/store.ts`, `src/renderer/store.test.ts`, `src/renderer/hooks/store.ts`, `src/renderer/selectors/crossSlice.selectors.ts`, `src/renderer/listeners/acpStreamSubscription.listener.ts`, `src/renderer/listeners/acpStreamSubscription.listener.test.ts`, `src/renderer/listeners/preferencesPersistence.listener.ts`, `src/renderer/listeners/preferencesPersistence.listener.test.ts`, `src/renderer/listeners/sessionLifecycle.listener.ts`, `src/renderer/listeners/sessionLifecycle.listener.test.ts`, `src/renderer/listeners/stepLifecycle.listener.ts`, `src/renderer/listeners/stepLifecycle.listener.test.ts`, `src/renderer/listeners/transcriptCapture.listener.ts`, `src/renderer/listeners/transcriptCapture.listener.test.ts`, `src/renderer/listeners/workspaceChange.listener.ts`, `src/renderer/listeners/workspaceChange.listener.test.ts`, `src/renderer/slices/ui.ts`, `src/renderer/slices/ui.selectors.ts`, `src/renderer/slices/ui.test.ts`, `src/renderer/slices/preferences.ts`, `src/renderer/slices/preferences.selectors.ts`, `src/renderer/slices/preferences.test.ts`, `src/renderer/slices/auth.ts`, `src/renderer/slices/auth.selectors.ts`, `src/renderer/slices/auth.test.ts`, `src/renderer/slices/workspace.ts`, `src/renderer/slices/workspace.selectors.ts`, `src/renderer/slices/workspace.test.ts`, `src/renderer/slices/steps.ts`, `src/renderer/slices/steps.selectors.ts`, `src/renderer/slices/steps.test.ts`, `src/renderer/slices/session.ts`, `src/renderer/slices/session.selectors.ts`, `src/renderer/slices/session.test.ts`, `src/renderer/slices/activity.ts`, `src/renderer/slices/activity.selectors.ts`, `src/renderer/slices/activity.test.ts`, `src/renderer/slices/copilot.ts`, `src/renderer/slices/copilot.selectors.ts`, `src/renderer/slices/copilot.test.ts`, `src/renderer/api/baseQuery.ts`, `src/renderer/api/index.ts`, `src/renderer/api/index.test.ts`, `src/renderer/api/workspace.endpoint.ts`, `src/renderer/api/workspace.endpoint.test.ts`, `src/renderer/api/workspace.factory.ts`, `src/renderer/api/workspace.factory.spec.ts`, `src/renderer/api/git.endpoint.ts`, `src/renderer/api/git.endpoint.test.ts`, `src/renderer/api/git.factory.ts`, `src/renderer/api/git.factory.spec.ts`, `src/renderer/api/steps.endpoint.ts`, `src/renderer/api/steps.endpoint.test.ts`, `src/renderer/api/steps.factory.ts`, `src/renderer/api/steps.factory.spec.ts`, `src/renderer/api/preferences.endpoint.ts`, `src/renderer/api/preferences.endpoint.test.ts`, `src/renderer/api/preferences.factory.ts`, `src/renderer/api/preferences.factory.spec.ts`, `src/renderer/api/auth.endpoint.ts`, `src/renderer/api/auth.endpoint.test.ts`, `src/renderer/api/auth.factory.ts`, `src/renderer/api/auth.factory.spec.ts`, `src/renderer/api/session.endpoint.ts`, `src/renderer/api/session.endpoint.test.ts`, `src/renderer/api/session.factory.ts`, `src/renderer/api/session.factory.spec.ts`, `src/renderer/api/activity.endpoint.ts`, `src/renderer/api/activity.endpoint.test.ts`, `src/renderer/api/activity.factory.ts`, `src/renderer/api/activity.factory.spec.ts`, `e2e/smoke.spec.ts`.
  - Dependencies: T166.
  - Acceptance: ALL must pass:
    - `npm run lint`
    - `npm run typecheck`
    - `npm run test:coverage`
    - `npm run e2e`
    - `rg "reducers:\\s*\\{[^}]" src/renderer/slices --type ts` has no Run 4 domain reducer bodies.
    - `rg "extraReducers:\\s*\\([^)]*\\)\\s*=>\\s*\\{[^}]" src/renderer/slices --type ts` has no Run 4 domain extra-reducer bodies.
    - `rg "startListening\\(" src/renderer/listeners --type ts` has no non-empty listener effect registrations.
    - `rg "ipcRenderer\\.(invoke|send)" src/renderer --type ts` returns no renderer matches.
    - `rg "from ['\\\"](electron|node:|fs|child_process|path|os)" src/renderer --type ts` returns no renderer matches.
    - The test count grows by at least the Run 4 floor: one store assembly test, eight slice initial-state tests, eight selector test groups, six listener presence tests, factory/handler/logging coverage for all nine IPC channels, and renderer factory/endpoint coverage for all nine renderer operations.

## Dependencies and execution order

- Execute tasks in numeric order. Run 4 intentionally has no `[P]` implementation tasks because the plan requires vertical tracer bullets.
- For every RED task, run the focused test and confirm it fails for the expected missing behavior before starting the paired GREEN task.
- For every GREEN task, implement only the minimal behavior required for the immediately preceding RED task, then run the focused test until it passes before continuing.
- Do not start a later channel, endpoint, listener, or selector until the current RED/GREEN pair is complete.
- Final verification begins only after T166 is green.

## Implementation strategy

1. Start with T001/T002 exactly: product store assembly proves all eight slices, all six listeners, and RTK Query integration before any other implementation task.
2. Grow slice and selector contracts one slice at a time in catalog order: `ui`, `preferences`, `auth`, `workspace`, `steps`, `session`, `activity`, `copilot`.
3. Add typed hooks, cross-slice placeholder, listener presence tests, and store listener order before mounting the Provider.
4. Extend the preload bridge one channel at a time.
5. Implement each IPC handler as factory, success behavior, and structured logging/failure behavior in channel order.
6. Implement each renderer endpoint as renderer-entry factory then endpoint behavior in operation order.
7. Finish with API integration preservation, no-domain/boundary verification, and the required lint/typecheck/coverage/e2e checks.
