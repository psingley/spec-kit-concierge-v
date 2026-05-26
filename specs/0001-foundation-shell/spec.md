# Feature Specification: Foundation Shell & Boundaries

**Feature Branch**: `0001-foundation-shell`

**Created**: 2026-05-26

**Status**: Ready for Planning

**Input**: User description: "Create or update the Run 1 spec for specs/0001-foundation-shell using the locked answers from specs/0001-foundation-shell/grill.md, .specify/memory/constitution.md, and ROADMAP_DECISIONS.md. This is the Foundation Shell & Boundaries spec for the Concierge App."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Blank App Shell (Priority: P1)

As a maintainer, I can start the app and see a blank Electron window, confirming the foundation boots before any product UI exists.

**Why this priority**: Launchability is the Run 1 contract and the base requirement for all later work.

**Independent Test**: Start the app locally and confirm it opens to an intentionally blank window.

**Acceptance Scenarios**:

1. **Given** a clean checkout, **When** `npm run dev` starts, **Then** a blank Electron window opens.

---

### User Story 2 - Zero-Test Coverage Gate (Priority: P2)

As a maintainer, I can run coverage before any tests exist, so the foundation remains verifiable from day one.

**Why this priority**: The repository must stay testable even while still empty.

**Independent Test**: Run the coverage command in a repository with zero tests and confirm it succeeds.

**Acceptance Scenarios**:

1. **Given** zero test files, **When** `npm run test:coverage` runs, **Then** the command succeeds.

---

### User Story 3 - Electron Smoke Verification (Priority: P3)

As a maintainer, I can run one smoke test that proves the shell opens cleanly and emits no console errors.

**Why this priority**: A minimal e2e signal protects the blank shell contract without adding product behavior.

**Independent Test**: Run the e2e suite and verify the single smoke test passes.

**Acceptance Scenarios**:

1. **Given** the app launches, **When** `npm run e2e` runs, **Then** one smoke test passes that asserts window-opens, title-matches, and zero-console-errors.

---

### Edge Cases

- The blank window must remain blank; this is intentional and constitutional for Run 1.
- Coverage must succeed even when the repository contains zero tests.
- The smoke test must fail if the window does not open, the title changes unexpectedly, or any console error appears during launch.
- Run 1 must not introduce factories, runtime schema libraries, Redux slices, IPC handlers, UI components, business logic, HTTP API endpoints, MCP detection, ACP client behavior, or spec-kit hook implementations.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The project MUST establish the Electron shell with a main / renderer / preload split and a Vite-renderer entry surface.
- **FR-002**: `npm run dev` MUST open a blank Electron window; the blank state is intentional and is the Run 1 baseline.
- **FR-003**: The codebase MUST use TypeScript strict mode with `noUncheckedIndexedAccess` enabled.
- **FR-004**: ESLint MUST enforce the Pure/Effect layer-boundary rules at error level from day one.
- **FR-005**: The repository MUST include co-located Vitest and React Testing Library support for unit and component tests.
- **FR-006**: The repository MUST include a Playwright e2e smoke path that uses Electron's `_electron` API.
- **FR-007**: `npm run test:coverage` MUST succeed when the repository contains zero tests.
- **FR-008**: `npm run e2e` MUST run exactly one smoke test that asserts window-opens, title-matches, and zero-console-errors during launch.
- **FR-009**: Structured logging MUST write pino output to the Electron `userData` directory.
- **FR-010**: Windows release packaging MUST use an Electron Forge NSIS maker, and auto-update MUST remain deferred.
- **FR-011**: GitHub Actions CI MUST run on a Windows-only matrix.
- **FR-012**: Run 1 MUST exclude factories, runtime schema libraries, Redux slices, IPC handlers, UI components, business logic, HTTP API endpoints, MCP detection, ACP client behavior, and spec-kit hook implementations.

### Key Entities

- **App Shell**: the minimal Electron window that proves launchability without product UI.
- **Boundary Contract**: the enforced separation between main, renderer, and preload code.
- **Verification Harness**: the dev, coverage, and e2e commands that guard the foundation.
- **Release Surface**: the Windows packaging and CI contract.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `npm run dev` launches a blank Electron window.
- **SC-002**: `npm run test:coverage` succeeds with zero tests.
- **SC-003**: `npm run e2e` succeeds with one Playwright smoke test that asserts window-opens, title-matches, and zero-console-errors.

## Assumptions

- Electron Forge + Vite-renderer + main/renderer/preload split are locked foundation choices and are not re-opened in this run.
- TypeScript strict with `noUncheckedIndexedAccess`, ESLint Pure/Effect error enforcement, Vitest + React Testing Library, Playwright via `_electron`, pino logging to `userData`, NSIS packaging, deferred auto-update, and Windows-only GitHub Actions CI are locked decisions.
- The blank window is intentional and constitutional for Run 1; it is not a missing feature.
- This run does not introduce factories, runtime schema validation, Redux slices, IPC handlers, UI components, business logic, HTTP API endpoints, MCP detection, ACP client behavior, or spec-kit hook implementations.
