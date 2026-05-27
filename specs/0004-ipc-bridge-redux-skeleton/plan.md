# Run 4 Implementation Plan - IPC Bridge & Redux Store Skeleton

**Branch**: `spec/0004-ipc-bridge-redux-skeleton` | **Date**: 2026-05-27 | **Spec**: `specs/0004-ipc-bridge-redux-skeleton/spec.md`

**Input**: Feature specification from `specs/0004-ipc-bridge-redux-skeleton/spec.md`; locked grill decisions from `specs/0004-ipc-bridge-redux-skeleton/grill.md`; clarification completed with no open questions.

## Summary

Run 4 builds the renderer state architecture spine and the read-side IPC bridge skeleton for Concierge. It introduces the eight fixed Redux Toolkit slices, the six listener middleware topic files, typed store hooks, base selectors, the product store assembly, the single product Provider around the existing proof UI, and nine new IPC channels that hydrate the skeleton state through existing Run 2 and Run 3 capabilities.

This run deliberately adds no domain behavior. Slice reducers and extra reducers stay empty, listener bodies stay empty, and product UI remains the existing proof-only rendering. The only write-side bridge in scope is `preferences:write`, because persisted preferences need a sanctioned storage path before later UI runs can use them.

## Technical Context

**Language/Version**: TypeScript 5.7.2, `strict` and `noUncheckedIndexedAccess`.

**Primary Dependencies**: Electron 33.2.1, React 18.3.1, pino 9.x, Vitest 2.1.8, Playwright 1.49.1, RTK Query and Redux Toolkit from `@reduxjs/toolkit@2.12.0`, React Redux 9.3.0, and `@agentclientprotocol/sdk@0.22.1` from Run 3.

**Storage**: Renderer state is cache only. Disk remains truth through git history, Concierge-Step trailers, existing safe-write filesystem helpers, pino logs under `app.getPath('userData')/logs/`, and ACP session data exposed by the Run 3 Bound CLI integration.

**Testing**: Vitest co-located specs using vertical tracer bullets. Every slice has initial-state and base-selector coverage. Every listener has a presence test. Every new IPC handler has factory, handler, and structured logging assertions. Every renderer endpoint has a renderer-entry factory test and endpoint test through the real preload bridge mock. Playwright Electron smoke verifies the proof UI still renders through the product Provider.

**Target Platform**: Electron desktop app. CI remains Windows-only from Run 1.

**Project Type**: Desktop app with main/preload/renderer split.

**Performance Goals**: Product store creation is synchronous and side-effect-light. Listener setup dispatches no domain actions in Run 4. IPC handlers log latency and avoid polling. Activity state exposes at most 256 in-memory entries.

**Constraints**: No new runtime dependencies. Do not redo Runs 2 or 3. Do not re-author `app:getVersion` or `acp:probeBoundCLI`. Do not add domain reducers, domain extra reducers, listener bodies, product UI, Step Commit writing, hook execution, domain step factories, HTTP server behavior, MCP integration, Jira submission, or Windows packaging changes.

**Scale/Scope**: Eight renderer slices, six listener topic files, one product store assembly, one Provider mount, nine new Run 4 IPC channels, seven renderer endpoint modules covering those channels, and one ADR for listener middleware catalog governance.

## Tech-Stack Delta from Run 3

| Area | Run 3 baseline | Run 4 delta |
|---|---|---|
| Runtime dependencies | RTK, React Redux, and ACP SDK already installed | No new runtime dependencies |
| Renderer store | Inline `proofStore` with only RTK Query reducer in `src/renderer/index.tsx` | Product store in `src/renderer/store.ts` with eight slices, RTK Query, and listener middleware |
| Renderer state | No product slices | Eight fixed slices: `ui`, `preferences`, `auth`, `workspace`, `steps`, `session`, `activity`, `copilot` |
| Listener middleware | None | Six reserved topic files under `src/renderer/listeners/`, empty in Run 4 |
| Typed hooks | None | `src/renderer/hooks/store.ts` exports `useAppDispatch`, `useAppSelector`, `useAppStore` |
| Selectors | Endpoint-specific proof selectors only | Per-slice base selectors plus reserved cross-slice selector module |
| IPC | Existing `app:getVersion`, `acp:probeBoundCLI` | Add nine scaffold channels; preserve existing two |
| Preload bridge | Narrow proof bridge for app and ACP | Extend same narrow bridge pattern for Run 4 channels |

## Constitution Check

**Gate status**: Pass.

- Principle I: Renderer still reaches I/O only through the preload bridge and RTK Query. Main-process code owns git, filesystem, auth process checks, pino logs, and ACP session calls.
- Principle II: Renderer slices cache derived state only. Step completion remains derived from git history and Concierge-Step trailers; Run 4 does not add Step Commit writing.
- Principle III: ACP session list/create handlers use the Run 3 ACP data-layer contract. Tests may fake `child_process`, but must not mock the SDK or supervisor as internal collaborators.
- Principle IV: Run 4 has a double trust boundary. Each new IPC handler validates renderer payloads at the main-side IPC entry, and each renderer endpoint validates preload-returned `unknown` through a renderer-entry factory before state consumption.
- Principle V: Effect files are named and scoped: IPC handlers, preload bridge, RTK Query endpoints, listener files, slice files, and renderer entry point. Pure selector/factory modules do not import effect-layer modules directly.
- Principle VI: RTK slices own renderer-local state, RTK Query owns IPC-crossing data access, listener middleware is the only future cross-domain effect path, selectors are the composite read API, and `createEntityAdapter` owns the stable-ID `steps` collection.
- Principle XV: Every new IPC invocation emits structured pino logs with channel, context, success or failure, and latency.
- TDD discipline: `.agents/skills/tdd/SKILL.md` was read before sequencing. Implementation must proceed by vertical tracer bullets: one RED test, one minimal GREEN implementation, repeat. Do not write all tests first.

No complexity-tracking violations are introduced.

## Project Structure

### Documentation (this feature)

```text
specs/0004-ipc-bridge-redux-skeleton/
|-- spec.md
|-- grill.md
|-- clarifications.md
|-- plan.md
|-- research.md
|-- checklists/
|   `-- requirements.md        # created by later validation/checklist steps if needed
`-- tasks.md                   # created by /speckit.tasks, not this plan

docs/adr/
`-- 0007-listener-middleware-catalog.md

.github/
`-- copilot-instructions.md    # Run 4 conventions
```

### Source Code (repository root)

```text
src/
|-- main/
|   |-- index.ts                         # registers existing Run 2/3 IPC plus Run 4 handlers
|   |-- ipc/
|   |   |-- appVersion.ts                # existing Run 2; do not re-author
|   |   |-- acpProbe.ts                  # existing Run 3; do not re-author
|   |   |-- workspace.ts                 # workspace:read
|   |   |-- workspace.factory.ts
|   |   |-- workspace.factory.spec.ts
|   |   |-- workspace.test.ts
|   |   |-- git.ts                       # git:read
|   |   |-- git.factory.ts
|   |   |-- git.factory.spec.ts
|   |   |-- git.test.ts
|   |   |-- steps.ts                     # steps:read
|   |   |-- steps.factory.ts
|   |   |-- steps.factory.spec.ts
|   |   |-- steps.test.ts
|   |   |-- preferences.ts               # preferences:read, preferences:write
|   |   |-- preferences.factory.ts
|   |   |-- preferences.factory.spec.ts
|   |   |-- preferences.test.ts
|   |   |-- auth.ts                      # auth:status
|   |   |-- auth.factory.ts
|   |   |-- auth.factory.spec.ts
|   |   |-- auth.test.ts
|   |   |-- session.ts                   # session:listAcp, session:createAcp
|   |   |-- session.factory.ts
|   |   |-- session.factory.spec.ts
|   |   |-- session.test.ts
|   |   |-- activity.ts                  # activity:read
|   |   |-- activity.factory.ts
|   |   |-- activity.factory.spec.ts
|   |   `-- activity.test.ts
|   `-- data-layer/
|       |-- fs/                          # existing safeWrite helper
|       |-- git/                         # existing branch/trailer readers
|       |-- agents/                      # existing manifest loader
|       `-- acp/                         # existing Run 3 Bound CLI integration
|-- preload/
|   |-- index.ts                         # extends narrow bridge for nine Run 4 channels
|   `-- index.test.ts
|-- renderer/
|   |-- index.tsx                        # product Provider wraps existing proof rendering
|   |-- store.ts                         # product configureStore assembly
|   |-- store.test.ts                    # first vertical tracer bullet
|   |-- hooks/
|   |   `-- store.ts                     # typed React Redux hooks
|   |-- selectors/
|   |   `-- crossSlice.selectors.ts      # reserved cross-slice selector surface
|   |-- listeners/
|   |   |-- acpStreamSubscription.listener.ts
|   |   |-- acpStreamSubscription.listener.test.ts
|   |   |-- preferencesPersistence.listener.ts
|   |   |-- preferencesPersistence.listener.test.ts
|   |   |-- sessionLifecycle.listener.ts
|   |   |-- sessionLifecycle.listener.test.ts
|   |   |-- stepLifecycle.listener.ts
|   |   |-- stepLifecycle.listener.test.ts
|   |   |-- transcriptCapture.listener.ts
|   |   |-- transcriptCapture.listener.test.ts
|   |   |-- workspaceChange.listener.ts
|   |   `-- workspaceChange.listener.test.ts
|   |-- slices/
|   |   |-- ui.ts
|   |   |-- ui.selectors.ts
|   |   |-- ui.test.ts
|   |   |-- preferences.ts
|   |   |-- preferences.selectors.ts
|   |   |-- preferences.test.ts
|   |   |-- auth.ts
|   |   |-- auth.selectors.ts
|   |   |-- auth.test.ts
|   |   |-- workspace.ts
|   |   |-- workspace.selectors.ts
|   |   |-- workspace.test.ts
|   |   |-- steps.ts
|   |   |-- steps.selectors.ts
|   |   |-- steps.test.ts
|   |   |-- session.ts
|   |   |-- session.selectors.ts
|   |   |-- session.test.ts
|   |   |-- activity.ts
|   |   |-- activity.selectors.ts
|   |   |-- activity.test.ts
|   |   |-- copilot.ts
|   |   |-- copilot.selectors.ts
|   |   `-- copilot.test.ts
|   `-- api/
|       |-- baseQuery.ts                 # extend channel union and bridge switch
|       |-- index.ts                     # preserves API slice and fixed tags
|       |-- workspace.endpoint.ts
|       |-- workspace.factory.ts
|       |-- workspace.factory.spec.ts
|       |-- workspace.endpoint.test.ts
|       |-- git.endpoint.ts
|       |-- git.factory.ts
|       |-- git.factory.spec.ts
|       |-- git.endpoint.test.ts
|       |-- steps.endpoint.ts
|       |-- steps.factory.ts
|       |-- steps.factory.spec.ts
|       |-- steps.endpoint.test.ts
|       |-- preferences.endpoint.ts
|       |-- preferences.factory.ts
|       |-- preferences.factory.spec.ts
|       |-- preferences.endpoint.test.ts
|       |-- auth.endpoint.ts
|       |-- auth.factory.ts
|       |-- auth.factory.spec.ts
|       |-- auth.endpoint.test.ts
|       |-- session.endpoint.ts
|       |-- session.factory.ts
|       |-- session.factory.spec.ts
|       |-- session.endpoint.test.ts
|       |-- activity.endpoint.ts
|       |-- activity.factory.ts
|       |-- activity.factory.spec.ts
|       `-- activity.endpoint.test.ts
`-- test/
    |-- setup.ts
    |-- rtkQueryStore.ts                 # reuse/extend only if endpoint tests need it
    `-- tempDir.ts                       # reuse only if IPC filesystem tests need it
```

**Structure Decision**: Keep the current Run 2/3 entry-point layout. Store assembly lives at `src/renderer/store.ts`. Renderer-local state lives under `src/renderer/slices/`. Cross-domain renderer effects are reserved under `src/renderer/listeners/`. IPC registration remains under `src/main/ipc/`. Renderer data access remains under `src/renderer/api/` and must go through the preload bridge.

## Public Interfaces

### Product store

`src/renderer/store.ts` exports:

- `createProductStore()` for tests and app bootstrap.
- `store` for the renderer entry point.
- `RootState`, `AppDispatch`, and `AppStore` inferred from the store contract.

Store assembly includes:

- Reducers: `ui`, `preferences`, `auth`, `workspace`, `steps`, `session`, `activity`, `copilot`, and `[api.reducerPath]`.
- Middleware: listener middleware prepended before default middleware, RTK Query middleware appended after default middleware.
- Listener setup functions invoked alphabetically by listener filename:
  1. `setupAcpStreamSubscriptionListener`
  2. `setupPreferencesPersistenceListener`
  3. `setupSessionLifecycleListener`
  4. `setupStepLifecycleListener`
  5. `setupTranscriptCaptureListener`
  6. `setupWorkspaceChangeListener`

### Slice catalog

| Slice | Initial state | Run 4 reducers |
|---|---|---|
| `ui` | `{ theme: 'system', sidebarOpen: true, activeView: null }` | none |
| `preferences` | `{ hydratedFromDisk: false, theme: 'system' }` | none |
| `auth` | `{ copilotLoggedIn: null, githubLoggedIn: null }` | none |
| `workspace` | `{ activeRepoPath: null, agents: null, branch: null, ahead: 0, behind: 0, dirty: false }` | none |
| `steps` | `stepsAdapter.getInitialState()` -> `{ entities: {}, ids: [] }` | none |
| `session` | `{ activeSessionId: null, modelId: null, modeId: null }` | none |
| `activity` | `{ entries: [], cap: 256 }` | none |
| `copilot` | `{ capabilities: null, lastProbeAt: null }` | none |

Every slice file uses `createSlice({ name, initialState, reducers: {}, extraReducers: (builder) => {} })`. Empty reducers and empty extra reducers are part of the Run 4 contract.

### Selector catalog

- Typed hooks live only at `src/renderer/hooks/store.ts`: `useAppDispatch`, `useAppSelector`, and `useAppStore`.
- Per-slice selectors live beside the slice as `src/renderer/slices/<slice>.selectors.ts`.
- Base selectors use the `select<Slice>` or `select<Slice>State` shape only for whole-slice reads, and field selectors use `select<Slice><Field>` such as `selectWorkspaceActiveRepoPath`.
- Derived selectors that return fresh objects, arrays, or values computed from multiple fields use `createSelector`.
- Cross-slice selectors live only at `src/renderer/selectors/crossSlice.selectors.ts` and contain no domain derivation in Run 4 beyond a placeholder export.

### Listener catalog

ADR-0007 owns the six listener topics:

- `acpStreamSubscription.listener.ts`
- `preferencesPersistence.listener.ts`
- `sessionLifecycle.listener.ts`
- `stepLifecycle.listener.ts`
- `transcriptCapture.listener.ts`
- `workspaceChange.listener.ts`

Run 4 setup functions accept the RTK `startListening` API and do not register domain effects. Future stream subscription code must live only in `acpStreamSubscription.listener.ts`.

### Run 4 IPC catalog

Existing channels are preserved:

- `app:getVersion`
- `acp:probeBoundCLI`

New Run 4 channels:

| Channel | Direction | Purpose | Source |
|---|---|---|---|
| `workspace:read` | read | Active workspace path and agent manifest summary | Run 2 data layer |
| `git:read` | read | Branch, ahead/behind, dirty, uncommitted paths | Run 2 git readers |
| `steps:read` | read | Concierge-Step trailer-derived state | Run 2 trailer recovery |
| `preferences:read` | read | Minimal persisted preferences | Existing filesystem path |
| `preferences:write` | write | Persist minimal preferences | Run 2 safeWrite |
| `auth:status` | read | Copilot and GitHub CLI login status without login side effects | process boundary |
| `session:listAcp` | read | ACP sessions | Run 3 Bound CLI contract |
| `session:createAcp` | create | Start ACP supervisor and create session | Run 3 Bound CLI contract |
| `activity:read` | read | Tail structured activity log state | pino log files |

Every new handler:

- Has a main-side trust-boundary factory with the six-case floor.
- Logs structured success and failure with channel, context, success flag, latency, and error when applicable.
- Has a handler test that invokes the registered public handler through a fake `ipcMain.handle`.
- Does not swallow errors or return success-shaped fallback payloads.

Every renderer endpoint:

- Uses the preload bridge through `ipcBaseQuery`.
- Runs the returned `unknown` through a renderer-entry factory before returning data to consumers.
- Has a factory spec with the six-case floor.
- Has an endpoint spec using the real preload bridge mock, not mocked data-layer internals.

## Factory-Spec Convention

Run 4 uses the six-case floor at both trust boundaries:

1. Happy path: valid payload returns the typed shape.
2. Empty object: `{}` returns a stable named error.
3. Null: `null` returns a stable named error.
4. Undefined: `undefined` returns a stable named error.
5. Hostile malformed input: a factory-specific wrong type, unexpected key, or malicious shape returns a stable named error.
6. Partial structurally plausible input: missing one required field from an otherwise plausible shape returns a stable named error.

Main-side factories validate renderer request payloads and handler return payloads when data-layer output crosses into IPC. Renderer-entry factories validate the `unknown` value returned through preload before RTK Query exposes data to slices, selectors, or components.

## TDD Vertical Tracer-Bullet Sequence

Per `.agents/skills/tdd/SKILL.md`, implementation must proceed one behavior at a time: write one RED test, add minimal code to make it GREEN, then continue. Do not write all slice tests, all handler tests, or all endpoint tests in a horizontal batch.

1. **First tracer bullet: product store assembly exposes canonical initial state**
   - RED: Add `src/renderer/store.test.ts` asserting `createProductStore().getState()` exposes the canonical initial state for `ui`, `preferences`, `auth`, `workspace`, `steps`, `session`, `activity`, and `copilot`; includes `[api.reducerPath]`; and can initialize all six listener setup functions without dispatching domain actions.
   - GREEN: Add the minimal eight slice files, six empty listener setup modules, `src/renderer/store.ts`, and required exports to pass this one store assembly behavior.

2. **Slice-by-slice initial state and base selector contracts**
   - RED -> GREEN, one slice at a time: add the co-located `<slice>.test.ts` case proving the public reducer initializes to the locked state, then add/adjust only that slice.
   - RED -> GREEN, same slice before moving on: add a base selector test through `RootState`, then add/adjust `<slice>.selectors.ts`.
   - Order: `ui`, `preferences`, `auth`, `workspace`, `steps`, `session`, `activity`, `copilot`.
   - `steps` uses `createEntityAdapter` before its selector test is made GREEN.

3. **Typed hooks and cross-slice selector placeholder**
   - RED: Import `useAppDispatch`, `useAppSelector`, and `useAppStore` from `src/renderer/hooks/store.ts` and prove their types align with `AppDispatch`, `RootState`, and `AppStore`.
   - GREEN: Add the typed hooks with React Redux `.withTypes()`.
   - RED: Import the cross-slice selector placeholder and prove it exposes no domain derivation.
   - GREEN: Add `src/renderer/selectors/crossSlice.selectors.ts` with the placeholder export only.

4. **Listener presence and catalog order**
   - RED -> GREEN, one listener at a time: add a presence test that imports the topic descriptor and `setup<Topic>Listener`, passes a fake `startListening` API, and asserts no domain actions are dispatched.
   - After all six are GREEN, add a store-order test proving the product store invokes setup functions alphabetically by filename.
   - GREEN: Adjust `store.ts` ordering only if the order test fails.

5. **Provider wraps existing proof UI**
   - RED: Renderer entry test proves the existing proof UI renders through one product Provider and uses the product store instead of inline `proofStore`.
   - GREEN: Update `src/renderer/index.tsx` to import `store` from `src/renderer/store.ts`, wrap the proof fragment in `<Provider store={store}>`, and preserve existing proof dispatches.

6. **Preload bridge extension skeleton**
   - RED: Extend `src/preload/index.test.ts` one channel group at a time, proving the bridge exposes a narrow method for the next channel and does not expose raw `ipcRenderer`.
   - GREEN: Add only that method to `src/preload/index.ts`.
   - Channel order: `workspace:read`, `git:read`, `steps:read`, `preferences:read`, `preferences:write`, `auth:status`, `session:listAcp`, `session:createAcp`, `activity:read`.

7. **Workspace IPC and endpoint vertical slice**
   - RED: Add `workspace.factory.spec.ts` first missing floor case.
   - GREEN: Add minimal main-side `workspace.factory.ts`.
   - RED: Add `workspace.test.ts` handler behavior for success plus structured success/failure logging.
   - GREEN: Add `workspace.ts` handler using existing Run 2 data-layer capabilities.
   - RED: Add renderer-entry `workspace.factory.spec.ts` first missing floor case.
   - GREEN: Add renderer factory.
   - RED: Add `workspace.endpoint.test.ts` proving preload bridge call, renderer factory validation, IPC error preservation, and `Workspace` tag use.
   - GREEN: Add `workspace.endpoint.ts` and integrate it into the API surface.

8. **Git IPC and endpoint vertical slice**
   - Repeat the factory -> handler -> renderer factory -> endpoint loop for `git:read`.
   - Use existing branch/uncommitted-path readers; mock only git process/filesystem boundaries.
   - Endpoint provides `GitState` and, where needed, `Workspace` tags without changing the fixed tag taxonomy.

9. **Steps IPC and endpoint vertical slice**
   - Repeat the loop for `steps:read`.
   - Read Concierge-Step trailer state only; do not add Step Commit writing.
   - Endpoint provides `StepState` and `Step` tags as appropriate.

10. **Preferences read/write IPC and endpoint vertical slice**
    - Repeat the loop for `preferences:read` and `preferences:write` in one `preferences.ts` IPC module and one `preferences.endpoint.ts`.
    - Tests prove `preferences:write` is the only Run 4 write-side channel and uses the existing safe-write path.
    - Endpoint exposes a query for read and a mutation for write; both pass through renderer-entry factories.

11. **Auth status IPC and endpoint vertical slice**
    - Repeat the loop for `auth:status`.
    - Tests fake only external process command boundaries. Handler reports status and never initiates login.
    - Endpoint returns validated `copilotLoggedIn` and `githubLoggedIn` nullable booleans.

12. **ACP session IPC and endpoint vertical slice**
    - Repeat the loop for `session:listAcp` and `session:createAcp`.
    - Handler tests instantiate real Run 3 ACP modules with fake `child_process` and filesystem/time boundaries as needed.
    - Do not mock `BoundCLISupervisor`, `BoundCLISession`, `ClientSideConnection`, or slice reducers.
    - Endpoint validates list and create responses before exposing them.

13. **Activity read IPC and endpoint vertical slice**
    - Repeat the loop for `activity:read`.
    - Tests fake filesystem log reads only at the boundary and prove returned entries are capped for the renderer.
    - Do not wire transcript capture listener behavior in Run 4.

14. **RTK Query API integration pass**
    - RED: Add one API surface test proving all Run 4 endpoints are reachable from the API module and existing `getAppVersion` / `getBoundCLICapabilities` behavior remains unchanged.
    - GREEN: Export/inject endpoint modules without changing `RUN2_TAG_TYPES`.

15. **Boundary and no-domain verification**
    - RED: Add targeted tests or grep-backed verification tasks that prove there are zero domain reducers, zero domain extra-reducer behaviors, and zero non-empty listener effects in Run 4.
    - GREEN: Remove any accidental domain behavior.

16. **Final verification**
    - Run lint, typecheck, coverage, and e2e.
    - Fix only issues caused by Run 4 work.
    - Confirm test count grows by at least the Run 4 floor: 8 slice tests, 6 listener tests, 1 store assembly test, and handler/factory/endpoint coverage for all 9 channels.

## Implementation Sequence for `tasks.md`

1. Create the first store assembly RED test before any implementation code.
2. Add minimal slices, listener setup stubs, and `store.ts` to make the first store assembly test GREEN.
3. Grow slice and selector coverage one slice at a time.
4. Add typed hooks and cross-slice selector placeholder.
5. Add listener presence tests and enforce alphabetical initialization.
6. Mount the product Provider around the existing proof UI.
7. Extend the preload bridge one narrow method at a time.
8. Implement each IPC + endpoint vertical slice in this order: workspace, git, steps, preferences, auth, session, activity.
9. Integrate endpoint modules into the RTK Query API without changing the fixed tag taxonomy.
10. Add ADR-0007 and project instruction updates.
11. Run final verification and boundary greps.

## Functional Requirements Coverage

| Requirement | Plan coverage |
|---|---|
| FR-001 through FR-009 | Slice catalog, initial state table, store first tracer bullet |
| FR-010 | Empty `reducers` and `extraReducers` contract plus no-domain verification |
| FR-011 | Per-slice co-located initial-state and selector tests |
| FR-012 through FR-014 | Store assembly, RTK Query reducer/middleware, listener catalog and alphabetical init |
| FR-015 through FR-018 | Typed hooks, selector convention, cross-slice placeholder, Provider mount |
| FR-019 | Existing `app:getVersion` and `acp:probeBoundCLI` preservation tests |
| FR-020 through FR-021 | Run 4 IPC catalog including only one write-side handler |
| FR-022 through FR-024 | Main-side factories, renderer-entry factories, structured logging assertions |
| FR-025 through FR-031 | Per-channel vertical slices using existing Run 2/3 capabilities |
| FR-032 | Boundary-only mock rule in every vertical slice |
| FR-033 | First tracer bullet is store assembly initial state across all 8 slices |
| FR-034 | `.github/copilot-instructions.md` Run 4 convention update |
| FR-035 | No new runtime dependencies |
| FR-036 | Out-of-scope exclusions and no-domain verification |

## Success Criteria Mapping

| Spec criterion | Plan coverage |
|---|---|
| SC-001 | First store assembly tracer bullet |
| SC-002 | Listener presence tests and alphabetical store-order test |
| SC-003 | Factory, handler, renderer-entry factory, and endpoint tests for all 9 channels |
| SC-004 | Test floor tracked in final verification |
| SC-005 | Provider mount and proof UI preservation tests/e2e |
| SC-006 | Lint, typecheck, coverage, e2e final verification |
| SC-007 | No-domain verification |
| SC-008 | Structured logging assertion in every handler test |
| SC-009 | Plan, research, ADR, and copilot instruction references |

## Out of Scope

- Redoing Run 2 data-layer foundation, RTK Query base query, fixed tag taxonomy, `app:getVersion`, or layout refactor.
- Redoing Run 3 ACP data-layer, `acp:probeBoundCLI`, transcript fixtures, process supervision, or model/mode policy.
- Constitution amendments; v1.0.4 remains current.
- ADR-0002 through ADR-0006 rewrites.
- New runtime dependencies.
- Domain reducers, domain extra reducers, listener effect bodies, product UI, Step Commit writers, hook execution, domain step factories, HTTP server behavior, MCP integration, Jira submission, or Windows packaging changes.

## Verification

Run and pass:

```bash
npm run lint
npm run typecheck
npm run test:coverage
npm run e2e
```

Additional Run 4 boundary checks:

```bash
rg "reducers:\\s*\\{[^}]" src/renderer/slices --type ts
rg "extraReducers:\\s*\\([^)]*\\)\\s*=>\\s*\\{[^}]" src/renderer/slices --type ts
rg "startListening\\(" src/renderer/listeners --type ts
rg "ipcRenderer\\.(invoke|send)" src/renderer --type ts
rg "from ['\\\"](electron|node:|fs|child_process|path|os)" src/renderer --type ts
```

Expected outcome: no domain reducers or listener bodies appear in Run 4, renderer code imports no Electron/Node APIs, and IPC invocation is confined to the preload bridge.
