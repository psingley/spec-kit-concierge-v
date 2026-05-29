# Route Contracts: React Router Navigation Refactor

**Date**: 2026-05-29 | **Branch**: `008-react-router-refactor`

## Route Configuration Contract

The router exposes exactly these routes. Any addition requires a plan amendment.

### Public Routes (no guard)

```
/sign-in → SignInScreenContainer
```

### Authenticated Routes (AuthGuard)

```
/repos → RepoBrowseScreenContainer
```

### Workspace Routes (AuthGuard + WorkspaceGuard)

```
/workspace?step=<StepName> → WorkspaceContainer
```

### Catch-all

```
* → Redirect (computed based on auth/workspace state)
```

## Guard Contracts

### AuthGuard

**Input**: Redux state (`selectAuthGateOpen`)
**Behavior**:
- `gateOpen === true` → render `<Outlet>` (children)
- `gateOpen === false` → `<Navigate to="/sign-in" replace />`

### WorkspaceGuard

**Input**: Redux state (`selectWorkspaceSelectedRepo`, `selectWorkspaceBranch`)
**Behavior**:
- `selectedRepo !== null && branch !== null` → render `<Outlet>` (children)
- Otherwise → `<Navigate to="/repos" replace />`

## Query Parameter Contract

### `?step=<value>`

**Applies to**: `/workspace` route only

**Valid values**: `specify | clarify | plan | tasks | analyze | review`

**Validation rules**:
1. If `step` param is missing → use `activeStep` from Redux
2. If `step` param is an invalid string → use `activeStep` from Redux
3. If `step` param references a step where step state is `not_available` AND step index > `maxReachedStep` index → fall back to `activeStep`
4. If `step` param is valid and step is reachable → use the param value

**Update triggers** (navigation listener → URL):
- `workspaceStepViewed` action → set `?step=<payload>`
- `specifyCompletedInWorkspace` action → set `?step=clarify`
- `workspaceEntered` action → set `?step=specify`

## Navigation Listener Contract

**Listener topic**: `navigation`

**Router dependency**: Receives `router.navigate` function at setup time.

**Guarantees**:
- Never calls `navigate()` during another navigation (guards handle that)
- Always uses `replace: true` for state-driven redirects (no history stack growth)
- Never reads from URL — only writes to it based on Redux state

## Electron Main Process Contract

**Back/forward prevention**:
- Intercepts `Alt+ArrowLeft` and `Alt+ArrowRight` key events on `before-input-event`
- Prevents default behavior (no `webContents.goBack()`/`goForward()`)
- Does NOT intercept other navigation keys (Ctrl+L, F5, etc. — those are irrelevant in Electron without address bar)

## External Agent Navigation Contract

External agents navigate by dispatching Redux actions through the HTTP API (existing pattern). The navigation listener translates these into route changes. External agents do NOT construct URLs directly — they use the action-dispatch interface.

**Example flow**:
1. Agent POSTs `workspaceEntered({ repo, branch })` to HTTP API
2. HTTP API dispatches to Redux store
3. Navigation listener catches `workspaceEntered`
4. Listener calls `router.navigate('/workspace?step=specify')`
5. Route renders `WorkspaceContainer`
