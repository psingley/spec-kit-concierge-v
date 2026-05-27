# /speckit.specify input — Run 4: IPC Bridge & Redux Store Skeleton

> Passed to /speckit.specify via copilot --model gpt-5.5 --effort high.
> All 8 grill questions resolved in `specs/0004-ipc-bridge-redux-skeleton/grill.md`
> (3 user decisions + 5 constitutional/mechanical).

---

## Spec subject

Build Run 4 (IPC Bridge & Redux Store Skeleton) of the Concierge
Electron desktop app. Run 4 is the "state architecture spine" run per
ROADMAP_DECISIONS line 697 — it merges three originally-separate
sub-runs (slice catalog, listener middleware catalog, selector catalog)
into one unified skeleton.

Runs 2 (Main Data Layer Foundation) and 3 (ACP Adapter & Bound CLI
Supervisor) are complete and merged to main. Run 4 builds on top of
both. After Run 4, Run 5 (Step Lifecycle & Hook Infrastructure) is
unblocked.

Run 4 introduces ZERO domain logic. All slices have empty `reducers`.
All listener middleware files have empty bodies. IPC handlers are
READ-side scaffolding only (one exception: `preferences:write` for
persistence). The product `<Provider>` is mounted around the existing
proof-only UI. Domain UI, domain handlers, and domain logic land in
Runs 5-9.

## Constitutional grounding

- Constitution v1.0.4. Especially **Principle VI (Redux Toolkit + RTK
  Query, 8 slices fixed)** and **Principle V (Effects only in named
  files)**.
- Pocock TDD vertical tracer bullets per `.agents/skills/tdd/SKILL.md`.
- ROADMAP_DECISIONS lines 56-67 + 697-700 define Run 4 deliverables.
- Run 2's `src/renderer/api/baseQuery.ts` + RTK Query 8 tagTypes
  already exist; Run 4 EXTENDS but does not re-author.
- Run 3's `src/main/data-layer/acp/` is the real ACP integration —
  Run 4's session-related IPC handlers use the actual `BoundCLISupervisor`,
  NOT mocks.

## Locked decisions from grill

### Q1 — IPC handler catalog (9 new + 2 existing)

Existing (do not re-author):
- `app:getVersion` (Run 2)
- `acp:probeBoundCLI` (Run 3)

New in Run 4:
- `workspace:read` — read active workspace path + agents.json summary
- `git:read` — read branch state + uncommitted paths (uses Run 2 data-layer)
- `steps:read` — read step state from Concierge-Step trailers (uses Run 2 data-layer trailers reader; READ-only — writer is Run 5)
- `preferences:read` — read persisted preferences from disk
- `preferences:write` — write preferences via Run 2 safeWrite (ONLY write handler in Run 4)
- `auth:status` — out-of-band auth status reporter (checks Copilot login + GitHub gh CLI status; does NOT initiate login)
- `session:listAcp` — wraps Run 3 BoundCLISession.listSessions
- `session:createAcp` — wraps Run 3 BoundCLISupervisor.start + session.newSession

Each new handler ships with:
- Trust-boundary factory at IPC entry (6-case floor per constitution IV)
- Structured pino log on every invocation (channel + context + success/failure + latency)
- Co-located test using vertical TDD tracer bullets
- Renderer-side RTK Query endpoint that consumes it with renderer-entry factory (constitution IV double trust boundary as proven necessary in Run 3)

### Q2 — Listener middleware catalog (6 listeners, empty bodies)

All under `src/renderer/listeners/`:
- `acpStreamSubscription.listener.ts` — sole owner of ACP stream subscription per constitution V line 455
- `stepLifecycle.listener.ts` — coordinates `steps` + `session` + `activity` slices on step transitions
- `sessionLifecycle.listener.ts` — coordinates `session` + `copilot` slices on session creation, model swap, mode swap
- `workspaceChange.listener.ts` — coordinates `workspace` + agent manifest + `preferences` slices on workspace path change
- `preferencesPersistence.listener.ts` — debounce + flush preferences to disk via `preferences:write` handler
- `transcriptCapture.listener.ts` — captures ACP wire I/O into `activity` log (empty body in Run 4; Run 5 wires the actual capture)

Each file exports `setup<Topic>Listener(startListening)` taking the
RTK `startListening` API. Empty bodies in Run 4 except for the topic
descriptor comment block at the top.

Listener init order in the store assembly file: ALPHABETICAL by
filename (deterministic, irrelevant in Run 4 because all bodies are
empty).

### Q3 — Slice initial states (8 slices, all locked)

```ts
ui:          { theme: 'system', sidebarOpen: true, activeView: null }
preferences: { hydratedFromDisk: false, theme: 'system' }
auth:        { copilotLoggedIn: null, githubLoggedIn: null }
workspace:   { activeRepoPath: null, agents: null, branch: null, ahead: 0, behind: 0, dirty: false }
steps:       { entities: {}, ids: [] }  // createEntityAdapter
session:     { activeSessionId: null, modelId: null, modeId: null }
activity:    { entries: [], cap: 256 }  // ring-buffer cap
copilot:     { capabilities: null, lastProbeAt: null }
```

Notes:
- `ui.theme` AND `preferences.theme` both exist intentionally:
  `ui.theme` is what's currently showing; `preferences.theme` is what
  was saved. Until preferences hydrate from disk, ui falls back to
  system theme.
- `activity.cap: 256` is the in-memory ring buffer cap. Older events
  live on disk only.
- `steps` uses `createEntityAdapter` for stable-ID collection.

### Q4 — Slice file shape

Each `src/renderer/slices/<slice>.ts`:
- `createSlice({ name, initialState (per Q3), reducers: {}, extraReducers: (builder) => {} })`
- Co-located `<slice>.test.ts` with at MINIMUM the initial-state shape assertion (vertical tracer bullet)
- Co-located `<slice>.selectors.ts` with at MINIMUM a base selector

Empty `reducers` + empty `extraReducers` are the Run 4 contract.
Domain actions land per-slice in Runs 5-9.

### Q5 — Product Provider mounting

`src/renderer/index.tsx` is updated to:
- Import the product store from `src/renderer/store.ts` (NEW file)
- Wrap the existing proof rendering in `<Provider store={store}>`
- Continue rendering the same proof div (no product UI yet)

Single Provider. No multi-Provider state-shadowing.

### Q6 — Selector catalog

- **Typed hooks** at `src/renderer/hooks/store.ts`:
  - `useAppDispatch`, `useAppSelector`, `useAppStore` using
    `useDispatch.withTypes<AppDispatch>()`, etc. (canonical RTK pattern)
- **Per-slice selectors** at `src/renderer/slices/<slice>.selectors.ts`:
  - Naming convention `select<Slice><Field>` (e.g., `selectStepsCurrent`)
  - Memoized via `createSelector` when derived from 2+ pieces of slice state
- **Cross-slice selectors** at `src/renderer/selectors/crossSlice.selectors.ts`:
  - Smart components access these
  - Empty in Run 4 (no domain logic) with one placeholder export

### Q7 — Real ACP not mocked

Run 4 tests use the REAL Run 3 ACP modules. `session:listAcp` and
`session:createAcp` handler tests instantiate `BoundCLISupervisor`
with fake `child_process` (boundary mock per Pocock TDD), NOT
mocked supervisor.

Mock only at SYSTEM boundaries: `child_process`, filesystem writes,
time, Electron `ipcMain`/`ipcRenderer`. Do NOT mock the SDK, the
supervisor, slice reducers, or any internal collaborator.

### Q8 — First vertical tracer bullet

> Given the product `configureStore` is invoked with all 8 slices,
> 6 listener middleware files, and the RTK Query API, when the store
> is created, then `store.getState()` returns the canonical initial
> state shape across all 8 slices.

This proves: store assembly works, all imports resolve, listener
middleware setup is idempotent, RTK Query reducer integrates, initial
state shapes match the locked Q3 catalog. Cascade from there into
per-handler vertical slices: each IPC handler RED → GREEN → endpoint
RED → GREEN → hook usage RED → GREEN. Vertical slices through the
whole stack.

## Tech-stack delta from Run 3

No new runtime dependencies. RTK + react-redux + RTK Query already
installed in Run 2. ACP SDK already installed in Run 3. Run 4 is
pure first-party code.

## Run 4 deliverables (in dependency order)

1. **`src/renderer/slices/<slice>.ts` × 8** — slice files with empty
   reducers + initial state per Q3.
2. **`src/renderer/slices/<slice>.selectors.ts` × 8** — base selectors.
3. **`src/renderer/slices/<slice>.test.ts` × 8** — initial-state shape
   tests (vertical tracer bullet RED→GREEN per slice).
4. **`src/renderer/listeners/<topic>.listener.ts` × 6** — empty
   listener files with topic descriptors per Q2.
5. **`src/renderer/listeners/<topic>.listener.test.ts` × 6** —
   listener-presence tests (asserts each `setup<Topic>Listener` exports
   correctly and accepts the `startListening` API).
6. **`src/renderer/hooks/store.ts`** — typed hooks (`useAppDispatch`,
   `useAppSelector`, `useAppStore`).
7. **`src/renderer/selectors/crossSlice.selectors.ts`** — placeholder
   for cross-slice selectors.
8. **`src/renderer/store.ts`** — product `configureStore` assembling
   8 slices + 6 listener middleware + RTK Query api. Listener init
   alphabetical.
9. **`src/renderer/store.test.ts`** — first vertical tracer bullet
   per Q8.
10. **`src/renderer/index.tsx`** — replaces inline `proofStore` with
    product store + mounts single `<Provider>`. Proof rendering
    continues working.
11. **`src/main/ipc/workspace.ts` + co-located factory + spec** —
    `workspace:read` handler.
12. **`src/main/ipc/git.ts` + co-located factory + spec** — `git:read`
    handler.
13. **`src/main/ipc/steps.ts` + co-located factory + spec** —
    `steps:read` handler.
14. **`src/main/ipc/preferences.ts` + co-located factory + spec** —
    `preferences:read` + `preferences:write` handlers (both).
15. **`src/main/ipc/auth.ts` + co-located factory + spec** —
    `auth:status` handler.
16. **`src/main/ipc/session.ts` + co-located factory + spec** —
    `session:listAcp` + `session:createAcp` handlers.
17. **`src/preload/index.ts`** — extends with bridges for all 9 new
    IPC channels.
18. **`src/renderer/api/<slice>.endpoint.ts` × 7** — RTK Query
    endpoints consuming each handler (workspace, git, steps,
    preferences, auth, session-list, session-create). Each endpoint
    runs the response through a renderer-entry factory at
    `src/renderer/api/<slice>.factory.ts` per constitution IV (the
    preload bridge is a distinct trust boundary).
19. **`src/renderer/api/<slice>.factory.ts` × 7** — renderer-entry
    factories with 6-case floor.
20. **All Phase 9-equivalent verification tasks** — extending T055/T056
    pattern from Run 3 with new file paths.
21. **`.github/copilot-instructions.md`** updated with Run 4
    conventions: slice catalog reference, listener catalog reference,
    selector convention, store assembly file path.

## Acceptance criteria

- `npm run lint` exit 0; ESLint Pure/Effect layer rules apply to all
  new slice/listener/selector files.
- `npm run typecheck` exit 0; all 8 slice shapes typed correctly.
- `npm run test:coverage` exit 0; test count grows by at least:
  8 slice tests + 6 listener tests + 1 store assembly test + 7
  handler tests (factory + handler + endpoint per handler = ~3 tests
  each) = approximate floor 50 new tests = ~180 total (from Run 3's
  129).
- `npm run e2e` exit 0; existing smoke + ACP proof path still pass.
- Constitution VI satisfied: 8 named slices, RTK Query as the only
  IPC-crossing data primitive, listener middleware as the only
  cross-domain coordination path.
- Constitution V satisfied: every effect lives in a named file;
  ESLint Pure/Effect rule passes for all new files.
- ADR-0007 (listener middleware catalog) authored if Plan step
  decides to.
- The first vertical tracer bullet (Q8) is THE first test written.

## What this run does NOT introduce

- NO domain reducers (all slice reducers are `{}`)
- NO domain extra-reducers (all extraReducers are empty builders)
- NO listener bodies (all listener files have empty body except topic descriptor comment)
- NO product UI beyond the existing proof div
- NO Step Commit writer (Run 5)
- NO hook executor (Run 5)
- NO factories for domain steps (Runs 6-9)
- NO HTTP server (Run 10)
- NO MCP integration (Run 11)
- NO Jira submission (Run 12)
- NO Windows packaging changes (Run 13)

## Rationale for any deviation

If /speckit.specify finds a deliverable above that it believes should
be deferred or split, it MUST flag the deviation explicitly in spec.md
under a "Deviations from grill" section. The grill is the source of
truth.
