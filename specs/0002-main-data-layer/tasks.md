---
feature: Main Data Layer Foundation
branch: spec/0002-main-data-layer
created: 2026-05-27
source_plan: specs/0002-main-data-layer/plan.md
---

# Tasks: Run 2 Main Data Layer Foundation

**Input**: `specs/0002-main-data-layer/plan.md`, especially the implementation sequence in lines 148-198.

**Scope guard**: These tasks intentionally exclude the already-completed layout refactor from commit `dd7fd1b`, constitution v1.0.4, and ADR-0003. They include only implementation work for `/speckit.implement`.

**Task format**: Each task names a concrete path, explicit dependencies, and the acceptance condition that must be true before the task is marked complete.

## Phase 1 - Dependency and test runner setup

- [ ] T001 Update dependency pins in `package.json` and `package-lock.json`.
  - Dependencies: none.
  - Acceptance: `@reduxjs/toolkit` is pinned exactly to `2.12.0`, `react-redux` is pinned exactly to `9.3.0`, `pino-pretty` is pinned exactly to `13.1.3`, and the lockfile reflects those exact versions.

- [ ] T002 Update Vitest spec discovery in `vitest.config.ts`.
  - Dependencies: none.
  - Acceptance: `npm run test:coverage` discovers `src/**/*.test.{ts,tsx}`, `src/**/*.spec.{ts,tsx}`, and co-located `*.factory.spec.ts` files without dropping existing test behavior.

- [ ] T003 Extend renderer boundary lint coverage in `eslint.config.mjs`.
  - Dependencies: none.
  - Acceptance: `src/renderer/api/**/*.{ts,tsx}` is covered by the existing renderer no-Electron/no-Node import rule.

- [ ] T004 Add reusable temporary directory test support in `src/test/tempDir.ts`.
  - Dependencies: none.
  - Acceptance: filesystem and git specs can create isolated temporary directories and clean them up deterministically without duplicating fixture code.

- [ ] T005 Add RTK Query test store support in `src/test/rtkQueryStore.ts`.
  - Dependencies: T001.
  - Acceptance: renderer API specs can create a test-only store with `api.reducer`, `api.middleware`, and dispatch helpers without mounting a product Redux Provider.

## Phase 2 - Logging baseline

- [ ] T006 Implement date-rotated pino logging in `src/main/logging.ts`.
  - Dependencies: T001.
  - Acceptance: `createMainLogger()` writes ndjson to `<userData>/logs/concierge-YYYY-MM-DD.log`, defaults to `info`, switches to `debug` only when `CONCIERGE_DEBUG=1`, includes `pid`, `hostname`, `app: 'concierge'`, package version, and `redact: []`, and uses `pino-pretty` only for development terminal output.

## Phase 3 - Safe filesystem write primitive

- [ ] T007 Add safe-write behavior specs in `src/main/data-layer/fs/safeWrite.test.ts`.
  - Dependencies: T002, T004, T006.
  - Acceptance: specs assert that written content exists on disk, file-handle `sync()` is requested before close, target path and calling Step context are logged, outside-workspace paths are not rejected, and no atomic rename guarantee is claimed.

- [ ] T008 Implement the safe write helper in `src/main/data-layer/fs/safeWrite.ts`.
  - Dependencies: T007.
  - Acceptance: `safeWrite` performs direct overwrite through a file handle, calls file-handle `sync()` before close, logs the target path and calling Step context, allows paths outside a workspace, and passes `safeWrite.test.ts`.

## Phase 4 - Git recovery primitives

- [ ] T009 Add trailer parser factory specs in `src/main/data-layer/git/trailers.factory.spec.ts`.
  - Dependencies: T002, T006.
  - Acceptance: specs cover the five factory floor cases plus the eight parser behaviors: case-insensitive keys, exact values, normalized values, partial values, duplicate last-trailer-wins, warnings for superseded duplicates, silent no-trailer skip, and never-throw behavior.

- [ ] T010 Implement lenient trailer parsing in `src/main/data-layer/git/trailers.ts`.
  - Dependencies: T009.
  - Acceptance: parser returns structured results with `interpretation: 'exact' | 'normalized' | 'partial'`, emits warnings for duplicate or partial recoveries, silently skips commits without trailers, never throws, and passes `trailers.factory.spec.ts`.

- [ ] T011 Add branch-state specs in `src/main/data-layer/git/branchState.test.ts`.
  - Dependencies: T004.
  - Acceptance: specs create a git fixture and assert current branch, ahead count, behind count, and dirty/clean reporting.

- [ ] T012 Implement branch-state reading in `src/main/data-layer/git/branchState.ts`.
  - Dependencies: T011.
  - Acceptance: reader shells out to git from the main-process data layer, reports branch/ahead/behind/dirty state, surfaces git failures explicitly, and passes `branchState.test.ts`.

- [ ] T013 Add uncommitted-path specs in `src/main/data-layer/git/uncommittedPaths.test.ts`.
  - Dependencies: T004.
  - Acceptance: specs create changed and clean path-set fixtures and assert path-specific uncommitted-change reporting.

- [ ] T014 Implement uncommitted-path reading in `src/main/data-layer/git/uncommittedPaths.ts`.
  - Dependencies: T013.
  - Acceptance: reader reports whether any caller-provided paths have uncommitted changes, treats unrelated dirty paths as non-matches, surfaces git failures explicitly, and passes `uncommittedPaths.test.ts`.

## Phase 5 - Agent manifest and loader

- [ ] T015 Seed the verified Copilot manifest in `src/main/data-layer/agents/agents.json`.
  - Dependencies: none.
  - Acceptance: manifest version is `1` and contains the `copilot` entry with display name `GitHub Copilot CLI`, binary `copilot`, launch args `["--allow-all-tools"]`, ACP flag `--acp`, verification against version `1.0.54` on `2026-05-27`, capabilities `["text", "tools"]`, model selection strategy `unstable_setSessionModel|restart`, and `defaultModel: null`.

- [ ] T016 Add strict manifest factory specs in `src/main/data-layer/agents/manifest.factory.spec.ts`.
  - Dependencies: T002, T015.
  - Acceptance: specs cover the five factory floor cases and validate the seeded Copilot entry while asserting stable named errors for invalid manifest input.

- [ ] T017 Implement manifest validation in `src/main/data-layer/agents/manifest.ts`.
  - Dependencies: T016.
  - Acceptance: factory returns typed manifest data for valid input, returns stable named errors for invalid trust-boundary input, supports optional `verifiedAgainst` for future entries, and passes `manifest.factory.spec.ts`.

- [ ] T018 Add agent loader specs in `src/main/data-layer/agents/loader.test.ts`.
  - Dependencies: T006, T017.
  - Acceptance: specs assert that the seeded manifest loads successfully, unverified future entries warn and continue, malformed manifests fail with named factory errors, and the loaded shape is loggable.

- [ ] T019 Implement the agent manifest loader in `src/main/data-layer/agents/loader.ts`.
  - Dependencies: T018.
  - Acceptance: loader reads `agents.json`, validates through `manifest.ts`, warns without aborting for unverified entries, returns the loaded manifest shape, and passes `loader.test.ts`.

- [ ] T020 Wire manifest loading into boot in `src/main/index.ts`.
  - Dependencies: T006, T019.
  - Acceptance: app startup invokes the loader after logger creation and logs the loaded manifest shape at info level without adding supervisor, ACP, or domain behavior.

## Phase 6 - Proof IPC and preload bridge

- [ ] T021 Add app-version proof factory specs in `src/main/ipc/appVersion.factory.spec.ts`.
  - Dependencies: T002.
  - Acceptance: specs cover the five factory floor cases, including a hostile unexpected proof payload, and assert stable named errors for invalid input.

- [ ] T022 Implement app-version proof payload validation in `src/main/ipc/appVersion.factory.ts`.
  - Dependencies: T021.
  - Acceptance: factory accepts the valid app-version proof payload shape, rejects empty, null, undefined, and hostile inputs with stable named errors, and passes `appVersion.factory.spec.ts`.

- [ ] T023 Add only the app-version IPC handler in `src/main/ipc/appVersion.ts`.
  - Dependencies: T022.
  - Acceptance: module registers only `app:getVersion`, returns the package version through the proof factory, and introduces no domain IPC channels.

- [ ] T024 Extend the preload proof bridge in `src/preload/index.ts`.
  - Dependencies: T023.
  - Acceptance: preload exposes only the `app:getVersion` proof bridge needed by the renderer, keeps the surface narrow, and does not expose Node or Electron APIs directly to renderer code.

- [ ] T025 Register the proof IPC channel at boot in `src/main/index.ts`.
  - Dependencies: T020, T023.
  - Acceptance: app startup registers `app:getVersion` exactly once before renderer proof calls can run, with no additional IPC channels.

## Phase 7 - Renderer RTK Query shape

- [ ] T026 Add IPC base-query specs in `src/renderer/api/baseQuery.test.ts`.
  - Dependencies: T001, T002, T024.
  - Acceptance: specs prove successful preload invocation returns `{ data }`, thrown or rejected IPC failures return `{ error: { status: 'IPC_ERROR', data: ... } }`, and no raw Error is thrown to renderer callers.

- [ ] T027 Implement the IPC base query in `src/renderer/api/baseQuery.ts`.
  - Dependencies: T026.
  - Acceptance: `IpcQueryArgs`, the `IPC_ERROR` envelope, and the preload bridge invocation are implemented without Electron or Node imports, and `baseQuery.test.ts` passes.

- [ ] T028 Add API slice specs in `src/renderer/api/index.test.ts`.
  - Dependencies: T005, T027.
  - Acceptance: specs prove the API slice exposes only `getAppVersion`, dispatch succeeds through the base query, structured IPC failure is preserved, and the eight tag types are present exactly once.

- [ ] T029 Implement the RTK Query API slice in `src/renderer/api/index.ts`.
  - Dependencies: T028.
  - Acceptance: API slice uses `ipcBaseQuery`, defines only `getAppVersion`, declares exactly `Workspace`, `StepState`, `GitState`, `Agent`, `Session`, `Step`, `Transcript`, and `Preferences` as tag types, and introduces no domain endpoints.

## Phase 8 - App-version proof wiring

- [ ] T030 Wire the renderer app-version proof in `src/renderer/index.tsx`.
  - Dependencies: T029.
  - Acceptance: renderer dispatches or renders the `getAppVersion` proof without mounting a product Redux Provider, leaves the product UI otherwise blank/foundation-only, and surfaces no raw IPC errors.

- [ ] T031 Update the Electron smoke proof in `e2e/smoke.spec.ts`.
  - Dependencies: T025, T030.
  - Acceptance: smoke test still proves the window opens, title matches, console stays clean, and the app-version proof path succeeds.

## Phase 9 - Governance and verification pass

- [ ] T032 Verify lint coverage from `eslint.config.mjs`.
  - Dependencies: T003, T027, T029, T030.
  - Acceptance: `npm run lint` exits 0 and a positive check confirms `src/renderer/api/` is included in the renderer no-Electron/no-Node boundary.

- [ ] T033 Verify typecheck coverage from `tsconfig.node.json` and `tsconfig.renderer.json`.
  - Dependencies: T008, T010, T012, T014, T017, T019, T020, T022, T023, T024, T027, T029, T030.
  - Acceptance: `npm run typecheck` exits 0 and positive checks confirm `src/main/index.ts`, `src/preload/index.ts`, `src/renderer/index.tsx`, and `src/renderer/api/` are included in typecheck coverage.

- [ ] T034 Verify unit and factory coverage from `vitest.config.ts`.
  - Dependencies: T002, T007, T009, T011, T013, T016, T018, T021, T026, T028.
  - Acceptance: `npm run test:coverage` exits 0 with a test count greater than 0 and every Run 2 factory has the required co-located five-case spec coverage.

- [ ] T035 Verify Electron smoke coverage from `e2e/smoke.spec.ts`.
  - Dependencies: T031, T032, T033, T034.
  - Acceptance: `npm run e2e` exits 0 with the existing smoke guarantees plus the app-version proof path succeeding.

## Parallel opportunities

- T001, T002, T003, T004, and T015 can start independently.
- T007, T009, T011, T013, T016, and T021 can run in parallel after their listed setup dependencies.
- T012 and T014 can run in parallel after their respective specs exist.
- T022 through T024 can proceed while the renderer API specs T026 and T028 are being prepared, subject to their explicit dependencies.
- T032, T033, and T034 can run independently once their dependency sets are complete; T035 runs last.

## Implementation strategy

1. Complete setup and logging first so later tests share the same dependencies, spec discovery, and logger behavior.
2. Implement main-process primitives before boot wiring: safe writes, git readers, manifest validation, and manifest loading.
3. Add the proof IPC and preload bridge before renderer RTK Query code so renderer tests target the real bridge shape.
4. Finish with the app-version proof and verification tasks; do not add domain IPC, product Redux Provider mounting, HTTP, ACP, hooks, MCP, Jira, packaging, constitution, ADR, or layout-refactor work.
