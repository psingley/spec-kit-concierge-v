# Research: React Router Navigation Refactor

**Date**: 2026-05-29 | **Branch**: `008-react-router-refactor`

## Research Topics

### 1. React Router v7 Library Mode with createMemoryRouter

**Decision**: Use `react-router@7.x` in library mode with `createMemoryRouter` and `RouterProvider`.

**Rationale**:
- React Router v7 merged the Remix framework into React Router but maintains a pure library mode for SPAs without SSR/framework features.
- `createMemoryRouter` is the correct router for Electron — no browser address bar, no hash fallback needed.
- `RouterProvider` replaces the older `<BrowserRouter>` + `<Routes>` pattern and supports the data router API (loaders/actions optional).
- In library mode, route definitions are a plain object array passed to `createMemoryRouter`.

**Alternatives considered**:
- Framework mode (rejected): Requires Vite plugin, file-based routing, would conflict with existing Forge+Vite build.
- `createBrowserRouter` (rejected): Requires browser history API, inappropriate for Electron renderer.
- `createHashRouter` (rejected): Hash-based URLs are unnecessary in Electron and aesthetically inferior.

**Key API surface**:
```typescript
import { createMemoryRouter, RouterProvider } from 'react-router';

const router = createMemoryRouter(routes, {
  initialEntries: ['/sign-in'],  // or derived from Redux state
});

// In component tree:
<RouterProvider router={router} />
```

### 2. Redux-Drives-URL Synchronization Pattern

**Decision**: A dedicated listener middleware function watches navigation-triggering Redux actions and calls `router.navigate()` programmatically.

**Rationale**:
- The listener middleware pattern is the constitutional standard for cross-domain renderer effects (Section VI).
- By watching specific actions (`workspaceEntered`, `repositoryBrowseReset`, auth state changes), the listener translates Redux state transitions into route changes.
- The router's `navigate()` function is imperative and can be called from outside React components.
- No bidirectional sync needed — URL is always a consequence of Redux, never a cause.

**Alternatives considered**:
- Redux middleware that wraps dispatch (rejected): Non-standard, harder to test.
- useEffect in a root component watching Redux state (rejected): Violates Effects Discipline (XIII) — this is cross-domain coordination, not external sync.
- connected-react-router / redux-first-history (rejected): Adds bidirectional sync complexity; overkill for Redux-drives-URL.

**Implementation sketch**:
```typescript
export const setupNavigationListener = (
  startListening: AppStartListening,
  router: ReturnType<typeof createMemoryRouter>
): void => {
  // Watch auth gate changes
  startListening({
    predicate: (action, currentState, previousState) =>
      selectAuthGateOpen(currentState) !== selectAuthGateOpen(previousState),
    effect: (action, listenerApi) => {
      const state = listenerApi.getState();
      if (!selectAuthGateOpen(state)) {
        router.navigate('/sign-in');
      } else if (selectWorkspaceSelectedRepo(state) === null) {
        router.navigate('/repos');
      }
    }
  });
  // Watch workspace entry
  startListening({
    actionCreator: workspaceEntered,
    effect: (action, listenerApi) => {
      router.navigate('/workspace?step=specify');
    }
  });
};
```

### 3. Route Guards in React Router v7

**Decision**: Use wrapper components (layout routes) that check Redux state and redirect via `<Navigate>` if preconditions fail.

**Rationale**:
- React Router v7 layout routes wrap child routes and render an `<Outlet>` when guards pass.
- Guard components are smart components (per constitution XII) — they read from the store via `useAppSelector`.
- On guard failure, they return `<Navigate to="/sign-in" replace />` — no useEffect needed.
- This is a render-time redirect, consistent with Effects Discipline (XIII rule 3: derive during render).

**Alternatives considered**:
- Route `loader` functions (rejected): Loaders are framework-mode features; in library mode they add complexity for synchronous auth checks.
- `beforeEach` guard (Vue Router style) — not available in React Router.
- Higher-order-component wrappers (rejected): Layout routes are the idiomatic React Router v7 pattern.

**Implementation sketch**:
```typescript
const AuthGuard = (): React.ReactElement => {
  const gateOpen = useAppSelector(selectAuthGateOpen);
  if (!gateOpen) return <Navigate to="/sign-in" replace />;
  return <Outlet />;
};
```

### 4. Disabling Back/Forward in Electron

**Decision**: Intercept `will-navigate` and keyboard accelerators in the main process; the memory router naturally has no back/forward without explicit API calls.

**Rationale**:
- `createMemoryRouter` does not respond to browser back/forward buttons by default — there's no browser chrome in Electron.
- However, Electron still supports `Alt+Left`/`Alt+Right` keyboard shortcuts for `webContents.goBack()`/`webContents.goForward()`.
- Disabling at the Electron level (main process) by intercepting keyboard shortcuts prevents any accidental history navigation.
- The memory router's internal history stack exists but is never exposed to user interaction.

**Implementation sketch (main process)**:
```typescript
mainWindow.webContents.on('before-input-event', (event, input) => {
  if (input.alt && (input.key === 'ArrowLeft' || input.key === 'ArrowRight')) {
    event.preventDefault();
  }
});
```

### 5. Step Query Parameter Synchronization

**Decision**: The `?step=` query parameter is updated by the navigation listener when `workspaceStepViewed` fires. On workspace route mount, a guard/layout component reads the query param and dispatches `workspaceStepViewed` if the step is valid and available.

**Rationale**:
- Keeps Redux-drives-URL for outbound (user clicks step → Redux action → listener updates URL).
- On initial load/reload, the workspace layout reads `?step=` and validates against step availability before dispatching.
- This is the only point where URL influences Redux (initial hydration) — not a bidirectional sync loop.

**Alternatives considered**:
- Store `viewedStep` in URL only, never in Redux (rejected): Other components and listeners already depend on `viewedStep` in Redux for step lifecycle coordination.
- Keep `viewedStep` in both Redux and URL with bidirectional sync (rejected): Violates SC-005; creates sync bugs.

**Resolution**: `viewedStep` is removed from the workspace Redux slice (per FR-016). Components that need it will use `useSearchParams()` to read `?step=`. The navigation listener updates the URL query param when step-related actions fire.

### 6. Constitution Amendment Wording

**Decision**: Add a subsection "URL-Based Navigation State" under Section VI after the "No other state library" bullet.

**Draft amendment text**:
```
- **URL-based navigation state** is the single exception to Redux
  ownership. The renderer URL (managed by React Router in memory-
  history mode) owns which screen is active and which ephemeral view
  context is selected (e.g., current step query parameter). Redux
  actions drive URL changes through listener middleware; the URL is
  a reflection of Redux navigation decisions, not an independent
  source of truth. Components read route context for screen/view
  awareness. Navigation state MUST NOT be duplicated in Redux
  slices. React Router is not classified as a "state library" under
  this section — it is a routing library that owns the narrow domain
  of URL navigation state.
```

**Rationale**: Explicit carve-out prevents future confusion. Makes clear that React Router's URL state is complementary to Redux, not a competing state library.
