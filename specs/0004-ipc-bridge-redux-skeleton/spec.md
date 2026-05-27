# Feature Specification: Run 4 IPC Bridge & Redux Store Skeleton

**Feature Branch**: `spec/0004-ipc-bridge-redux-skeleton`

**Created**: 2026-05-27

**Status**: Draft

**Input**: User description: "Run 4: IPC Bridge & Redux Store Skeleton, using grill decisions in `specs/0004-ipc-bridge-redux-skeleton/grill.md` as source of truth."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Establish the state architecture spine (Priority: P1)

As a Concierge maintainer, I need the product state container to assemble the eight constitutionally fixed state areas, the RTK Query bridge, and the six named listener middleware topics so future runs can add domain behavior without redesigning state ownership.

**Why this priority**: This is the first vertical tracer bullet and the dependency that unblocks every later Run 5-9 domain slice.

**Independent Test**: Can be fully tested by creating the product store and confirming the canonical initial state shape across all eight slices while the RTK Query reducer is present and all listener setup functions are accepted in deterministic order.

**Acceptance Scenarios**:

1. **Given** the product store is configured for Run 4, **When** the store is created, **Then** `store.getState()` exposes the canonical initial states for `ui`, `preferences`, `auth`, `workspace`, `steps`, `session`, `activity`, and `copilot`.
2. **Given** the six listener middleware files exist, **When** store assembly initializes listeners, **Then** the listener setup functions are invoked alphabetically by filename and remain idempotent with empty Run 4 bodies.
3. **Given** the existing proof-only renderer shell, **When** the app renders, **Then** a single product Provider wraps the existing proof UI without introducing product UI or state shadowing.

---

### User Story 2 - Expose read-side IPC scaffolding through trust boundaries (Priority: P2)

As a future feature developer, I need renderer state to reach main-process capabilities through named IPC channels with validation and structured invocation logging, so later runs can consume real data without adding ad hoc bridges.

**Why this priority**: Run 4 is the IPC bridge skeleton. It must prove the cross-process path without adding domain action handlers or domain behavior.

**Independent Test**: Can be independently tested by invoking each new Run 4 channel through its main-process handler and renderer RTK Query endpoint, verifying trust-boundary validation, success/failure logging, and response shape handling.

**Acceptance Scenarios**:

1. **Given** an active workspace context, **When** the renderer requests workspace, git, step, preferences, auth, session, or activity state, **Then** the request crosses a named IPC channel and returns validated read-side state or a validated error.
2. **Given** preferences are changed by future UI behavior, **When** the preferences write bridge is invoked, **Then** preferences persist through the existing safe-write data-layer path and remain the only Run 4 write handler.
3. **Given** ACP sessions are listed or created, **When** `session:listAcp` or `session:createAcp` is invoked, **Then** the handler uses the real Run 3 Bound CLI integration with only system boundaries faked in tests.

---

### User Story 3 - Reserve selector, listener, and hook conventions (Priority: P3)

As a smart-component author in later runs, I need typed store hooks, per-slice selectors, cross-slice selector placement, and reserved listener topic files so components and effects have one sanctioned access path as domain logic is added.

**Why this priority**: Naming and placement conventions become expensive to rename once Runs 5-13 build on them.

**Independent Test**: Can be independently tested by importing every typed hook, selector module, and listener module and verifying their public exports match the Run 4 catalog without requiring domain reducers or UI behavior.

**Acceptance Scenarios**:

1. **Given** any smart component needs store access in a future run, **When** it imports store hooks, **Then** `useAppDispatch`, `useAppSelector`, and `useAppStore` are available from the single typed-hooks module.
2. **Given** a slice owns state, **When** a consumer needs its base state, **Then** that consumer can import a base selector from the co-located per-slice selector file.
3. **Given** future cross-slice derivation is needed, **When** selectors read from multiple slices, **Then** they have a reserved cross-slice selector module instead of forcing slices to import each other.

---

### Edge Cases

- Existing Run 2 `app:getVersion` and Run 3 `acp:probeBoundCLI` handlers remain unchanged and continue to pass existing tests.
- Handler validation rejects malformed, missing, unexpected, and boundary-case payloads according to the six-case floor at each IPC and renderer-entry trust boundary.
- The ACP session handlers exercise the real Run 3 supervisor/session code while faking only system boundaries such as child processes, filesystem writes, time, and Electron IPC.
- Listener middleware setup is safe to import before bodies contain domain logic and does not dispatch actions during Run 4 initialization.
- The proof-only renderer continues to render even before preferences hydrate from disk; visible theme falls back to the system setting.
- Activity entries are capped in memory at 256 entries while older structured events remain a disk concern.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST define the eight fixed state areas `ui`, `preferences`, `auth`, `workspace`, `steps`, `session`, `activity`, and `copilot` as the complete Run 4 slice catalog.
- **FR-002**: The system MUST initialize `ui` as `{ theme: 'system', sidebarOpen: true, activeView: null }`.
- **FR-003**: The system MUST initialize `preferences` as `{ hydratedFromDisk: false, theme: 'system' }`.
- **FR-004**: The system MUST initialize `auth` as `{ copilotLoggedIn: null, githubLoggedIn: null }`.
- **FR-005**: The system MUST initialize `workspace` as `{ activeRepoPath: null, agents: null, branch: null, ahead: 0, behind: 0, dirty: false }`.
- **FR-006**: The system MUST initialize `steps` as a stable-ID collection with `{ entities: {}, ids: [] }`.
- **FR-007**: The system MUST initialize `session` as `{ activeSessionId: null, modelId: null, modeId: null }`.
- **FR-008**: The system MUST initialize `activity` as `{ entries: [], cap: 256 }`.
- **FR-009**: The system MUST initialize `copilot` as `{ capabilities: null, lastProbeAt: null }`.
- **FR-010**: Every Run 4 slice MUST have empty domain reducers and no domain extra-reducer behavior.
- **FR-011**: Every Run 4 slice MUST have a co-located initial-state test and a co-located selector module with at least a base selector.
- **FR-012**: The product store MUST assemble the eight fixed slices, the existing RTK Query API reducer, and all six listener middleware topics.
- **FR-013**: Listener setup MUST be initialized alphabetically by listener filename.
- **FR-014**: The six listener topics MUST be `acpStreamSubscription`, `preferencesPersistence`, `sessionLifecycle`, `stepLifecycle`, `transcriptCapture`, and `workspaceChange`; each body MUST remain empty in Run 4 except for its topic descriptor.
- **FR-015**: The renderer MUST expose typed store hooks `useAppDispatch`, `useAppSelector`, and `useAppStore` from one sanctioned module.
- **FR-016**: Per-slice selectors MUST use the `select<Slice><Field>` naming convention, with memoized selectors when derived from multiple pieces of slice state.
- **FR-017**: Cross-slice selectors MUST have a reserved cross-slice selector module and MUST contain no domain derivation in Run 4 beyond a placeholder export.
- **FR-018**: The existing proof-only renderer MUST be wrapped by a single product Provider using the product store and MUST not introduce product UI.
- **FR-019**: The system MUST preserve existing `app:getVersion` and `acp:probeBoundCLI` behavior without re-authoring those handlers.
- **FR-020**: The system MUST add Run 4 IPC channels for `workspace:read`, `git:read`, `steps:read`, `preferences:read`, `preferences:write`, `auth:status`, `session:listAcp`, `session:createAcp`, and `activity:read`.
- **FR-021**: `preferences:write` MUST be the only Run 4 write-side IPC handler.
- **FR-022**: Every new Run 4 IPC handler MUST validate at the IPC entry trust boundary using the project six-case floor.
- **FR-023**: Every new Run 4 renderer endpoint response MUST pass through a renderer-entry trust-boundary factory before state consumption.
- **FR-024**: Every new Run 4 IPC invocation MUST emit structured logs that include channel, context, success or failure, and latency.
- **FR-025**: `workspace:read` MUST read the active workspace path and agent-manifest summary through existing data-layer capabilities.
- **FR-026**: `git:read` MUST read branch state and uncommitted paths through existing data-layer capabilities.
- **FR-027**: `steps:read` MUST read Concierge-Step trailer state only; it MUST NOT write step commits.
- **FR-028**: `preferences:read` and `preferences:write` MUST read and persist the minimal preferences state through the existing safe-write persistence path.
- **FR-029**: `auth:status` MUST report Copilot and GitHub CLI login status out of band and MUST NOT initiate login.
- **FR-030**: `session:listAcp` and `session:createAcp` MUST use the real Run 3 Bound CLI integration rather than mocked internal collaborators.
- **FR-031**: `activity:read` MUST expose structured activity log state for the activity slice without introducing transcript-capture listener behavior.
- **FR-032**: Tests MUST fake only system boundaries: child processes, filesystem writes, time, Electron IPC, and equivalent external edges.
- **FR-033**: The first implementation test for this feature MUST be the vertical tracer bullet proving product store assembly and canonical initial state across all eight slices.
- **FR-034**: The project instructions MUST document Run 4 conventions for the slice catalog, listener catalog, selector convention, and store assembly path.
- **FR-035**: Run 4 MUST introduce no new runtime dependencies.
- **FR-036**: Run 4 MUST NOT introduce domain reducers, domain extra-reducers, non-empty listener bodies, product UI, Step Commit writing, hook execution, domain step factories, HTTP server behavior, MCP integration, Jira submission, or Windows packaging changes.

### Key Entities *(include if feature involves data)*

- **UI State**: The currently visible shell preferences, including theme, sidebar openness, and active view.
- **Persisted Preferences**: User settings loaded from and saved to disk, initially limited to hydration state and theme.
- **Auth Status**: Out-of-band indicators for Copilot and GitHub CLI login availability.
- **Workspace State**: Active repository path, agent manifest summary, branch summary, ahead/behind counts, and dirty-state indication.
- **Step State**: Stable-ID collection of Concierge-Step trailer-derived step records; read-only in Run 4.
- **Session State**: Active ACP session identifier and selected model/mode identifiers.
- **Activity State**: In-memory capped activity entries with a cap of 256 entries.
- **Copilot State**: Capability information and last probe timestamp from existing Copilot/ACP probing paths.
- **IPC Channel Catalog**: Named renderer-to-main capabilities for Run 4 read scaffolding and the single preferences write path.
- **Listener Topic Catalog**: Reserved named coordination topics that own cross-domain side-effect placement for later runs.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Creating the product store returns the canonical initial state for all 8 slices in 100% of store assembly tests.
- **SC-002**: All 6 listener setup modules export callable setup functions and can be initialized in alphabetical filename order without dispatching domain behavior.
- **SC-003**: All 9 new IPC channels have handler, validation-factory, renderer-endpoint, and renderer-entry-factory coverage with success and failure cases represented.
- **SC-004**: Test coverage grows by at least 50 Run 4 tests, including 8 slice tests, 6 listener tests, 1 store assembly test, and endpoint/handler/factory tests for the new IPC bridge surface.
- **SC-005**: Existing smoke and ACP proof paths continue passing with no user-visible UI changes beyond the existing proof rendering being Provider-wrapped.
- **SC-006**: Lint, typecheck, coverage, and end-to-end verification commands all exit successfully before implementation is considered complete.
- **SC-007**: 0 domain reducers, 0 domain extra-reducer behaviors, 0 non-empty listener bodies, and 0 product UI features are introduced in Run 4.
- **SC-008**: 100% of new IPC invocations emit structured success or failure logs with channel and latency fields.
- **SC-009**: Future Run 5 planning can reference a documented slice, listener, selector, hook, store, and IPC bridge catalog without adding another architecture-spine run.

## Assumptions

- Runs 2 and 3 are complete and merged to main, including the data-layer foundation, existing RTK Query base query and tag types, `app:getVersion`, `acp:probeBoundCLI`, and the real Bound CLI ACP integration.
- The target feature directory is explicitly provided by the user as `specs/0004-ipc-bridge-redux-skeleton/`, independent of the generated git branch `spec/0004-ipc-bridge-redux-skeleton`.
- The grill file is the source of truth when it differs from the abbreviated command input. In particular, the new-handler count is reconciled by including `activity:read` from grill Q1.
- Run 4 is a technical architecture-spine feature; therefore this specification records sanctioned artifact names and paths as externally verifiable acceptance boundaries, while avoiding design of internal domain algorithms.
- ADR-0007 for the listener middleware catalog is a planning decision, not a specify-phase deliverable.

## Deviations from grill

None. This specification follows `specs/0004-ipc-bridge-redux-skeleton/grill.md` as the source of truth. The only reconciliation is that the command input says "9 new" handlers while listing 8; grill Q1 names the missing ninth handler as `activity:read`, so this spec includes `activity:read` rather than deferring or splitting it.
