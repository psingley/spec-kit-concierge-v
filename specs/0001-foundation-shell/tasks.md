---
feature: Foundation Shell & Boundaries
branch: 0001-foundation-shell
created: 2026-05-26
---

# Tasks

## Phase 1 — Generate the shell scaffold
- [X] T001 Bootstrap the Electron Forge Vite TypeScript shell into `package.json`, `forge.config.ts`, `src/main.ts`, `src/preload.ts`, `src/renderer.tsx`, and `src/index.html`.
- [X] T002 [P] Strip the renderer to the intentionally blank launch surface in `src/renderer.tsx` and `src/index.html`.
- [X] T003 [P] Preserve the main / preload / renderer split in `src/main.ts` and `src/preload.ts` without adding UI, IPC handlers, or business logic.
- Acceptance: `npm run dev` opens a blank Electron window with the split scaffold intact.

## Phase 2 — Lock TypeScript and lint boundaries
- [X] T004 Enable `strict` and `noUncheckedIndexedAccess` in `tsconfig.json`, `tsconfig.node.json`, and `tsconfig.renderer.json`.
- [X] T005 [P] Enforce the Pure/Effect boundary rules at error level in `eslint.config.mjs`.
- [X] T006 [P] Capture the Run 1 non-goals and boundary contract in `.github/copilot-instructions.md` and `docs/adr/0002-factory-pattern-no-runtime-schema.md`.
- Acceptance: TypeScript and lint settings hard-stop boundary drift before product code exists.

## Phase 3 — Establish the npm script contract
- [X] T007 Define the repo script surface in `package.json` for `dev`, `lint`, `lint:fix`, `typecheck`, `test`, `test:coverage`, `test:watch`, `e2e`, `package`, and `make`.
- [X] T008 [P] Align the Forge and Vite entrypoints in `electron-forge.config.ts` and `vite.config.ts` with the new script contract.
- Acceptance: The command surface matches the Run 1 build sequence and launches the scaffold cleanly.

## Phase 4 — Add test harnesses
- [X] T009 Add the Vitest and React Testing Library harness in `vitest.config.ts`, `src/test/setup.ts`, and `src/test/utils.ts`.
- [X] T010 [P] Configure zero-test coverage success in `package.json` and `vitest.config.ts` so `npm run test:coverage` passes with no test files.
- [X] T011 [P] Create the Playwright Electron smoke path in `playwright.config.ts` and `e2e/smoke.spec.ts` using `_electron.launch()`, `firstWindow()`, title checks, and console-error capture.
- Acceptance: `npm run test:coverage` and `npm run e2e` validate the empty shell without requiring product tests.

## Phase 5 — Add structured logging
- [X] T012 [P] Add a pino logger module in `src/main/logging.ts` that writes to `app.getPath('userData')/logs`.
- [X] T013 Wire early logger initialization into `src/main.ts` so launch events are recorded without introducing business logic.
- Acceptance: Launch-time logs are written beneath the Electron `userData` tree.

## Phase 6 — Configure packaging and release posture
- [X] T014 Add the NSIS maker to `electron-forge.config.ts` with a minimal `makers` entry and Windows-only scope.
- [X] T015 [P] Document the NSIS installer decision and deferred auto-update posture in `docs/adr/0001-nsis-installer.md`.
- [X] T016 Keep release wiring limited to packaging by leaving updater behavior out of `electron-forge.config.ts` and related `package.json` metadata.
- Acceptance: Windows packaging is configured with NSIS and auto-update remains deferred.

## Phase 7 — Wire Windows-only CI
- [X] T017 Create the Windows-only GitHub Actions workflow in `.github/workflows/run1.yml` to run `lint`, `typecheck`, `test:coverage`, `e2e`, and `package`.
- [X] T018 Add cache, Node setup, and artifact upload steps in `.github/workflows/run1.yml` for the shell and NSIS outputs.
- Acceptance: CI verifies the Run 1 shell on Windows only.

## Parallel opportunities
- T002 and T003 can run in parallel after the scaffold exists.
- T005 and T006 can run alongside T004.
- T010 and T011 can run in parallel once the shared test harness exists.
- T012 can run independently of T013.
- T015 can run in parallel with T014 and T016.
- T018 can run alongside T017 after the workflow skeleton is in place.

## Implementation strategy
- Start with the shell scaffold, then lock compiler and lint boundaries before adding scripts.
- Add test harnesses next so zero-test coverage and e2e smoke checks are available early.
- Finish with logging, packaging, and Windows-only CI.
- Keep the renderer intentionally blank throughout Run 1.

## Verification summary
- `npm run dev` opens a blank Electron window.
- `npm run test:coverage` succeeds with zero tests.
- `npm run e2e` passes one Electron smoke test.
- `npm run package` / `npm run make` produce Windows NSIS output.
- CI runs only on Windows and exercises the same shell contract.
