# Quickstart: React Router Navigation Refactor

**Branch**: `008-react-router-refactor`

## TL;DR

This feature replaces the conditional-rendering navigation in `App.tsx` with React Router v7 library mode. Routes are declared, guards protect them, and a listener middleware keeps the URL in sync with Redux state.

## Setup

```bash
# Install the new dependency
npm install react-router@7

# Run tests in watch mode
npm run test:watch

# Run the app
npm run dev
```

## Key Files to Understand

| File | Purpose |
|------|---------|
| `src/renderer/router.ts` | Route definitions + `createMemoryRouter` factory |
| `src/renderer/components/guards/AuthGuard.tsx` | Redirects unauthenticated users to `/sign-in` |
| `src/renderer/components/guards/WorkspaceGuard.tsx` | Redirects users without workspace to `/repos` |
| `src/renderer/listeners/navigation.listener.ts` | Redux-drives-URL: watches actions, calls `navigate()` |
| `src/renderer/App.tsx` | Now just renders `<RouterProvider>` |

## Architecture at a Glance

```
Redux Action dispatched
       │
       ▼
┌─────────────────────────────┐
│ Navigation Listener          │
│ (listener middleware)        │
│                              │
│ Watches: auth changes,       │
│ workspaceEntered,            │
│ step viewed, etc.            │
└──────────────┬───────────────┘
               │ router.navigate(path)
               ▼
┌─────────────────────────────┐
│ React Router (memory)        │
│                              │
│ Matches route → renders      │
│ guard → renders screen       │
└──────────────────────────────┘
```

## Navigation Rules

1. **Redux drives URL** — never the reverse. No URL-change event dispatches into Redux.
2. **Guards read Redux** — `AuthGuard` and `WorkspaceGuard` use `useAppSelector` to decide redirects.
3. **Back/forward disabled** — Electron `before-input-event` intercepts Alt+Arrow keys.
4. **Step in URL** — `?step=clarify` query param on `/workspace` route. Updated by listener.

## TDD Workflow

Each task follows red-green-refactor:

1. Write a failing test for the next behavior
2. Implement the minimum code to make it pass
3. Refactor if needed
4. Commit

Tests live co-located with their modules (e.g., `router.test.ts` next to `router.ts`).

## Constitution Amendment

Section VI of `.specify/memory/constitution.md` will have a new bullet permitting URL-owned navigation state. The key phrase: "React Router is not classified as a 'state library' — it is a routing library that owns the narrow domain of URL navigation state."
