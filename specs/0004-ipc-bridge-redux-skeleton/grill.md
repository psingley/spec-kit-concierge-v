# Grill — Run 4: IPC Bridge & Redux Store Skeleton

> Grill-with-docs session per Principle XVI. Resolves ambiguities in
> ROADMAP_DECISIONS Run 4 scope before `/speckit.specify` is invoked.
> Format mirrors `specs/0003-acp-adapter/grill.md`.

**Scope (from ROADMAP_DECISIONS lines 56-67 + 697-700):**
`src/main/ipc/` handlers with factory-pattern validation at the IPC
trust boundary; renderer's eight slices (`ui`, `preferences`, `auth`,
`workspace`, `steps`, `session`, `activity`, `copilot`) wired but
empty of business logic; RTK Query `baseQuery` wrapping
`ipcRenderer.invoke` (already done in Run 2); all named listener
middleware files present (empty bodies); selectors directory with the
typed hooks (`useAppDispatch`, `useAppSelector`, `useAppStore`).

**Spine consolidation (ROADMAP line 697):** Run 4 also absorbs the
listener middleware catalog + selector catalog + slice catalog as a
unified "state architecture spine" run. This makes Run 4 the
load-bearing slice catalog reference for Runs 5-13.

**Locked in advance (no grilling needed — empirical from prior runs):**

- The 8 slice names are constitution-mandated (Principle VI): `ui`,
  `preferences`, `auth`, `workspace`, `steps`, `session`, `activity`,
  `copilot`. No re-litigation.
- RTK Query `ipcBaseQuery` already exists at `src/renderer/api/baseQuery.ts`
  from Run 2. Run 4 EXTENDS it with the 8 tagType set already declared
  (`Workspace`, `StepState`, `GitState`, `Agent`, `Session`, `Step`,
  `Transcript`, `Preferences`).
- Run 2 wired a `proofStore` in `src/renderer/index.tsx` (lines 12-19)
  with only the api reducer; Run 4 expands this to the product
  `configureStore` with all 8 slices + listener middleware + the API.
- Trust-boundary factories use the 6-case floor (constitution v1.0.4).
- IPC handlers use structured pino logging on every invocation
  (constitution III + the FR-024 pattern proven in Run 3).
- Pocock TDD vertical tracer bullets discipline applies (Run 3 +
  onward). NOT horizontal slicing.
- Constitution V (Effects only in named files): `slices/<slice>.ts`,
  `slices/<slice>.selectors.ts`, `listeners/<topic>.listener.ts`,
  `api/<endpoint>.endpoint.ts`. Names locked.

---

## Q1 — IPC handler catalog shape and enumeration

**Question:** ROADMAP says "handlers with factory-pattern validation
at the IPC trust boundary." Which handlers does Run 4 actually ship?

**Answer:** Run 4 ships handlers as IPC SCAFFOLDING, NOT as domain
endpoints. Specifically:

- **One handler per renderer-to-main capability** the 8 slices need
  to express their "future" wired-but-empty state. NOT one handler
  per domain action (those land in Runs 5-9).
- **Existing handlers continue working:** `app:getVersion` (Run 2),
  `acp:probeBoundCLI` (Run 3). Both already structured-log on every
  invocation.
- **New handlers in Run 4** are the minimum-viable surface for each
  empty slice:
  - `workspace:read` — read current workspace path + agents.json
    summary (uses Run 2 data-layer).
  - `git:read` — read branch state + uncommitted paths (uses Run 2
    data-layer; serves the `workspace` slice).
  - `steps:read` — read step state from trailers (uses Run 2 data-layer;
    serves the `steps` slice). NOTE: only the READ side; the
    Concierge-Step COMMIT writer is Run 5.
  - `preferences:read` + `preferences:write` — minimal persisted
    user-preference layer using `safeWrite` (Run 2).
  - `auth:status` — out-of-band auth status reporter (just checks if
    Copilot is logged in; the actual login is the `copilot login`
    shell command per Run 3 grill Q4).
  - `session:listAcp` — wraps Run 3's `BoundCLISession` listSessions
    method.
  - `session:createAcp` — wraps Run 3's `BoundCLISupervisor.start()`
    + session.newSession.
  - `activity:read` — reads pino log tail; surfaces structured events
    to renderer (the `activity` slice needs an initial-hydration source
    just like preferences does — spec.md FR-031 made this explicit).

Domain action handlers (e.g., `step:run`, `step:cancel`,
`workspace:setActiveRepo`) are NOT in Run 4. They land in Run 5 (Step
Lifecycle) and Runs 6-9 (vertical slices) when their consumers exist.

**Reasoning:**
- Run 4 = scaffold + plumbing, NOT capability. Constitution VI says
  slices must be "wired but empty of business logic."
- 8 read-side handlers + 1 write-side handler (preferences) is enough
  to prove the IPC bridge works end-to-end without locking domain
  decisions yet.
- Each handler ships with: factory at the trust boundary, structured
  pino log per invocation, co-located test, RTK Query endpoint that
  consumes it, vertical TDD tracer bullet.

**ADR candidate?** No (mechanical application of constitution +
ROADMAP).

---

## Q2 — Listener middleware catalog enumeration

**Question:** ROADMAP says "all named listener middleware files
present (empty bodies)." Constitution mandates centralized listener
middleware (line 456). What's the catalog?

**Answer:** Six listener files, one per cross-domain coordination
topic, each empty in Run 4 except for the topic descriptor:

- `src/renderer/listeners/acpStreamSubscription.listener.ts` — owns
  the single ACP stream subscription per constitution V line 455. Empty
  body; topic descriptor declares the subscription channel.
- `src/renderer/listeners/stepLifecycle.listener.ts` — coordinates
  step state transitions across `steps` + `session` + `activity` slices.
- `src/renderer/listeners/sessionLifecycle.listener.ts` — coordinates
  session creation, model swap, mode swap across `session` + `copilot`
  slices.
- `src/renderer/listeners/workspaceChange.listener.ts` — coordinates
  workspace path change events affecting `workspace` + `agents` +
  `preferences` slices.
- `src/renderer/listeners/preferencesPersistence.listener.ts` —
  flushes preferences writes via the `preferences:write` IPC handler
  whenever a preferences slice action passes a debounce gate.
- `src/renderer/listeners/transcriptCapture.listener.ts` —
  captures ACP wire I/O into pino activity log; empty body in Run 4
  (Run 5 wires the actual capture).

Each file exports a `<topic>Listener` from `createListenerMiddleware`'s
`startListening` API, with the topic-descriptor comment block at the
top. Empty bodies. Each is its own file (constitution V — one effect
type per named file).

**Reasoning:**
- Six is the minimal catalog covering the 6 known cross-domain
  topics. Each name maps to a concrete coordination concern.
- Empty bodies satisfy "wired but empty of business logic" — Run 4
  proves the listener architecture; Runs 5-9 fill in bodies as their
  domain logic lands.
- Single ACP stream subscription rule (constitution V line 455) is
  load-bearing — having the file name reserved prevents future runs
  from accidentally creating a second subscription path.

**ADR candidate?** Yes — the listener catalog is hard-to-rename once
slices and listeners are coupled. **→ Tentative ADR-0007 during Plan
step: "Listener middleware catalog."**

---

## Q3 — Selector catalog conventions

**Question:** ROADMAP says "selectors directory with the typed hooks
(`useAppDispatch`, `useAppSelector`, `useAppStore`)." What's the
catalog and where do the typed hooks live?

**Answer:**

- **Typed hooks at `src/renderer/hooks/store.ts`**: `useAppDispatch`,
  `useAppSelector`, `useAppStore` exported from a single file. These
  use the canonical RTK pattern (`useDispatch.withTypes<AppDispatch>`,
  `useSelector.withTypes<RootState>`, `useStore.withTypes<AppStore>`).
- **Per-slice selectors** at `src/renderer/slices/<slice>.selectors.ts`:
  - Re-exports from `createEntityAdapter.getSelectors()` if the slice
    uses entity-adapter shape.
  - Composed/derived selectors via `createSelector` (memoized).
  - Naming convention: `select<Slice><Field>` (e.g.,
    `selectStepsCurrent`, `selectWorkspaceActiveRepoPath`).
- **Cross-slice selectors** at `src/renderer/selectors/`:
  - `crossSlice.selectors.ts` for selectors that read from 2+ slices.
  - Smart components access these (constitution line 400-413).
  - Empty in Run 4 (no domain logic) but file present + an export
    placeholder.

**Reasoning:**
- Hooks-at-one-file is the canonical RTK pattern; codifies the
  `useAppDispatch`/`useAppSelector`/`useAppStore` triple as the only
  way smart components reach the store.
- Per-slice selectors co-located with the slice (constitution V
  "named files for effects" applies symmetrically to pure selectors).
- Cross-slice selectors carved out to a separate dir to prevent the
  "slice imports another slice's selectors" smell.

**ADR candidate?** Maybe — selector convention is project taste.
Decision: defer ADR; capture in plan.md.

---

## Q4 — Slice file shape (8 slices, all empty)

**Question:** What's in each slice file in Run 4? "Empty of business
logic" — what survives?

**Answer:** Each `src/renderer/slices/<slice>.ts` ships with:

- The `createSlice` call with:
  - `name` — the slice name string
  - `initialState` — typed initial state (NOT empty; the type defines
    the shape, initial values are the "fresh app boot" state)
  - `reducers: {}` — empty in Run 4. Domain actions land per-slice
    in Runs 5-9.
  - `extraReducers: (builder) => {}` — empty. RTK Query extraReducer
    integration comes per-endpoint in Runs 5-9.
- A co-located `<slice>.test.ts` with at minimum:
  - Initial state shape assertion (TDD vertical tracer bullet:
    "when slice initializes, then state matches the canonical shape").
- A co-located `<slice>.selectors.ts` (per Q3) with at minimum a
  base selector returning the slice state.

**Initial state shapes (locked per constitution):**

```ts
ui:          { theme: 'system', sidebarOpen: true, activeView: null }
preferences: { hydratedFromDisk: false, theme: 'system' as const }
auth:        { copilotLoggedIn: null, githubLoggedIn: null }
workspace:   { activeRepoPath: null, agents: null, branch: null, ahead: 0, behind: 0, dirty: false }
steps:       { entities: {}, ids: [] }  // createEntityAdapter
session:     { activeSessionId: null, modelId: null, modeId: null }
activity:    { entries: [], cap: 256 }
copilot:     { capabilities: null, lastProbeAt: null }
```

**Reasoning:**
- Initial state shapes are constitutional consequences (e.g.,
  `workspace` mirrors the data-layer's branchState shape from Run 2;
  `copilot` mirrors `BoundCLICapabilities` from Run 3).
- Empty `reducers` and `extraReducers` blocks are the "skeleton"
  guarantee — Run 4 doesn't pick winners on action shapes; Runs 5-9
  do.
- The TDD test count for Run 4 will be modest (one initial-state test
  per slice + the listener-presence tests + IPC handler tests).

**ADR candidate?** No (mechanical, derived from constitution).

---

## Q5 — Product Provider mounting strategy

**Question:** Run 2 wired a `proofStore` directly in
`src/renderer/index.tsx`. Run 4 introduces the product store. Does
Run 4 mount the product `Provider`?

**Answer:** Yes. Run 4 replaces the inline `proofStore` with the
product `configureStore` call AND mounts a single `<Provider store={store}>`
at the renderer root. The proof rendering (Run 2 `app:getVersion` +
Run 3 ACP capability descriptor) continues working through the same
store.

This is the FIRST run where the product store actually exists in the
running app. Run 4 still doesn't introduce product UI — the
`<Provider>` wraps a renderer that renders the same proof div for
now. Runs 6-9 introduce the real UI.

**Reasoning:**
- Without `<Provider>`, the listener middleware never runs and no
  slice state is observable from React components. Empty bodies still
  need the runtime to be alive.
- Single Provider is the React-Redux canonical pattern; multiple
  Providers create state-shadowing bugs.
- Run 4 is the natural cutover point: the data-layer is real (Runs
  2-3), the slices are real (this run), product UI hasn't started.

**ADR candidate?** No (mechanical).

---

## Q6 — listener middleware initialization order

**Question:** When `configureStore` runs, in what order do listener
middleware files attach their startListening contracts?

**Answer:** Initialization order: alphabetical by filename. All 6
listener files export a `setup<Topic>Listener(startListening)`
function. The store assembly file iterates over them in a fixed
alphabetical order:

```ts
// src/renderer/store.ts (NEW in Run 4)
import { setupAcpStreamSubscriptionListener } from './listeners/acpStreamSubscription.listener';
import { setupPreferencesPersistenceListener } from './listeners/preferencesPersistence.listener';
import { setupSessionLifecycleListener } from './listeners/sessionLifecycle.listener';
import { setupStepLifecycleListener } from './listeners/stepLifecycle.listener';
import { setupTranscriptCaptureListener } from './listeners/transcriptCapture.listener';
import { setupWorkspaceChangeListener } from './listeners/workspaceChange.listener';
// ...
const listenerMiddleware = createListenerMiddleware();
setupAcpStreamSubscriptionListener(listenerMiddleware.startListening);
setupPreferencesPersistenceListener(listenerMiddleware.startListening);
setupSessionLifecycleListener(listenerMiddleware.startListening);
setupStepLifecycleListener(listenerMiddleware.startListening);
setupTranscriptCaptureListener(listenerMiddleware.startListening);
setupWorkspaceChangeListener(listenerMiddleware.startListening);
```

In Run 4 all bodies are empty so order is irrelevant. The alphabetical
convention locks it for future runs to prevent flaky test ordering.

**Reasoning:**
- RTK's `createListenerMiddleware` documents that startListening calls
  are independent (listeners don't shadow each other), so order is
  cosmetic.
- Alphabetical = deterministic, easy to scan, no "who decided this
  was first" disputes.

**ADR candidate?** No.

---

## Q7 — Mocked ACP for Run 4 tests (per ROADMAP)

**Question:** ROADMAP says Run 4 "can parallel with 3 using mocked
ACP." Run 3 is now done. Do we still mock ACP, or call the real
supervisor?

**Answer:** Run 4 tests use the REAL Run 3 ACP modules where they
exercise the IPC handler boundary. The `session:listAcp` and
`session:createAcp` handler tests instantiate `BoundCLISupervisor`
with a fake `child_process` (boundary mock per Pocock TDD), NOT a
mocked supervisor.

Per Pocock TDD `mocking.md`: mock ONLY at system boundaries. Run 3's
SDK is internal collaborator. Run 4's IPC handlers consume Run 3's
supervisor — internal collaborator. Mock `child_process` and `electron`'s
`ipcMain`/`ipcRenderer`.

**Reasoning:**
- ROADMAP's "mocked ACP" guidance was for parallelism BEFORE Run 3
  was done. Now that Run 3 exists, use the real interfaces.
- Mocking the supervisor would test the mock, not the integration —
  exactly the anti-pattern Pocock describes.

**ADR candidate?** No (Pocock TDD application).

---

## Q8 — Vertical tracer bullet first test (per TDD discipline)

**Question:** Per Pocock TDD vertical tracer bullets, what's the
FIRST test for Run 4?

**Answer:** The first vertical tracer bullet is:

> Given the product `configureStore` is invoked with all 8 slices,
> 6 listener middleware files, and the RTK Query API, when the store
> is created, then `store.getState()` returns the canonical initial
> state shape across all 8 slices.

This exercises:
- Store assembly (configureStore)
- All 8 slice imports + reducer integration
- All 6 listener middleware setup calls
- RTK Query api.reducer + api.middleware integration

RED: write the test asserting `getState()` matches the locked initial-
state shape (Q4). GREEN: assemble the store. Then expand to
per-handler vertical slices (workspace:read → workspace.slice
extraReducer wiring → workspace selector → renderer hook).

**SCOPE CLARIFICATION (analyze A009 fix):** The "extraReducer wiring"
and "renderer hook" cascade in the preceding paragraph describes the
PATTERN that Run 4 establishes for future runs, NOT in-scope Run 4
implementation work. Run 4 itself ships:
- Empty `extraReducers: (builder) => {}` in every slice (spec FR-010)
- Renderer hooks DEFINED (`useAppDispatch`, `useAppSelector`,
  `useAppStore`) but NOT exercised by domain UI
- Renderer endpoints DEFINED but not consumed by product UI

Domain `addCase` calls to RTK Query endpoints inside slice
extraReducers, and domain hook usage from product components, are
explicitly Run 5-9 work. The Q8 cascade language above is forward-
looking architectural intent. If implementers misread "expand to
extraReducer wiring" as Run-4 work, they violate FR-010 + FR-036.

**Reasoning:**
- Per Pocock SKILL.md: first test "proves the path works end-to-end."
  Store assembly is the end-to-end integration point for Run 4.
- Subsequent tracer bullets cascade per-handler: each IPC handler
  RED test, GREEN handler, RED renderer-entry factory test, GREEN
  factory, RED renderer endpoint test, GREEN endpoint definition.
  Vertical slices through the IPC-to-RTK-Query pipeline. Per-slice
  extraReducer hookups + hook usage = Run 5-9 scope.

**ADR candidate?** No.

---

## User decisions captured (2026-05-27)

- **Q1 IPC handler catalog (9 handlers + 2 existing):** "yes" — locked as drafted.
- **Q2 listener middleware catalog (6 listeners):** "yes" — locked as drafted.
- **Q3 slice initial states:** "yes" — all 8 shapes locked including dual-theme ui/preferences pattern and activity.cap=256 ring-buffer.

Q4-Q8 are constitutional consequences or Pocock TDD applications, no
user input needed. All 8 grill questions resolved. Proceeding to
/speckit.specify.
