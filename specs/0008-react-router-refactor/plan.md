# Implementation Plan: React Router Navigation Refactor

**Branch**: `008-react-router-refactor` | **Date**: 2026-05-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/0008-react-router-refactor/spec.md`

**Methodology**: TDD (red-green-refactor). Each tracer bullet starts with a failing test, then minimal implementation to pass.

## Summary

Refactor the Concierge renderer from conditional-rendering-based navigation (Redux selectors in `App.tsx`) to declarative route-based navigation using React Router v7 in library mode. Amend the constitution (Section VI) to formally permit URL-owned navigation state. Remove redundant Redux navigation fields. Implement Redux-drives-URL synchronization via listener middleware. Disable Electron back/forward.

## Technical Context

**Language/Version**: TypeScript 5.7 (strict + noUncheckedIndexedAccess)

**Primary Dependencies**: React 18.3, Redux Toolkit 2.12, react-redux 9.3, react-router 7.x (NEW)

**Storage**: N/A (renderer-only refactor)

**Testing**: Vitest 2.1 + @testing-library/react 16 + Playwright (e2e)

**Target Platform**: Electron 33 (Windows), renderer process only

**Project Type**: Desktop app (Electron)

**Performance Goals**: N/A — navigation transitions are instantaneous (no data loading)

**Constraints**: Memory-based router (no browser history); back/forward disabled; Redux-drives-URL only

**Scale/Scope**: 3 routes (`/sign-in`, `/repos`, `/workspace`), 1 query param (`?step=`), ~15 affected files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Layered Architecture | ✅ PASS | Renderer-only change; no main-process imports |
| II. Disk Is Truth | ✅ PASS | Navigation state is ephemeral UI state, not step completion |
| III. ACP-Only Bound CLI | ✅ PASS | No ACP changes |
| IV. Factory-First Data | ✅ PASS | No new external payloads; route params are internal |
| V. Scoped FP | ✅ PASS | React Router v7 library mode uses function components |
| VI. State Management | ⚠️ AMENDMENT | Spec FR-011 mandates amending Section VI to permit URL-owned navigation state. React Router is not a "state library" (not Zustand/Jotai/MobX); it's a routing library that owns navigation state by design. Amendment carves this out explicitly. |
| VII. Step Lifecycle | ✅ PASS | Step state machine unchanged; `viewedStep` moves to URL query param |
| IX. Driveable by External Agents | ✅ PASS | External agents drive via Redux actions → listener → navigate(); URL reflects result |
| XII. Smart/Dumb | ✅ PASS | Smart containers read route context; dumb components receive props |
| XIII. Effects Discipline | ✅ PASS | Route guards use component-level redirects, not useEffect |
| XIV. Accessibility | ✅ PASS | Route changes announce via aria-live; focus management on transition |
| Testing Discipline | ✅ PASS | TDD mandatory — each tracer bullet is RED → GREEN → refactor |

**Amendment required**: Section VI needs a new subsection: "URL-Based Navigation State". This is the only constitutional change.

## Project Structure

### Documentation (this feature)

```text
specs/0008-react-router-refactor/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── routes.md        # Route contract definitions
└── tasks.md             # Phase 2 output (from /speckit-tasks)
```

### Source Code (affected paths)

```text
src/renderer/
├── router.ts                          # NEW: createMemoryRouter + route config
├── router.test.ts                     # NEW: Router config tests
├── App.tsx                            # MODIFIED: RouterProvider replaces conditional rendering
├── index.tsx                          # MODIFIED: import router
├── components/
│   └── guards/
│       ├── AuthGuard.tsx              # NEW: redirects to /sign-in if !authed
│       ├── AuthGuard.test.tsx         # NEW
│       ├── WorkspaceGuard.tsx         # NEW: redirects to /repos if !workspace
│       └── WorkspaceGuard.test.tsx    # NEW
├── hooks/
│   ├── store.ts                       # EXISTING: unchanged
│   ├── useStepFromUrl.ts              # NEW: hook for step query param sync
│   └── useStepFromUrl.test.ts         # NEW
├── listeners/
│   ├── navigation.listener.ts         # NEW: Redux-drives-URL listener
│   └── navigation.listener.test.ts    # NEW
└── slices/
    ├── ui.ts                          # MODIFIED: remove activeView
    └── workspace.ts                   # MODIFIED: remove viewedStep (moves to URL)

src/main/
└── index.ts                           # MODIFIED: disable back/forward key bindings

e2e/
└── routing.spec.ts                    # NEW: e2e route transition tests

.specify/memory/
└── constitution.md                    # MODIFIED: Section VI amendment
```

**Structure Decision**: Extends existing `src/renderer/` layout. Guards go in `components/guards/` (smart components per constitution XII). Navigation listener added alongside existing listeners. No new top-level directories.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Constitution VI amendment | React Router owns URL navigation state by design; forcing all navigation into Redux creates unnecessary sync complexity | Keeping navigation in Redux duplicates what the router already manages and violates SC-005 |

