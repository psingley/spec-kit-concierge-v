# Run 1 Implementation Plan — Foundation Shell & Boundaries

## Goal

Ship the empty Electron foundation for Concierge App: a blank window, strict type/lint boundaries, test harnesses, Windows packaging, and logging. No product UI or business logic yet.

## Locked inputs

- Scaffold from `electron-forge/vite-typescript`.
- Electron Forge + Vite renderer, with main / renderer / preload split.
- TypeScript `strict` + `noUncheckedIndexedAccess`.
- ESLint Pure/Effect boundary rules at `error`.
- Vitest + React Testing Library for unit/component tests.
- Playwright e2e smoke via Electron `_electron`.
- pino logging to Electron `userData`.
- Windows packaging via NSIS; auto-update stays deferred.
- GitHub Actions CI runs Windows-only.

## Build sequence

1. **Generate the shell scaffold**
   - Create the app from the Electron Forge Vite TypeScript template.
   - Keep the renderer intentionally blank.
   - Preserve the main / renderer / preload split from the start.

2. **Lock the TypeScript and lint baseline**
   - Enable `strict` and `noUncheckedIndexedAccess`.
   - Wire the Pure/Effect boundary rule set as a hard error.
   - Add the repo-wide script and config entry points the later runs will build on.

3. **Establish the npm script contract**
   - `dev` for local launch.
   - `lint` and `lint:fix`.
   - `typecheck`.
   - `test`, `test:coverage`, and `test:watch`.
   - `e2e`.
   - `package` and `make` for Forge output.

4. **Add the test harnesses**
   - Co-locate Vitest tests next to modules.
   - Make `test:coverage` succeed even when no tests exist.
   - Add one Playwright smoke spec that launches Electron, waits for the first window, checks the title, and fails on console errors.

5. **Add structured logging**
   - Introduce pino in the Electron main process.
   - Write logs under the app `userData` tree, with a `logs/` subdirectory.

6. **Configure packaging and release posture**
   - Add the Forge NSIS maker.
   - Keep the config Windows-only for v1.
   - Leave auto-update deferred.

7. **Wire CI**
   - Add a Windows-only GitHub Actions workflow.
   - Run lint, typecheck, coverage, e2e, and packaging checks there.

## Artifacts to create

- `package.json`
- `tsconfig.json` and related TS configs
- `eslint.config.*`
- `electron-forge.config.*`
- `vitest.config.*`
- `playwright.config.*`
- `e2e/` smoke spec
- main-process logger module
- `.github/workflows/` CI workflow
- `docs/adr/0001-nsis-installer.md`
- `docs/adr/0002-factory-pattern-no-runtime-schema.md`
- `.github/copilot-instructions.md`

## Non-goals for Run 1

- Factories themselves
- Runtime schema libraries
- Redux slices
- IPC handlers
- Business logic
- UI components
- HTTP API
- MCP detection
- ACP client behavior
- step lifecycle hooks

## Exit criteria

- `npm run dev` opens a blank Electron window.
- `npm run test:coverage` succeeds with zero tests.
- `npm run e2e` passes one smoke test.
- Windows packaging is configured with NSIS.
- Run 1 conventions are captured in `.github/copilot-instructions.md`.
