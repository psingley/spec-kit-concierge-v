---
feature: Main Data Layer Foundation
branch: spec/0002-main-data-layer
created: 2026-05-27
source_plan: specs/0002-main-data-layer/plan.md
---

# Tasks: Run 2 Main Data Layer Foundation

**Input**: `specs/0002-main-data-layer/plan.md`, especially the implementation sequence in lines 148-198.

**Scope guard**: These tasks intentionally exclude the already-completed layout refactor from commit `dd7fd1b`. Constitution v1.0.4 and ADR-0003 are also already on disk from `/speckit.plan`; tasks T037 and T038 only VERIFY their presence/content, not author them.

**Repository support files**: Tasks reference root config (`package.json`, `vitest.config.ts`, `eslint.config.mjs`, `tsconfig.node.json`, `tsconfig.renderer.json`) and the `e2e/` directory. These are not under `src/` and not shown in the plan's source-tree, but they ARE in-scope for Run 2 implementation edits where called for explicitly (T001, T002, T003, T031).

**Task numbering note**: 40 task entries total — T001 through T039 plus T006a (logging spec, inserted before T006 implementation). T006a is intentionally non-sequential to preserve the existing dependency reference graph; downstream task processing should treat T006a as a peer of T001-T039 for counting purposes.

**Task format**: Each task names a concrete path, explicit dependencies, and the acceptance condition that must be true before the task is marked complete.

**Factory-spec floor (6 cases, applies to every `*.factory.spec.ts`):**
1. Happy path: valid input returns the typed output.
2. Empty object: `{}` returns a named error.
3. Null: `null` returns a named error.
4. Undefined: `undefined` returns a named error.
5. Factory-specific hostile input: malformed value, wrong field type, or equivalent malicious shape.
6. Partial input: structurally-plausible-but-incomplete shape (e.g., manifest entry missing `binary`, app-version payload missing `version` field) returns a named error.

Trust-boundary factories (manifest, IPC payload) MUST cover all six cases. Recovery-path parsers (`trailers.ts`) remain lenient and never throw; their specs cover the eight enumerated parser behaviors instead.

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

- [ ] T006a Add logging behavior specs in `src/main/logging.test.ts`.
  - Dependencies: T001, T002, T004.
  - Acceptance: specs assert that `createMainLogger()` writes ndjson to the daily file under a temp `userData` path, includes required base fields (`pid`, `hostname`, `app: 'concierge'`, package version), honors `CONCIERGE_DEBUG=1` for debug level, defaults to info level otherwise, and only adds the pino-pretty terminal stream when `NODE_ENV !== 'production'` (or the equivalent dev signal).

- [ ] T006 Implement date-rotated pino logging in `src/main/logging.ts`.
  - Dependencies: T006a.
  - Acceptance: `createMainLogger()` writes ndjson to `<userData>/logs/concierge-YYYY-MM-DD.log`, defaults to `info`, switches to `debug` only when `CONCIERGE_DEBUG=1`, includes `pid`, `hostname`, `app: 'concierge'`, package version, and `redact: []`, uses `pino-pretty` only for development terminal output, and passes `src/main/logging.test.ts`.

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
  - Acceptance: specs cover the eight lenient parser behaviors (trailer parser is exempt from the trust-boundary six-case floor): case-insensitive keys, exact values, normalized values, partial values, duplicate last-trailer-wins, warnings for superseded duplicates, silent no-trailer skip, and never-throw behavior.

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
  - Acceptance: specs cover the six-case factory floor (happy, `{}`, null, undefined, hostile, partial) and validate the seeded Copilot entry while asserting stable named errors for invalid manifest input. The partial case asserts a manifest entry missing `binary` (or equivalent required field) returns a named error.

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
  - Acceptance: specs cover the six-case factory floor (happy, `{}`, null, undefined, hostile, partial) including a hostile unexpected proof payload and a partial payload missing `version` field, and assert stable named errors for invalid input.

- [ ] T022 Implement app-version proof payload validation in `src/main/ipc/appVersion.factory.ts`.
  - Dependencies: T021.
  - Acceptance: factory accepts the valid app-version proof payload shape, rejects empty, null, undefined, and hostile inputs with stable named errors, and passes `appVersion.factory.spec.ts`.

- [ ] T023 Add only the app-version IPC handler in `src/main/ipc/appVersion.ts`.
  - Dependencies: T006, T022.
  - Acceptance: module registers only `app:getVersion`, returns the package version through the proof factory, emits a structured pino log line on every invocation (channel name, calling context, success/failure, latency in ms) per constitution structured-IPC-logging rule, and introduces no domain IPC channels.

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
  - Acceptance: `npm run lint` exits 0; positive confirmation via `npx eslint --print-config src/renderer/api/baseQuery.ts > /dev/null` exit 0 (renderer no-Electron/no-Node rule applies) and `npx eslint --print-config src/main/data-layer/fs/safeWrite.ts > /dev/null` exit 0 (main layer rule applies).

- [ ] T033 Verify typecheck coverage from `tsconfig.node.json` and `tsconfig.renderer.json`.
  - Dependencies: T008, T010, T012, T014, T017, T019, T020, T022, T023, T024, T027, T029, T030.
  - Acceptance: `npm run typecheck` exits 0; positive confirmation via `npx tsc --noEmit -p tsconfig.node.json --listFiles 2>&1 | grep -cE "src/main/(index|data-layer|ipc)" `>= 4 AND `npx tsc --noEmit -p tsconfig.renderer.json --listFiles 2>&1 | grep -cE "src/renderer/(index|api)" `>= 2.

- [ ] T034 Verify unit and factory coverage from `vitest.config.ts`.
  - Dependencies: T002, T006a, T007, T009, T011, T013, T016, T018, T021, T026, T028.
  - Acceptance: `npm run test:coverage` exits 0 with a test count greater than 0 and every Run 2 trust-boundary factory has the required co-located 6-case spec coverage per the floor in this document; SC-006/SC-007/SC-008 spec sets all execute as part of this run. Trailer parser is exempt and covers the 8 lenient-parser behaviors.

- [ ] T035 Verify Electron smoke coverage from `e2e/smoke.spec.ts`.
  - Dependencies: T031, T032, T033, T034.
  - Acceptance: `npm run e2e` exits 0 with the existing smoke guarantees plus the app-version proof path succeeding.

- [ ] T036 Verify `.github/copilot-instructions.md` Run 2 conventions block.
  - Dependencies: none (file already updated during /speckit.plan).
  - Acceptance: file contains the "Run 2 conventions" block with bullets covering data-layer paths, factory-spec floor reference, safe-write semantics, RTK Query tag taxonomy, and the post-refactor entry-point paths. Verify via `grep -c "Run 2 conventions" .github/copilot-instructions.md` >= 1 AND `grep -cE "Workspace.*StepState.*GitState" .github/copilot-instructions.md` >= 1 (covers FR-015).

- [ ] T037 Verify constitution v1.0.4 amendment.
  - Dependencies: none (constitution already amended during /speckit.plan).
  - Acceptance: `grep -c "1.0.4" .specify/memory/constitution.md` >= 2 (version header + amendment history entry); `grep -c "typed helpers that log the target path" .specify/memory/constitution.md` >= 1 (Principle I relaxation present); covers FR-013 and SC-009.

- [ ] T038 Verify ADR-0003 presence and content.
  - Dependencies: none (ADR-0003 already written during /speckit.plan).
  - Acceptance: file `docs/adr/0003-rtk-query-tagtypes-taxonomy.md` exists, status is `Accepted`, contains all 8 tag types verbatim (`Workspace`, `StepState`, `GitState`, `Agent`, `Session`, `Step`, `Transcript`, `Preferences`), references grill Q6 + spec FR-009 + constitution Principle VI. Verify via `grep -cE "Workspace|StepState|GitState|Agent|Session|Step|Transcript|Preferences" docs/adr/0003-rtk-query-tagtypes-taxonomy.md` >= 8 AND `grep -c "Accepted" docs/adr/0003-rtk-query-tagtypes-taxonomy.md` >= 1; covers FR-014 and SC-010.

- [ ] T039 Verify dev-mode pretty logging surfaces during `npm run dev`.
  - Dependencies: T031, T032, T033, T034, T035, T036, T037, T038.
  - Acceptance: launch `npm run dev`, observe terminal output contains pino-pretty-formatted log lines (colorized, single-line, ISO timestamp) for at least the "app ready" and "main window created" + manifest-loaded events; ndjson file at `<userData>/logs/concierge-YYYY-MM-DD.log` also receives the same events as raw JSON. Manual verification step — record outcome in the implement run's notes. Covers SC-005 dev-mode component. RUNS LAST.

## Parallel opportunities

- T001, T002, T003, T004, and T015 can start independently.
- T007, T009, T011, T013, T016, and T021 can run in parallel after their listed setup dependencies.
- T012 and T014 can run in parallel after their respective specs exist.
- T022 through T024 can proceed while the renderer API specs T026 and T028 are being prepared, subject to their explicit dependencies.
- T032, T033, and T034 can run independently once their dependency sets are complete; T035 runs after T032/T033/T034.
- T036, T037, T038 are read-only verification tasks and can run any time after their inputs exist (effectively any time during Phase 9).
- **T039 (dev-mode manual verification) runs LAST**, after T035 and all other Phase 9 verifications, because it requires the full Run 2 surface area to be functional and validates SC-005 dev experience.

## Implementation strategy

1. Complete setup and logging first so later tests share the same dependencies, spec discovery, and logger behavior.
2. Implement main-process primitives before boot wiring: safe writes, git readers, manifest validation, and manifest loading.
3. Add the proof IPC and preload bridge before renderer RTK Query code so renderer tests target the real bridge shape.
4. Finish with the app-version proof and verification tasks; do not add domain IPC, product Redux Provider mounting, HTTP, ACP, hooks, MCP, Jira, packaging, constitution, ADR, or layout-refactor work.
