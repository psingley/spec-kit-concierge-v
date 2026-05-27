<!-- SPECKIT START -->
Plan: `specs/0002-main-data-layer/plan.md`

Run 1 plan: `specs/0001-foundation-shell/plan.md`

Run 1 conventions:
- TypeScript: `strict` + `noUncheckedIndexedAccess`.
- ESLint: Pure/Effect layer-boundary rules at `error`.
- Scripts: `dev`, `lint`, `lint:fix`, `typecheck`, `test`, `test:coverage`, `test:watch`, `e2e`, `package`, `make`.
- Logging: pino writes under `app.getPath('userData')/logs/`.
- Packaging: Forge NSIS maker lives in `electron-forge.config.*`.
- CI: GitHub Actions runs Windows-only on `push` and `pull_request`.

Run 2 conventions:
- Current entry points are `src/main/index.ts`, `src/preload/index.ts`, and `src/renderer/index.tsx`; do not plan or redo the already-completed layout refactor.
- Main-process data-layer modules live under `src/main/data-layer/`: filesystem helpers in `fs/`, git readers in `git/`, and agent manifest loading in `agents/`.
- IPC registration lives under `src/main/ipc/`; Run 2 adds only the `app:getVersion` proof channel.
- Renderer data access lives under `src/renderer/api/`; modules there must use the preload bridge and must not import Electron APIs or Node built-ins.
- Every Run 2 factory has a co-located `*.factory.spec.ts` with at least: happy path, empty object named error, null named error, undefined named error, and one factory-specific hostile case.
- Safe writes use direct overwrite plus fsync, log target path and calling Step context, and do not reject paths outside an active Workspace.
- RTK Query tag taxonomy is fixed upfront: `Workspace`, `StepState`, `GitState`, `Agent`, `Session`, `Step`, `Transcript`, `Preferences`.
<!-- SPECKIT END -->
