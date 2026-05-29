# Feature Specification: React Router Navigation Refactor

**Feature Branch**: `008-react-router-refactor`

**Created**: 2026-05-29

**Status**: Draft

**Input**: User description: "Refactor the renderer to use React Router. Amend the constitution to allow the URL to handle navigation state, including query string parameters. Currently, the constitution dictates all state must be contained in Redux."

## Clarifications

### Session 2026-05-29

- Q: Which React Router v7 mode — library mode or framework mode? → A: Library mode (createMemoryRouter, declarative `<Routes>` components, no Vite plugin/loaders/actions)
- Q: Should workspace route encode repo/branch in URL path or keep them Redux-owned? → A: Minimal path (`/workspace?step=clarify`); repo/branch remain Redux-owned, set via IPC on workspace entry
- Q: Who drives navigation — Redux actions or URL changes? → A: Redux-drives-URL; actions trigger `navigate()` via listener middleware; URL is a reflection of Redux decisions
- Q: Should Electron back/forward navigation be supported? → A: Disabled entirely; navigation only through app UI controls and programmatic API
- Q: Should existing Redux navigation fields be removed or kept as mirrors? → A: Remove navigation fields from Redux; components read route context directly for screen/view awareness

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Navigate Between Application Screens via URL (Priority: P1)

A user opens the Concierge application and navigates between the sign-in screen, repository browse screen, and workspace screen. The current screen is reflected in the application URL so that navigation state survives window reloads and can be deep-linked by external agents.

**Why this priority**: This is the core routing refactor — replacing conditional Redux-based rendering with declarative route-based navigation. Without this, no other routing features work.

**Independent Test**: Can be fully tested by navigating between screens and verifying the URL updates, then reloading the window and confirming the correct screen renders.

**Acceptance Scenarios**:

1. **Given** the user is not authenticated, **When** the application loads, **Then** the URL resolves to the sign-in route and the sign-in screen renders.
2. **Given** the user is authenticated but has not selected a repository, **When** the application loads, **Then** the URL resolves to the repository browse route and the browse screen renders.
3. **Given** the user is authenticated and has an active workspace, **When** the application loads, **Then** the URL resolves to the workspace route and the workspace screen renders.
4. **Given** the user is on the workspace screen, **When** the user manually navigates to the repository browse route (or an external agent navigates via the HTTP API), **Then** the browse screen renders without requiring re-authentication.

---

### User Story 2 - Preserve Step and View Context in URL Query Parameters (Priority: P2)

A user working in the workspace can have their current step and viewed step reflected in query parameters so that deep-links to specific steps are possible and the viewed step survives a reload.

**Why this priority**: Step context in the URL enables external agents to deep-link directly into a specific step, supporting the "Driveable by External Agents" constitutional principle.

**Independent Test**: Can be tested by navigating to a step in the stepper, verifying the URL query parameter updates, then reloading and confirming the same step is displayed.

**Acceptance Scenarios**:

1. **Given** the user is in the workspace with the specify step active, **When** the user clicks the clarify step in the stepper, **Then** the URL query parameter reflects the viewed step.
2. **Given** a URL contains a step query parameter, **When** the application loads that URL, **Then** the workspace renders with that step visible (subject to step availability constraints).
3. **Given** the user is viewing a step and the URL has a step query parameter, **When** the step advances (specify completes), **Then** the URL query parameter updates to reflect the new active step.

---

### User Story 3 - Constitution Amendment Formalizes URL State Ownership (Priority: P3)

The project constitution is amended to carve out navigation state (routes and query parameters) as URL-owned, distinct from Redux-owned application state. This ensures future contributors understand the boundary between URL state and Redux state.

**Why this priority**: Without the constitutional amendment, any future contributor or automated review would flag React Router as a violation. The amendment establishes the precedent clearly.

**Independent Test**: Can be validated by reviewing the constitution document for a clear, unambiguous amendment that defines what state lives in the URL vs. Redux, and confirming no existing constitutional principles are contradicted.

**Acceptance Scenarios**:

1. **Given** the constitution exists with Section VI (State Management), **When** the amendment is applied, **Then** a new subsection explicitly permits URL-based navigation state (route paths and query parameters).
2. **Given** the amendment is in place, **When** a reviewer evaluates the React Router usage, **Then** it is clearly sanctioned by the constitution without needing interpretation.
3. **Given** the amendment defines URL state boundaries, **When** non-navigation state (auth tokens, step execution status, ACP streams) is evaluated, **Then** it is clear these remain Redux-owned and must not leak into the URL.

---

### Edge Cases

- What happens when a URL contains a route the user is not authorized to access (e.g., workspace route without authentication)? Route guards redirect to sign-in.
- How does the system handle a URL with a step query parameter for a step that is `not_available`? Falls back to the first available step.
- Browser back/forward navigation is disabled; no edge cases from history traversal apply.
- How does the system behave when the URL contains invalid or unrecognized query parameters? Unrecognized params are ignored; invalid step values fall back to default.
- What happens if the URL is manipulated to reference a repository or branch that no longer exists? Not applicable — repo/branch are not in the URL; they remain Redux-owned and validated via IPC.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST use a client-side router to determine which screen renders based on the URL path.
- **FR-002**: System MUST define distinct routes for: sign-in, repository browse, and workspace.
- **FR-003**: System MUST enforce route guards that redirect unauthenticated users to the sign-in route.
- **FR-004**: System MUST enforce route guards that redirect users without an active workspace back to the repository browse route.
- **FR-005**: System MUST reflect the currently viewed step as a URL query parameter when in the workspace route.
- **FR-006**: System MUST restore the viewed step from the URL query parameter on workspace route load (subject to step availability — a step that is `not_available` falls back to the first available step).
- **FR-007**: System MUST keep non-navigation Redux state consistent when routes change — route guard components read Redux state to enforce preconditions, and the navigation listener is the single source of programmatic route changes (see FR-015).
- **FR-008**: System MUST NOT store authentication tokens, ACP session state, step execution state, or any sensitive/transient data in the URL.
- **FR-009**: System MUST handle invalid or unrecognized routes by redirecting to the appropriate default route based on current auth/workspace state.
- **FR-010**: System MUST continue to support the external-agent HTTP API driving navigation transitions identically to human navigation (the API dispatches route changes that the router reflects).
- **FR-011**: The constitution MUST be amended with a clear subsection under Section VI that defines URL as the owner of navigation state (route paths and query parameters) while Redux remains the owner of all other renderer state.
- **FR-012**: System MUST use a memory-based router history (`createMemoryRouter`) appropriate for Electron's renderer process.
- **FR-013**: System MUST disable browser-style back/forward navigation (Alt+Left/Right, mouse buttons); all navigation is through explicit app UI controls or programmatic API.
- **FR-014**: System MUST use React Router v7 in library mode — no framework mode features (file-based routing, loaders, actions) are used.
- **FR-015**: System MUST implement Redux-drives-URL synchronization: Redux actions trigger programmatic `navigate()` calls via listener middleware; the URL reflects Redux navigation decisions, not the reverse.
- **FR-016**: System MUST remove existing Redux fields that serve purely as navigation state (e.g., `activeView` in the UI slice) after the refactor; components needing screen/view awareness MUST read from route context instead of Redux selectors.
- **FR-017**: System MUST keep workspace identity fields (`selectedRepo`, `branch`) in Redux as they serve non-navigation purposes (IPC, data fetching); the URL path for workspace is `/workspace` without repo/branch encoding.

### Key Entities

- **Route**: A URL path segment that maps to a screen or layout (e.g., `/sign-in`, `/repos`, `/workspace`).
- **Query Parameter**: A key-value pair appended to the URL that encodes ephemeral view context (e.g., `?step=clarify`).
- **Route Guard**: A check evaluated before a route renders that redirects the user if preconditions are not met.
- **Navigation State**: The subset of UI state that determines which screen and view is active — owned by the URL.
- **Application State**: All other renderer state (auth status, step execution, ACP streams, preferences) — owned by Redux.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can reload the application window and return to the same screen and step view they were on before the reload.
- **SC-002**: External agents can navigate the application to any screen or step by constructing a URL, with 100% parity to human navigation.
- **SC-003**: All existing acceptance tests for screen transitions continue to pass without modification to their assertions (only setup may change).
- **SC-004**: The constitution amendment is unambiguous — a new contributor can determine whether a given piece of state belongs in the URL or Redux within 30 seconds of reading the amendment.
- **SC-005**: No navigation-related state remains duplicated between Redux and the URL after the refactor is complete.

## Assumptions

- The application runs in Electron's renderer process where a memory-based router history (`createMemoryRouter`) is appropriate (no real browser address bar navigation).
- React Router v7 is the routing library, used in library mode only. Version: `react-router@7.x` (latest stable).
- The existing HTTP API for external agents will dispatch route-change actions through the same Redux store, which triggers programmatic navigation in the router via listener middleware.
- Query parameters are limited to navigation view context (current step, viewed step) and will not be used for sensitive or large data.
- The refactor does not change any main-process code, IPC contracts, or data-layer modules — it is renderer-only.
- Electron's `webContents` navigation events (if any) do not interfere with in-renderer routing; back/forward is explicitly disabled at the Electron level.
- The existing conditional rendering in `App.tsx` is the primary code that will be replaced by route declarations.
- The `activeView` field in the UI slice will be removed as it becomes redundant with route-based navigation. The `selectedRepo` and `branch` fields in the workspace slice are retained because they serve data-fetching and IPC purposes beyond navigation.
- Redux-drives-URL is the sync direction: no URL-change event listener dispatches into Redux. Route guards read Redux state to decide redirects; the URL is always a consequence of Redux state, never the cause.
