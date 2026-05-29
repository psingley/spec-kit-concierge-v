# Data Model: React Router Navigation Refactor

**Date**: 2026-05-29 | **Branch**: `008-react-router-refactor`

## Route Configuration

### Route Definitions (static)

| Path | Component | Guard | Query Params | Purpose |
|------|-----------|-------|--------------|---------|
| `/sign-in` | `SignInScreenContainer` | None (public) | None | Authentication screen |
| `/repos` | `RepoBrowseScreenContainer` | `AuthGuard` | None | Repository selection |
| `/workspace` | `WorkspaceContainer` | `AuthGuard` + `WorkspaceGuard` | `?step=<StepName>` | Active workspace with step pipeline |
| `*` (catch-all) | Redirect | None | None | Redirects to default route based on state |

### StepName Query Parameter Values

Valid values for `?step=` (from existing `StepName` type):
- `specify`
- `clarify`
- `plan`
- `tasks`
- `analyze`
- `review`

Invalid or missing values fall back to the currently active step.

## State Ownership Changes

### Fields REMOVED from Redux

| Slice | Field | Replacement |
|-------|-------|-------------|
| `ui` | `activeView` | Route path (`/sign-in`, `/repos`, `/workspace`) |
| `workspace` | `viewedStep` | URL query param `?step=<StepName>` |

### Fields RETAINED in Redux

| Slice | Field | Reason |
|-------|-------|--------|
| `auth` | `gateOpen` | Used by route guards + IPC; not navigation state |
| `workspace` | `selectedRepo` | Used by IPC data fetching, not just navigation |
| `workspace` | `branch` | Used by IPC data fetching, not just navigation |
| `workspace` | `activeStep` | Step lifecycle state machine (which step is executing) — distinct from viewed step |
| `workspace` | `maxReachedStep` | Step progression constraint — guards which steps are navigable |

### New Navigation-Related Reads

| Consumer | Old Pattern | New Pattern |
|----------|-------------|-------------|
| Determine current screen | `useAppSelector(selectAuthGateOpen)` + conditional render | Route match (rendered by router) |
| Determine viewed step | `useAppSelector(selectWorkspaceViewedStep)` | `useSearchParams().get('step')` |
| Navigate to step | `dispatch(workspaceStepViewed(step))` | Listener calls `router.navigate('/workspace?step=...')` |

## Router Instance Lifecycle

```
App bootstrap
  │
  ├─ createProductStore()           // Redux store (existing)
  │
  ├─ createAppRouter(store)         // NEW: creates memory router
  │    ├─ initialEntries derived from current Redux state
  │    └─ route config with guards referencing store
  │
  ├─ setupNavigationListener(startListening, router)  // NEW
  │    └─ watches Redux actions → calls router.navigate()
  │
  └─ render(<Provider> + <RouterProvider>)
```

## Listener Middleware: Navigation Topic

**Topic**: `navigation`
**Owns**: Redux-to-URL synchronization

**Triggering actions → route effects**:

| Action | Route Effect |
|--------|-------------|
| Auth gate opens (selector predicate) | Navigate to `/repos` (or `/workspace` if workspace active) |
| Auth gate closes (selector predicate) | Navigate to `/sign-in` |
| `workspaceEntered` | Navigate to `/workspace?step=specify` |
| `repositoryBrowseReset` | Navigate to `/repos` |
| `specifyCompletedInWorkspace` | Update query param to `?step=clarify` |
| Step viewed action (new) | Update query param to `?step=<step>` |
