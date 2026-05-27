# Run 1 -> SKC Submission Dry-Run

Generated: 2026-05-26
Source: spec/0001-foundation-shell HEAD 10ea94c
Target: SKC at collette.atlassian.net

## Summary
- Epic: 1
- Stories: 7
- Subtasks: 18
- Total: 26

## Issues

### Epic: Foundation Shell & Boundaries
**Type:** Epic
**Summary:** Foundation Shell & Boundaries
**Labels:** spec-kit, concierge, run-1
**Description:**
```md
Run 1 establishes the Concierge App foundation: a blank Electron shell, strict TypeScript and ESLint boundaries, a minimal test harness, structured logging, Windows packaging, and Windows-only CI.

Key outcomes:
- Electron Forge + Vite renderer scaffold with main / renderer / preload split
- Blank launch surface from `npm run dev`
- `strict` + `noUncheckedIndexedAccess`
- Pure/Effect boundary rules enforced at error level
- Vitest + React Testing Library and a single Playwright Electron smoke path
- pino logging under `app.getPath('userData')/logs/`
- NSIS packaging with deferred auto-update
- Windows-only GitHub Actions CI

Scope constraints:
- No product UI
- No business logic
- No IPC handlers
- No factories
- No runtime schema libraries
- No Redux slices
- No HTTP API
- No MCP detection
- No ACP client behavior
- No spec-kit hook implementations

Acceptance highlights:
- `npm run dev` opens a blank Electron window
- `npm run test:coverage` succeeds with zero tests
- `npm run e2e` succeeds with one smoke test
- Windows packaging is configured with NSIS
- CI runs on Windows only
```

### Story 1: Generate the shell scaffold
**Type:** Story
**Parent:** Epic (above)
**Summary:** Generate the shell scaffold
**Labels:** spec-kit, concierge
**Description:**
```md
As a maintainer, I can start the app and see a blank Electron window, confirming the foundation boots before any product UI exists.

## Acceptance Criteria
- Given a clean checkout, when `npm run dev` starts, then a blank Electron window opens.
- Given the scaffold exists, when the app launches, then the main / renderer / preload split is intact.
- Given Run 1 scope, when the renderer loads, then no product UI is present.
```

### Story 2: Lock TypeScript and lint boundaries
**Type:** Story
**Parent:** Epic (above)
**Summary:** Lock TypeScript and lint boundaries
**Labels:** spec-kit, concierge
**Description:**
```md
As a maintainer, I can rely on strict compiler and lint boundaries from day one, so foundation drift is blocked before product code exists.

## Acceptance Criteria
- Given the repository config, when TypeScript runs, then `strict` and `noUncheckedIndexedAccess` are enabled.
- Given the repository config, when ESLint runs, then Pure/Effect boundary violations fail at error level.
- Given Run 1 documentation, when engineers inspect the repo, then the boundary contract and non-goals are recorded.
```

### Story 3: Establish the npm script contract
**Type:** Story
**Parent:** Epic (above)
**Summary:** Establish the npm script contract
**Labels:** spec-kit, concierge
**Description:**
```md
As a maintainer, I can use a stable script surface for development, validation, packaging, and release prep, so the Run 1 foundation is operable from the command line.

## Acceptance Criteria
- Given `package.json`, when scripts are listed, then `dev`, `lint`, `lint:fix`, `typecheck`, `test`, `test:coverage`, `test:watch`, `e2e`, `package`, and `make` exist.
- Given the build entrypoints, when the scripts run, then they align with the Electron Forge + Vite scaffold.
- Given the blank shell, when `npm run dev` starts, then it launches cleanly.
```

### Story 4: Add test harnesses
**Type:** Story
**Parent:** Epic (above)
**Summary:** Add test harnesses
**Labels:** spec-kit, concierge
**Description:**
```md
As a maintainer, I can run unit, component, coverage, and smoke verification from the first run, so the empty foundation stays verifiable before any product features exist.

## Acceptance Criteria
- Given the Vitest setup, when co-located tests are added later, then unit and component tests are supported.
- Given zero test files, when `npm run test:coverage` runs, then the command succeeds.
- Given the Electron smoke path, when `npm run e2e` runs, then one smoke test checks window-open, title-match, and zero-console-error behavior.
```

### Story 5: Add structured logging
**Type:** Story
**Parent:** Epic (above)
**Summary:** Add structured logging
**Labels:** spec-kit, concierge
**Description:**
```md
As a maintainer, I can inspect launch-time logs in the Electron user-data tree, so startup behavior is observable without adding product logic.

## Acceptance Criteria
- Given the main process starts, when logging initializes, then pino writes under `app.getPath('userData')/logs/`.
- Given app launch events, when the shell boots, then early startup events are recorded.
- Given Run 1 scope, when logging is added, then no business logic or UI behavior is introduced.
```

### Story 6: Configure packaging and release posture
**Type:** Story
**Parent:** Epic (above)
**Summary:** Configure packaging and release posture
**Labels:** spec-kit, concierge
**Description:**
```md
As a maintainer, I can package the shell for Windows with a clear installer posture, so release readiness is established without turning on auto-update yet.

## Acceptance Criteria
- Given Forge packaging, when the config is built, then an NSIS maker is present.
- Given the release posture, when packaging is configured, then auto-update remains deferred.
- Given Run 1 constraints, when release wiring is added, then it stays limited to packaging.
```

### Story 7: Wire Windows-only CI
**Type:** Story
**Parent:** Epic (above)
**Summary:** Wire Windows-only CI
**Labels:** spec-kit, concierge
**Description:**
```md
As a maintainer, I can run CI on the ship target only, so the Run 1 foundation is validated in the same environment it is meant to ship from.

## Acceptance Criteria
- Given GitHub Actions, when the workflow runs, then it uses a Windows-only matrix.
- Given the workflow steps, when CI executes, then lint, typecheck, coverage, e2e, and packaging checks run.
- Given the workflow artifacts, when packaging completes, then shell and NSIS outputs are uploaded.
```

### T001
**Type:** Subtask
**Parent:** Story 1
**Summary:** Bootstrap the Electron Forge Vite TypeScript shell
**Description:**
```md
## Contributes to
Story 1 — Generate the shell scaffold

## Work
- Bootstrap the Electron Forge Vite TypeScript shell into `package.json`, `forge.config.ts`, `src/main.ts`, `src/preload.ts`, `src/renderer.tsx`, and `src/index.html`.

## Done when
- The scaffold exists and preserves the main / renderer / preload split.
- The app can launch from the Run 1 shell entrypoints.
```

### T002
**Type:** Subtask
**Parent:** Story 1
**Summary:** Strip the renderer to the blank launch surface
**Description:**
```md
## Contributes to
Story 1 — Generate the shell scaffold

## Work
- Strip the renderer to the intentionally blank launch surface in `src/renderer.tsx` and `src/index.html`.

## Done when
- The renderer loads with no product UI.
- The blank window is clearly intentional, not a missing implementation.
```

### T003
**Type:** Subtask
**Parent:** Story 1
**Summary:** Preserve the main / preload / renderer split
**Description:**
```md
## Contributes to
Story 1 — Generate the shell scaffold

## Work
- Preserve the main / preload / renderer split in `src/main.ts` and `src/preload.ts` without adding UI, IPC handlers, or business logic.

## Done when
- The split remains intact.
- No product behavior leaks into the foundation shell.
```

### T004
**Type:** Subtask
**Parent:** Story 2
**Summary:** Enable strict TypeScript compiler flags
**Description:**
```md
## Contributes to
Story 2 — Lock TypeScript and lint boundaries

## Work
- Enable `strict` and `noUncheckedIndexedAccess` in `tsconfig.json`, `tsconfig.node.json`, and `tsconfig.renderer.json`.

## Done when
- The TypeScript baseline is strict.
- Indexed access is treated as possibly undefined.
```

### T005
**Type:** Subtask
**Parent:** Story 2
**Summary:** Enforce Pure/Effect boundary rules
**Description:**
```md
## Contributes to
Story 2 — Lock TypeScript and lint boundaries

## Work
- Enforce the Pure/Effect boundary rules at error level in `eslint.config.mjs`.

## Done when
- Boundary violations fail linting immediately.
- The rule posture matches Run 1 hard-stop expectations.
```

### T006
**Type:** Subtask
**Parent:** Story 2
**Summary:** Capture Run 1 boundary doctrine
**Description:**
```md
## Contributes to
Story 2 — Lock TypeScript and lint boundaries

## Work
- Capture the Run 1 non-goals and boundary contract in `.github/copilot-instructions.md` and `docs/adr/0002-factory-pattern-no-runtime-schema.md`.

## Done when
- The repo documents the locked Run 1 scope.
- The boundary contract is recorded for future runs.
```

### T007
**Type:** Subtask
**Parent:** Story 3
**Summary:** Define the repo script surface
**Description:**
```md
## Contributes to
Story 3 — Establish the npm script contract

## Work
- Define the repo script surface in `package.json` for `dev`, `lint`, `lint:fix`, `typecheck`, `test`, `test:coverage`, `test:watch`, `e2e`, `package`, and `make`.

## Done when
- Every Run 1 command is exposed through npm scripts.
- The script surface matches the plan.
```

### T008
**Type:** Subtask
**Parent:** Story 3
**Summary:** Align Forge and Vite entrypoints
**Description:**
```md
## Contributes to
Story 3 — Establish the npm script contract

## Work
- Align the Forge and Vite entrypoints in `electron-forge.config.ts` and `vite.config.ts` with the new script contract.

## Done when
- The build entrypoints work with the new scripts.
- Dev and packaging flows point at the same scaffold.
```

### T009
**Type:** Subtask
**Parent:** Story 4
**Summary:** Add the Vitest and RTL harness
**Description:**
```md
## Contributes to
Story 4 — Add test harnesses

## Work
- Add the Vitest and React Testing Library harness in `vitest.config.ts`, `src/test/setup.ts`, and `src/test/utils.ts`.

## Done when
- Unit and component testing support is present.
- Shared test setup files exist for later co-located tests.
```

### T010
**Type:** Subtask
**Parent:** Story 4
**Summary:** Configure zero-test coverage success
**Description:**
```md
## Contributes to
Story 4 — Add test harnesses

## Work
- Configure zero-test coverage success in `package.json` and `vitest.config.ts` so `npm run test:coverage` passes with no test files.

## Done when
- Coverage succeeds with zero tests.
- The empty repository remains verifiable.
```

### T011
**Type:** Subtask
**Parent:** Story 4
**Summary:** Create the Playwright Electron smoke path
**Description:**
```md
## Contributes to
Story 4 — Add test harnesses

## Work
- Create the Playwright Electron smoke path in `playwright.config.ts` and `e2e/smoke.spec.ts` using `_electron.launch()`, `firstWindow()`, title checks, and console-error capture.

## Done when
- One smoke test covers window-open, title-match, and zero-console-error launch behavior.
- The smoke path runs through Electron's `_electron` API.
```

### T012
**Type:** Subtask
**Parent:** Story 5
**Summary:** Add the pino logger module
**Description:**
```md
## Contributes to
Story 5 — Add structured logging

## Work
- Add a pino logger module in `src/main/logging.ts` that writes to `app.getPath('userData')/logs`.

## Done when
- Log output is written beneath the Electron user-data tree.
- The logger module is available to the main process.
```

### T013
**Type:** Subtask
**Parent:** Story 5
**Summary:** Wire early logger initialization
**Description:**
```md
## Contributes to
Story 5 — Add structured logging

## Work
- Wire early logger initialization into `src/main.ts` so launch events are recorded without introducing business logic.

## Done when
- Startup events are logged during launch.
- Logging happens early enough to capture boot behavior.
```

### T014
**Type:** Subtask
**Parent:** Story 6
**Summary:** Add the NSIS maker
**Description:**
```md
## Contributes to
Story 6 — Configure packaging and release posture

## Work
- Add the NSIS maker to `electron-forge.config.ts` with a minimal `makers` entry and Windows-only scope.

## Done when
- Forge packaging includes a Windows NSIS installer path.
- The config stays minimal and on-scope for Run 1.
```

### T015
**Type:** Subtask
**Parent:** Story 6
**Summary:** Document the NSIS installer decision
**Description:**
```md
## Contributes to
Story 6 — Configure packaging and release posture

## Work
- Document the NSIS installer decision and deferred auto-update posture in `docs/adr/0001-nsis-installer.md`.

## Done when
- The installer choice is recorded as an ADR.
- The deferred updater stance is explicit.
```

### T016
**Type:** Subtask
**Parent:** Story 6
**Summary:** Keep release wiring limited to packaging
**Description:**
```md
## Contributes to
Story 6 — Configure packaging and release posture

## Work
- Keep release wiring limited to packaging by leaving updater behavior out of `electron-forge.config.ts` and related `package.json` metadata.

## Done when
- Auto-update remains deferred.
- No updater runtime behavior is introduced in Run 1.
```

### T017
**Type:** Subtask
**Parent:** Story 7
**Summary:** Create the Windows-only GitHub Actions workflow
**Description:**
```md
## Contributes to
Story 7 — Wire Windows-only CI

## Work
- Create the Windows-only GitHub Actions workflow in `.github/workflows/run1.yml` to run `lint`, `typecheck`, `test:coverage`, `e2e`, and `package`.

## Done when
- CI runs on Windows only.
- The workflow exercises the Run 1 shell contract.
```

### T018
**Type:** Subtask
**Parent:** Story 7
**Summary:** Add cache, Node setup, and artifact upload steps
**Description:**
```md
## Contributes to
Story 7 — Wire Windows-only CI

## Work
- Add cache, Node setup, and artifact upload steps in `.github/workflows/run1.yml` for the shell and NSIS outputs.

## Done when
- Node is installed in the workflow.
- Cache steps are present.
- Build artifacts are uploaded from CI.
```

DRY-RUN COMPLETE. Awaiting explicit approval before any Jira writes.
