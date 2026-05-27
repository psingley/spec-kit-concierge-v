# Run 2 Implementation Plan - Main Data Layer Foundation

**Branch**: `spec/0002-main-data-layer` | **Date**: 2026-05-27 | **Spec**: `specs/0002-main-data-layer/spec.md`

**Input**: Feature specification from `specs/0002-main-data-layer/spec.md`; locked grill decisions from `specs/0002-main-data-layer/grill.md`; clarification completed with no open questions.

## Summary

Run 2 builds the first main-process data-layer primitives and the renderer data-access shape that later runs depend on: durable direct file writes, lenient git trailer recovery, git state readers, a strict agent manifest factory and boot loader, date-rotated structured logs, one proof IPC channel, and an RTK Query API slice with the eight upfront tag types.

The post-refactor entry-point layout is baseline state. `src/main/index.ts`, `src/preload/index.ts`, and `src/renderer/index.tsx` already exist from commit `dd7fd1b`; moving files to those paths is not Run 2 work.

## Technical Context

**Language/Version**: TypeScript 5.7.2, `strict` and `noUncheckedIndexedAccess`.

**Primary Dependencies**: Electron 33.2.1, React 18.3.1, pino 9.x from Run 1, Vitest 2.1.8, Playwright 1.49.1. Run 2 adds exact runtime pins `@reduxjs/toolkit@2.12.0` and `react-redux@9.3.0`. Run 2 adds exact dev pin `pino-pretty@13.1.3` for development terminal logs only.

**Storage**: Local filesystem under caller-provided paths and Electron `app.getPath('userData')/logs/`; git repository state read through command-line git from main-process data-layer modules.

**Testing**: Vitest co-located unit specs, required co-located `*.factory.spec.ts` specs for every Run 2 factory, React Testing Library where renderer proof behavior needs DOM rendering, Playwright Electron smoke through `npm run e2e`.

**Target Platform**: Electron desktop app; Run 1 CI remains Windows-only, but Run 2 planning keeps Node/Electron APIs cross-platform.

**Project Type**: Desktop app with main/preload/renderer split.

**Performance Goals**: Data-layer calls are local and synchronous in scope from the user's perspective; avoid polling and avoid renderer-side direct I/O.

**Constraints**: No domain IPC beyond `app:getVersion`; no Redux Provider/store mounting in product UI; no HTTP, ACP supervisor, hook executor, MCP, Jira, Windows packaging, or product UI work. Safe writes request durability through `fsync` but do not claim atomicity. Logging has date-based file rotation only, no size rotation or retention.

**Scale/Scope**: Foundation for Runs 3-13; Run 2 ships one proof endpoint and the reusable boundaries future runs extend.

## Tech-Stack Delta from Run 1

| Area | Run 1 baseline | Run 2 delta |
|---|---|---|
| Renderer data access | No RTK Query API directory | Add `src/renderer/api/baseQuery.ts` and `src/renderer/api/index.ts` |
| Dependencies | React, React DOM, pino | Add exact runtime pins `@reduxjs/toolkit@2.12.0`, `react-redux@9.3.0`; add exact dev pin `pino-pretty@13.1.3` |
| Logging | `src/main/logging.ts` writes `main.log` | Date-rotated `concierge-YYYY-MM-DD.log` ndjson plus dev-only pretty stream |
| Data layer | No concrete data-layer factories | Add `src/main/data-layer/` fs, git, and agents modules |
| IPC | No IPC handlers | Add only `app:getVersion`, validated through a proof payload factory |
| Tests | Vitest/coverage may pass with no tests | Run 2 coverage must execute real specs; factory specs use the five-case floor |

## Constitution Check

**Gate status**: Pass after the v1.0.4 PATCH amendment in this planning set.

- Principle I: renderer remains free of Electron and Node built-in imports; all I/O lands in main-process modules or preload IPC. The stale workspace-path refusal clause is amended to a typed-helper audit-trail rule before implementation tasks are generated.
- Principle IV: trust-boundary payloads use hand-written factories only; no runtime schema library is introduced.
- Principle V: data-layer modules, IPC handlers, RTK Query `baseQuery`, and entry points are Effect-layer files; factories and parsing transforms keep side effects isolated.
- Principle VI: RTK Query owns IPC-crossing renderer access; Run 2 defines the base query and tag taxonomy without mounting the Redux store or Provider in product UI.
- Principle XV: pino remains the structured logger; production writes ndjson locally and development pretty printing is terminal-only.
- Testing Discipline: new logic ships with co-located specs; every Run 2 factory has a co-located `*.factory.spec.ts` file with the required five cases.

No complexity-tracking violations are introduced.

## Project Structure

### Documentation (this feature)

```text
specs/0002-main-data-layer/
|-- spec.md
|-- grill.md
|-- clarifications.md
|-- plan.md
|-- research.md
|-- checklists/
|   `-- requirements.md
`-- tasks.md                  # created by /speckit.tasks, not this plan

docs/adr/
`-- 0003-rtk-query-tagtypes-taxonomy.md

.specify/memory/
`-- constitution.md           # amended to v1.0.4

.github/
`-- copilot-instructions.md   # Run 2 conventions
```

### Source Code (repository root)

```text
src/
|-- main/
|   |-- index.ts                         # boot logging, manifest loader, proof IPC registration
|   |-- logging.ts                       # date-rotated pino config
|   |-- ipc/
|   |   |-- appVersion.ts                # only Run 2 IPC handler: app:getVersion
|   |   |-- appVersion.factory.ts        # validates proof payload
|   |   `-- appVersion.factory.spec.ts
|   `-- data-layer/
|       |-- fs/
|       |   |-- safeWrite.ts
|       |   `-- safeWrite.test.ts
|       |-- git/
|       |   |-- trailers.ts
|       |   |-- trailers.factory.spec.ts
|       |   |-- branchState.ts
|       |   |-- branchState.test.ts
|       |   |-- uncommittedPaths.ts
|       |   `-- uncommittedPaths.test.ts
|       `-- agents/
|           |-- agents.json
|           |-- manifest.ts
|           |-- manifest.factory.spec.ts
|           |-- loader.ts
|           `-- loader.test.ts
|-- preload/
|   `-- index.ts                         # exposes only app:getVersion proof bridge addition
|-- renderer/
|   |-- index.tsx                        # may dispatch/render app-version proof only
|   `-- api/
|       |-- baseQuery.ts
|       |-- baseQuery.test.ts
|       |-- index.ts
|       `-- index.test.ts
`-- test/
    |-- setup.ts
    |-- utils.ts
    |-- rtkQueryStore.ts                 # test-only helper if API dispatch tests need middleware
    `-- tempDir.ts                       # test-only helper for fs/git fixtures if needed
```

**Structure Decision**: Keep the current post-refactor entry points and add Run 2 modules under their constitution-literal locations. Main-process data-layer I/O lives under `src/main/data-layer/`. IPC registration lives under `src/main/ipc/`. Renderer API code lives under `src/renderer/api/` and must not import Electron or Node built-ins.

## Factory-Spec Test Conventions

Every Run 2 factory has a co-located `*.factory.spec.ts` file in the same directory as the factory module. Each factory spec includes at least:

1. Happy path: valid input returns the typed output.
2. Empty object: `{}` returns a named error.
3. Null: `null` returns a named error.
4. Undefined: `undefined` returns a named error.
5. Factory-specific hostile input: malformed trailer value, wrong manifest field type, unexpected app-version proof payload, or equivalent.

Factory errors use stable names that tests assert directly. Factory specs must cover public behavior and must not inspect private helper internals. Recovery-path parsers, especially `trailers.ts`, remain lenient and never throw; trust-boundary factories remain strict.

## New Test Infrastructure

- Add `src/test/rtkQueryStore.ts` only if API tests need a minimal test store with `api.reducer`, `api.middleware`, and dispatch helpers. This is test-only infrastructure; product Redux Provider mounting is out of scope.
- Add `src/test/tempDir.ts` only if repeated filesystem/git specs need deterministic temporary directories and cleanup.
- Keep Vitest as the only unit test runner. Do not add a runtime schema test library.
- Ensure `vitest.config.ts` includes `src/**/*.spec.{ts,tsx}` if current includes only `*.test.*`, so co-located factory specs are executed by `npm run test:coverage`.
- Extend lint boundaries so `src/renderer/api/` is covered by the existing renderer no-Electron/no-Node import rule.

## Implementation Sequence for `tasks.md`

1. **Dependency and test runner setup**
   - Update `package.json` and lockfile with exact pins: `@reduxjs/toolkit@2.12.0`, `react-redux@9.3.0`, and `pino-pretty@13.1.3`.
   - Update Vitest include globs for `*.spec.ts` and `*.factory.spec.ts`.
   - Add test helpers only if the first tests prove they are needed.

2. **Logging baseline**
   - Update `src/main/logging.ts` to create `<userData>/logs/concierge-YYYY-MM-DD.log`.
   - Use pino ndjson in production, `level: 'info'` by default, `debug` only when `CONCIERGE_DEBUG=1`.
   - Include `pid`, `hostname`, `app: 'concierge'`, package version, and `redact: []`.
   - Add dev-only `pino-pretty` terminal stream; never pretty-print production log files.

3. **Safe filesystem write primitive**
   - Add `src/main/data-layer/fs/safeWrite.ts`.
   - Implement direct overwrite using a file handle write plus file-handle `sync()` before close.
   - Log target path and calling Step context; do not reject paths outside a workspace; do not claim atomicity.
   - Add behavior specs proving content exists and fsync is requested.

4. **Git recovery primitives**
   - Add `src/main/data-layer/git/trailers.ts` and `trailers.factory.spec.ts`.
   - Cover the eight parser behaviors from the grill/spec: case-insensitive keys, exact values, normalized values, partial values, duplicate last-trailer-wins, warnings for superseded duplicates, silent no-trailer skip, and never-throw behavior.
   - Add `branchState.ts` with branch/ahead/behind/dirty reporting and specs.
   - Add `uncommittedPaths.ts` with path-set dirty reporting and specs.

5. **Agent manifest and loader**
   - Add `src/main/data-layer/agents/agents.json` with the verified Copilot CLI 1.0.54 entry from FR-007.
   - Add `manifest.ts` and `manifest.factory.spec.ts` for strict manifest validation.
   - Add `loader.ts` and loader specs; unverified entries warn and continue.
   - Wire loader into `src/main/index.ts` boot and log the loaded manifest shape at info level.

6. **Proof IPC and preload bridge**
   - Add `src/main/ipc/appVersion.factory.ts` and `appVersion.factory.spec.ts`.
   - Add `src/main/ipc/appVersion.ts` registering only `app:getVersion`.
   - Extend `src/preload/index.ts` only with the `app:getVersion` proof bridge.
   - Keep all domain IPC out of scope.

7. **Renderer RTK Query shape**
   - Add `src/renderer/api/baseQuery.ts` with `IpcQueryArgs`, `IPC_ERROR` envelope, preload bridge invocation, and no thrown IPC errors to renderer callers.
   - Add `src/renderer/api/index.ts` with the API slice, only `getAppVersion`, and exactly these tag types: `Workspace`, `StepState`, `GitState`, `Agent`, `Session`, `Step`, `Transcript`, `Preferences`.
   - Add base query and API specs proving success and structured IPC failure.

8. **App-version proof wiring**
   - Dispatch or render the `getAppVersion` proof without mounting a product Redux Provider.
   - Keep the product UI otherwise blank/foundation-only.
   - Update the existing e2e smoke only as needed to prove the window still opens, title matches, console stays clean, and the proof path succeeds.

9. **Governance and verification pass**
   - Keep `.github/copilot-instructions.md` aligned with Run 2 conventions.
   - Run and fix `npm run lint`, `npm run typecheck`, `npm run test:coverage`, and `npm run e2e`.
   - Positively confirm `src/main/index.ts`, `src/preload/index.ts`, `src/renderer/index.tsx`, and `src/renderer/api/` are included in lint/typecheck coverage.

## Out of Scope

- Layout refactor to `src/main/index.ts`, `src/preload/index.ts`, and `src/renderer/index.tsx`; already complete at commit `dd7fd1b`.
- Redux store or Provider mounting in product UI.
- Domain IPC handlers or domain endpoints.
- HTTP server behavior.
- ACP client, Bound CLI supervisor, hook executor, step commit writers, MCP, Jira, Windows packaging changes, or product UI beyond the app-version proof.

## Functional Requirements Coverage

| Requirement | Plan coverage |
|---|---|
| FR-001 | `src/main/data-layer/fs/safeWrite.ts` direct overwrite plus fsync, no workspace path guard |
| FR-002 | `src/main/data-layer/git/trailers.ts` lenient parser, interpretation metadata, warnings, no throws |
| FR-003 | `src/main/data-layer/git/branchState.ts` branch/ahead/behind/dirty reader |
| FR-004 | `src/main/data-layer/git/uncommittedPaths.ts` path-set change reader |
| FR-005 | `src/main/data-layer/agents/manifest.ts` strict manifest factory |
| FR-006 | `src/main/data-layer/agents/loader.ts` boot loader with unverified-entry warnings |
| FR-007 | `src/main/data-layer/agents/agents.json` verified Copilot CLI 1.0.54 entry |
| FR-008 | `src/main/logging.ts` date-rotated ndjson plus dev-only pretty output |
| FR-009 | `src/renderer/api/baseQuery.ts` plus eight RTK Query tag types |
| FR-010 | `src/renderer/api/index.ts` API slice with only `getAppVersion` |
| FR-011 | `src/main/ipc/appVersion.ts` only `app:getVersion` handler |
| FR-012 | `src/preload/index.ts` bridge extension only for `app:getVersion` |
| FR-013 | Constitution v1.0.4 PATCH amendment in `.specify/memory/constitution.md` |
| FR-014 | ADR-0003 in `docs/adr/0003-rtk-query-tagtypes-taxonomy.md` |
| FR-015 | `.github/copilot-instructions.md` Run 2 conventions |
| FR-016 | Dependency setup task for exact `@reduxjs/toolkit` and `react-redux` pins |
| FR-017 | Co-located `*.factory.spec.ts` five-case convention and execution via Vitest |
| FR-018 | Renderer API boundary rule and preload-only IPC access |
| FR-019 | Explicit out-of-scope exclusions for store mounting, HTTP, ACP, hooks, MCP, Jira, packaging, and product UI |
| FR-020 | Layout refactor excluded; current entry paths treated as baseline |

## Success Criteria Mapping

| Spec criterion | Plan coverage |
|---|---|
| SC-001 | Typecheck after entry-point and Run 2 module wiring |
| SC-002 | Lint after renderer API boundary coverage |
| SC-003 | Real Vitest coverage, including every `*.factory.spec.ts` five-case floor |
| SC-004 | Existing Electron smoke remains passing |
| SC-005 | Dev launch shows pretty terminal logs and proves app-version query path |
| SC-006 | Manifest loader succeeds and logs verified Copilot entry |
| SC-007 | Safe write specs prove file output and fsync request |
| SC-008 | Trailer parser spec covers locked parser behaviors |
| SC-009 | Constitution v1.0.4 amendment present |
| SC-010 | ADR-0003 present |
