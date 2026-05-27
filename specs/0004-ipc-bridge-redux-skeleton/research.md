# Run 4 Research - IPC Bridge & Redux Store Skeleton

**Date**: 2026-05-27

## Decisions

### 1. RTK `createListenerMiddleware` setup pattern

**Decision**: Create exactly one listener middleware instance in `src/renderer/store.ts`, prepend it before default middleware, and invoke the six Run 4 listener setup functions in alphabetical filename order.

Implementation shape:

```ts
const listenerMiddleware = createListenerMiddleware();

setupAcpStreamSubscriptionListener(listenerMiddleware.startListening);
setupPreferencesPersistenceListener(listenerMiddleware.startListening);
setupSessionLifecycleListener(listenerMiddleware.startListening);
setupStepLifecycleListener(listenerMiddleware.startListening);
setupTranscriptCaptureListener(listenerMiddleware.startListening);
setupWorkspaceChangeListener(listenerMiddleware.startListening);

export const createProductStore = () =>
  configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware()
        .prepend(listenerMiddleware.middleware)
        .concat(api.middleware)
  });
```

Run 4 listener modules export `setup<Topic>Listener(startListening)` and a topic descriptor, but do not register effect bodies yet. Presence tests prove each setup function exports, accepts the `startListening` API, and dispatches nothing. Later runs may call `startListening` inside these files when there is actual domain behavior to attach.

**Rationale**: Redux Toolkit documents listener middleware as a lightweight side-effect mechanism, with static listeners registered by calling `listenerMiddleware.startListening()` during application setup. It also recommends placing the middleware before the serializability check because listener add/remove actions can include functions. One product middleware instance keeps cross-domain coordination auditable, and alphabetical setup prevents ordering drift.

**Alternatives considered**:

- One middleware per topic: rejected because it fragments the single legal cross-domain effect path and makes ordering/test cleanup harder.
- Dynamic listener registration from components: rejected because components must not own cross-domain effects.
- Register no middleware until listeners have bodies: rejected because Run 4 must prove the architecture spine and Provider/runtime setup before later domain runs.

**References**:

- Redux Toolkit `createListenerMiddleware`: https://redux-toolkit.js.org/api/createListenerMiddleware
- `specs/0004-ipc-bridge-redux-skeleton/grill.md` - Q2, Q6
- `docs/adr/0007-listener-middleware-catalog.md`

### 2. `createSlice` plus `createEntityAdapter` for the `steps` slice

**Decision**: Use `createSlice` for all eight slices with locked initial state and no Run 4 reducers. Use `createEntityAdapter` only for `steps`, because steps are a stable-ID collection.

Implementation shape:

```ts
export type StepStateRecord = {
  id: string;
  status: 'not_available' | 'pending' | 'complete';
};

export const stepsAdapter = createEntityAdapter<StepStateRecord>({
  selectId: (step) => step.id
});

const stepsSlice = createSlice({
  name: 'steps',
  initialState: stepsAdapter.getInitialState(),
  reducers: {},
  extraReducers: () => {}
});
```

Run 4 keeps `reducers: {}` and empty `extraReducers` across all slices. Endpoint hydration and domain actions land in later vertical runs when their behavior exists.

**Rationale**: Redux Toolkit's entity adapter produces the normalized `{ ids: [], entities: {} }` state required by the spec and generates selectors for stable-ID collections. The constitution requires `createEntityAdapter` for stable-ID collections; `steps` is the only Run 4 slice with that shape.

**Alternatives considered**:

- Plain array for steps: rejected because stable IDs are part of the locked shape and future steps need efficient by-ID lookup.
- Add placeholder reducers now: rejected because Run 4 explicitly ships zero domain reducers and zero domain extra-reducer behavior.
- Use entity adapters for non-collection slices: rejected because it weakens the clear shape of singleton state such as `ui`, `auth`, or `session`.

**References**:

- Redux Toolkit `createEntityAdapter`: https://redux-toolkit.js.org/api/createEntityAdapter
- `specs/0004-ipc-bridge-redux-skeleton/spec.md` - FR-006, FR-010
- `.specify/memory/constitution.md` - Principle VI

### 3. Selector memoization patterns

**Decision**: Keep per-slice base and field selectors co-located with each slice. Use plain selectors for direct field reads and `createSelector` only when a selector derives from multiple fields or returns a fresh object/array/computed value. Reserve cross-slice derivation for `src/renderer/selectors/crossSlice.selectors.ts`.

Naming convention:

```ts
export const selectWorkspace = (state: RootState) => state.workspace;
export const selectWorkspaceActiveRepoPath = (state: RootState) =>
  selectWorkspace(state).activeRepoPath;
export const selectWorkspaceStatusSummary = createSelector(
  [selectWorkspace],
  (workspace) => ({
    branch: workspace.branch,
    dirty: workspace.dirty
  })
);
```

For `steps`, use adapter selectors globalized through the slice selector:

```ts
export const stepsSelectors = stepsAdapter.getSelectors<RootState>(
  (state) => state.steps
);
export const selectStepsIds = stepsSelectors.selectIds;
export const selectStepsEntities = stepsSelectors.selectEntities;
```

**Rationale**: The constitution requires selectors as the composite read API and memoization for selectors returning fresh values. RTK re-exports Reselect `createSelector`; entity adapter selectors are draft-safe by default. Co-location keeps slice ownership clear, while the cross-slice module prevents slices importing each other.

**Alternatives considered**:

- Memoize every selector: rejected because direct field reads are stable and simpler without Reselect overhead.
- Put all selectors in one global file: rejected because ownership drifts and slice changes become cross-cutting.
- Let smart components read raw multi-slice state: rejected by Principle VI.

**References**:

- Redux Toolkit `createSelector`: https://redux-toolkit.js.org/api/createSelector
- React Redux TypeScript hooks guidance: https://react-redux.js.org/using-react-redux/usage-with-typescript
- `specs/0004-ipc-bridge-redux-skeleton/grill.md` - Q3

### 4. Renderer-entry factory pattern

**Decision**: Every Run 4 renderer endpoint must parse preload-returned `unknown` through a renderer-entry factory before returning data to RTK Query consumers.

Implementation shape:

```ts
const response = await baseQuery({ channel: 'workspace:read' });
if (response.error !== undefined) {
  return { error: response.error };
}

const parsed = parseRendererWorkspaceState(response.data);
if (!parsed.ok) {
  return {
    error: {
      status: 'PARSING_ERROR',
      data: {
        name: parsed.error.name,
        message: parsed.error.message
      }
    }
  };
}

return { data: parsed.value };
```

Each renderer-entry factory lives under `src/renderer/api/<domain>.factory.ts`, accepts `unknown`, returns a typed result or stable named error, and has the six-case floor. Endpoint tests assert the factory is in the path before any consumer sees the value.

**Rationale**: Run 3 proved the main-side factory is not enough. The preload bridge is a distinct cross-process surface, and Constitution IV says every payload entering the renderer from IPC/ACP/FS/HTTP must pass through a factory before consumers see it. The Run 3 analyze report resolved this by adding renderer-entry capability factory coverage; Run 4 generalizes that rule to all new endpoints.

**Alternatives considered**:

- Trust main-side factory output in renderer: rejected because the renderer still receives `unknown` from preload and the bridge can drift independently.
- Validate only in `ipcBaseQuery`: rejected because endpoint-specific factories own endpoint-specific shapes and errors.
- Use a runtime schema dependency: rejected by ADR-0002 and the no-new-runtime-dependency constraint.

**References**:

- `specs/0003-acp-adapter/tasks.md` - T049a/T049b renderer-entry factory tasks
- `specs/0003-acp-adapter/analyze.md` - prior issue C1 resolution
- `.specify/memory/constitution.md` - Principle IV
- `docs/adr/0002-factory-pattern-no-runtime-schema.md`

### 5. Preload bridge extension pattern

**Decision**: Extend `src/preload/index.ts` with narrow, named methods grouped by domain. Do not expose `ipcRenderer`, raw `invoke`, channel strings, or Node/Electron APIs to renderer code.

Implementation shape:

```ts
contextBridge.exposeInMainWorld('concierge', {
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion') as Promise<unknown>
  },
  workspace: {
    read: () => ipcRenderer.invoke('workspace:read') as Promise<unknown>
  },
  preferences: {
    read: () => ipcRenderer.invoke('preferences:read') as Promise<unknown>,
    write: (payload: unknown) =>
      ipcRenderer.invoke('preferences:write', payload) as Promise<unknown>
  }
});
```

`src/renderer/api/baseQuery.ts` remains the only renderer module that switches on IPC channel names. Renderer endpoint tests use a real `window.concierge` preload bridge mock and assert the correct bridge method is called.

**Rationale**: Electron's IPC guide recommends `ipcRenderer.invoke` paired with `ipcMain.handle` for two-way renderer-to-main calls and exposing limited methods through `contextBridge` instead of raw `ipcRenderer` for security. This matches the existing Run 2/3 bridge style and preserves renderer no-Electron/no-Node constraints.

**Alternatives considered**:

- Expose raw `ipcRenderer.invoke`: rejected by Electron security guidance and project layer rules.
- Import Electron in `src/renderer/api/baseQuery.ts`: rejected by Principle I.
- Use a generic `invoke(channel, payload)` bridge: rejected because it weakens the channel catalog and makes trust-boundary tests less deterministic.

**References**:

- Electron IPC tutorial: https://www.electronjs.org/docs/latest/tutorial/ipc
- `src/preload/index.ts`
- `src/renderer/api/baseQuery.ts`
- `specs/0004-ipc-bridge-redux-skeleton/spec.md` - FR-020 through FR-024

## No New Runtime Dependencies

Run 4 uses dependencies already present from Runs 2 and 3:

- `@reduxjs/toolkit@2.12.0`
- `react-redux@9.3.0`
- Electron IPC APIs
- Existing pino logger
- Existing Run 2 data-layer helpers
- Existing Run 3 ACP data-layer helpers

No runtime schema library, state library, IPC abstraction library, or listener middleware alternative is introduced.
