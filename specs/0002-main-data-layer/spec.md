# Feature Specification: Main Data Layer Foundation

**Feature Branch**: `spec/0002-main-data-layer`

**Created**: 2026-05-27

**Status**: Ready for Planning

**Input**: User description: "Build Run 2 (Main Data Layer Foundation) of the Concierge Electron desktop app using the locked Run 2 grill decisions. The spec must describe the post-refactor world, must not include the already-completed layout refactor as a deliverable, and must not re-raise resolved grill questions."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Durable Main-Process Data Primitives (Priority: P1)

As a Concierge maintainer, I can rely on a typed main-process data layer for filesystem writes, git state reads, git trailer recovery, and uncommitted-path checks before later runs add step lifecycle behavior.

**Why this priority**: Runs 3-13 depend on these primitives; without them, later ACP, step-state, and domain flows would duplicate unsafe I/O behavior.

**Independent Test**: Run the factory and data-layer specs to prove each primitive accepts valid inputs, rejects invalid trust-boundary inputs with named errors, remains lenient for git-history recovery, and reports observable outcomes without requiring IPC, UI, or domain behavior.

**Acceptance Scenarios**:

1. **Given** a target file path and text content, **When** the safe write helper writes the file, **Then** the content exists on disk and durability is requested through fsync without making an atomic-rename guarantee.
2. **Given** git commit text containing Concierge-Step trailers, **When** the trailer parser evaluates the text, **Then** it returns a parsed shape with an `exact`, `normalized`, or `partial` interpretation and never throws.
3. **Given** a repository working tree, **When** branch and path-state readers are called, **Then** they report branch, ahead/behind, dirty/clean, and path-specific uncommitted-change state.

---

### User Story 2 - Boot-Time Agent Manifest and Logging Baseline (Priority: P2)

As a maintainer, I can start the app and see a verified Copilot agent manifest loaded and structured logs written to a predictable daily file, so future agent supervision has an auditable foundation.

**Why this priority**: Agent execution arrives in Run 3, but its manifest and observability contract must be stable before supervisor behavior is introduced.

**Independent Test**: Start the app and verify that the seeded manifest parses cleanly, the Copilot entry is treated as verified, missing verification on future entries only warns, and logs are written as ndjson to the user-data log directory with development pretty-print available through the dev command.

**Acceptance Scenarios**:

1. **Given** the seeded agent manifest, **When** the app boots, **Then** the manifest loads with the Copilot CLI entry verified against version 1.0.54 and logs the loaded shape at info level.
2. **Given** a future manifest entry without verification metadata, **When** the loader evaluates it, **Then** the loader surfaces a warning and continues.
3. **Given** the app runs on a calendar day, **When** logging emits events, **Then** logs are written to that day's Concierge log file as ndjson with app version, process, and host context.

---

### User Story 3 - Renderer Data Access Shape Proof (Priority: P3)

As a renderer-side developer, I can use the established RTK Query IPC base-query shape and tag taxonomy before domain endpoints exist, so later runs add endpoints consistently instead of inventing new access patterns.

**Why this priority**: The base-query shape is a cross-run contract; proving one safe app-version path prevents future renderer code from throwing raw IPC errors or bypassing the preload boundary.

**Independent Test**: Dispatch the proof endpoint and verify that the app version travels from main process to preload bridge to the renderer query layer, returning data on success and a structured IPC error object on failure.

**Acceptance Scenarios**:

1. **Given** the renderer calls the proof app-version endpoint, **When** the preload bridge invokes the allowed channel, **Then** the endpoint returns the main-process app version string through the RTK Query base-query shape.
2. **Given** the main side reports an IPC failure, **When** the base query receives it, **Then** the renderer sees `{ error: { status: 'IPC_ERROR', data: ... } }` and never receives a thrown Error.
3. **Given** renderer API code is linted, **When** boundary rules are evaluated, **Then** renderer API modules do not import Electron APIs or Node built-ins directly.

---

### User Story 4 - Run 2 Governance and Conventions (Priority: P4)

As a project steward, I can see the Run 2 architectural decisions captured in the constitution, ADRs, contributor instructions, dependency manifest, and factory-test convention, so later contributors follow the same vocabulary and boundaries.

**Why this priority**: Run 2 introduces the first production data-layer factories and a renderer data contract; governance artifacts keep those choices durable beyond the initial implementation.

**Independent Test**: Review the constitution amendment, ADR, contributor instructions, package dependency manifest, and co-located factory specs to confirm they match the locked grill decisions and do not reopen resolved questions.

**Acceptance Scenarios**:

1. **Given** Principle I still refers to a workspace path guard, **When** Run 2 planning lands, **Then** constitution v1.0.4 relaxes that clause to require typed helpers that log target path and calling Step instead of refusing external paths.
2. **Given** the RTK Query tag taxonomy is used by future runs, **When** ADR-0003 is reviewed, **Then** it records the eight upfront tag types and rationale.
3. **Given** a Run 2 factory is added, **When** its co-located spec is reviewed, **Then** it contains at least the five required factory cases.

---

### Edge Cases

- Safe writes outside an active workspace are allowed; the safety contract is typed helper usage plus logged target path and calling Step, not a path gate.
- Safe writes use direct overwrite plus fsync; a crash or power loss during write may leave partial content and must not be described as atomic.
- Concierge-Step trailer parsing is lenient: no trailer is skipped silently, duplicate trailers use last-trailer-wins with warnings for earlier duplicates, partial values are accepted with interpretation metadata, and parsing never throws.
- Trust-boundary factories, such as manifest and IPC payload factories, remain strict and return named errors for invalid empty, null, undefined, or hostile inputs.
- Agent entries without verification metadata are warning-worthy but do not prevent boot.
- Logging has no size-based rotation or retention policy in Run 2.
- The proof IPC surface is limited to `app:getVersion`; domain IPC, Redux Provider mounting, HTTP, ACP supervision, hook execution, MCP, Jira submission, packaging changes, and domain UI remain out of scope.
- The already-completed entry-point layout is the baseline: `src/main/index.ts`, `src/renderer/index.tsx`, and `src/preload/index.ts` are current paths, not Run 2 deliverables.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Run 2 MUST introduce `src/main/data-layer/fs/safeWrite.ts` for direct file overwrite plus fsync durability, with no atomic rename claim and no workspace path guard.
- **FR-002**: Run 2 MUST introduce `src/main/data-layer/git/trailers.ts` for lenient Concierge-Step trailer parsing with case-insensitive keys, interpretation metadata, last-trailer-wins duplicate handling, warning logs for superseded duplicates, silent no-trailer skips, and no thrown parser errors.
- **FR-003**: Run 2 MUST introduce `src/main/data-layer/git/branchState.ts` to report current branch, ahead/behind state, and dirty/clean state.
- **FR-004**: Run 2 MUST introduce `src/main/data-layer/git/uncommittedPaths.ts` to report whether a provided path set has uncommitted changes.
- **FR-005**: Run 2 MUST introduce `src/main/data-layer/agents/manifest.ts` as the strict factory for the agents manifest shape.
- **FR-006**: Run 2 MUST introduce `src/main/data-layer/agents/loader.ts` to load and validate the agent manifest at boot, warn on unverified future entries, and continue on unverified entries.
- **FR-007**: Run 2 MUST seed `src/main/data-layer/agents/agents.json` with the verified Copilot CLI entry: version 1, display name "GitHub Copilot CLI", binary `copilot`, launch args `["--allow-all-tools"]`, ACP flag `--acp`, verification against Copilot CLI 1.0.54 on 2026-05-27, text/tools capabilities, model selection strategy `unstable_setSessionModel|restart`, and null default model.
- **FR-008**: Run 2 MUST extend main-process logging so logs write as ndjson to `<userData>/logs/concierge-<ISO-date>.log`, rotate by calendar date, default to info level, switch to debug only when `CONCIERGE_DEBUG=1`, include pid, hostname, app name, and package version fields, keep an empty redaction placeholder, and reserve pretty-print for development terminal output only.
- **FR-009**: Run 2 MUST introduce `src/renderer/api/baseQuery.ts` with the RTK Query IPC base-query function and the eight tag types: Workspace, StepState, GitState, Agent, Session, Step, Transcript, and Preferences.
- **FR-010**: Run 2 MUST introduce `src/renderer/api/index.ts` with an API slice that contains no domain endpoints and includes only the `getAppVersion` proof endpoint.
- **FR-011**: Run 2 MUST add only the `app:getVersion` IPC handler as a proof endpoint and MUST NOT add any domain IPC handlers.
- **FR-012**: Run 2 MUST extend the preload bridge only for the `app:getVersion` proof channel.
- **FR-013**: Run 2 planning MUST land constitution v1.0.4 as a PATCH amendment that replaces the workspace-path refusal clause with a typed-helper audit-trail clause and records the amendment history.
- **FR-014**: Run 2 planning MUST add ADR-0003 documenting the RTK Query tag-type taxonomy.
- **FR-015**: Run 2 MUST update `.github/copilot-instructions.md` with Run 2 conventions for data-layer module paths, co-located `*.factory.spec.ts` requirements, and the RTK Query tag taxonomy.
- **FR-016**: Run 2 MUST add pinned `@reduxjs/toolkit` and `react-redux` runtime dependencies to `package.json`, with selected versions documented during planning.
- **FR-017**: Every Run 2 factory MUST ship with a co-located `*.factory.spec.ts` file that includes at least these five cases: happy path, empty object named error, null named error, undefined named error, and one factory-specific hostile case.
- **FR-018**: The renderer API layer MUST use the preload bridge for IPC and MUST NOT import Electron APIs or Node built-ins directly.
- **FR-019**: Run 2 MUST NOT include Redux store mounting, Provider mounting, HTTP server behavior, ACP client or Bound CLI supervisor behavior, Step Commit writers, hook executor behavior, domain step factories, MCP integration, Jira submission integration, Windows packaging changes, or product UI beyond the app-version proof rendering or dispatch.
- **FR-020**: The implementation MUST preserve the post-refactor entry-point world where `src/main/index.ts`, `src/renderer/index.tsx`, and `src/preload/index.ts` are the active entry paths; moving to those paths is not part of Run 2 scope.

### Key Entities

- **Safe Write Request**: A target path, textual contents, and calling Step context used to produce durable direct writes and auditable logs.
- **Concierge-Step Trailer Parse Result**: The parsed git-history recovery shape, including matched values, interpretation level, duplicate handling outcome, and warnings.
- **Branch State**: The repository branch summary including current branch, ahead/behind counts, and dirty/clean status.
- **Uncommitted Path Set**: A caller-provided set of paths and the result indicating whether any are changed in the working tree.
- **Agent Manifest**: Versioned registry of agent entries, verification metadata, launch arguments, capabilities, and model-selection behavior.
- **Log Event**: Structured ndjson event enriched with app, version, pid, hostname, level, and timestamp context.
- **IPC Query Args and Result**: Renderer query input containing channel and payload, plus either data or a structured IPC error result.
- **RTK Query Tag Taxonomy**: The eight shared tag labels that future endpoint invalidation will use.
- **App Version Proof**: Minimal end-to-end value proving main-to-preload-to-renderer data flow without introducing domain behavior.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `npm run typecheck` exits 0 and positively confirms the current `src/main/index.ts`, `src/renderer/index.tsx`, and `src/preload/index.ts` paths are typechecked.
- **SC-002**: `npm run lint` exits 0 and positively confirms Pure/Effect layer rules apply at the current boundaries, including that `src/renderer/api/` has no direct Electron or Node built-in imports.
- **SC-003**: `npm run test:coverage` exits 0 with a test count greater than 0 and every Run 2 factory represented by at least five required factory-spec cases.
- **SC-004**: `npm run e2e` exits 0 and the existing smoke test still verifies window opens, title matches, and zero console errors.
- **SC-005**: `npm run dev` launches the app, shows development pretty-print logging in the terminal, and proves `getAppVersion` returns the package version string from main process through preload bridge through the RTK Query proof endpoint to renderer-side dispatch.
- **SC-006**: Boot loading of `agents.json` succeeds and logs the loaded manifest shape at info level with the Copilot entry treated as verified.
- **SC-007**: Safe write verification demonstrates files are produced on disk with fsync applied and no atomicity claim made.
- **SC-008**: The trailer parser spec covers the eight enumerated parser behaviors from the locked grill decision and passes.
- **SC-009**: Constitution v1.0.4 and its amendment-history entry are present and document the Principle I relaxation.
- **SC-010**: ADR-0003 is present and records the RTK Query tag-type taxonomy.

## Assumptions

- Run 1 is complete and merged at HEAD `0046132`; the current working tree already uses the post-refactor entry-point paths from commit `dd7fd1b`.
- The locked grill decisions from `specs/0002-main-data-layer/grill.md` are settled and must not be re-raised during clarification.
- ADR-0002 governs factory-pattern validation; no runtime schema library is introduced for Run 2 factory work.
- The constitution amendment required by Q2 lands during planning rather than being completed by this specification artifact.
- The pino dependency already exists from Run 1; Run 2 configures behavior rather than selecting a new logger.
- `@reduxjs/toolkit` and `react-redux` are added because the renderer data-access shape needs RTK Query, even though store mounting is deferred.
- The proof app-version endpoint is a boundary proof and not a domain feature.

## Deviations from grill

- None. The specification keeps all 16 locked Run 2 deliverables in scope and treats the layout refactor as already complete baseline state, not as a Run 2 deliverable.
