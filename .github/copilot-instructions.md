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
- Every Run 2 trust-boundary factory has a co-located `*.factory.spec.ts` with the six-case floor: happy path, empty object named error, null named error, undefined named error, one factory-specific hostile case, and one partial structurally-plausible input case (per constitution v1.0.4). Recovery-path parsers (`trailers.ts`) are exempt and cover the eight lenient-parser behaviors instead.
- Safe writes use direct overwrite plus fsync, log target path and calling Step context, and do not reject paths outside an active Workspace.
- RTK Query tag taxonomy is fixed upfront: `Workspace`, `StepState`, `GitState`, `Agent`, `Session`, `Step`, `Transcript`, `Preferences`.

TDD discipline (Run 3 onward):
- Read `.agents/skills/tdd/SKILL.md` before any spec-kit task that writes code (especially `/speckit.implement`).
- Vertical tracer-bullet workflow: ONE test (RED) → ONE minimal implementation (GREEN) → repeat. Do NOT write all tests first then all code (horizontal slicing).
- Test through public interfaces, not implementation details. Mock at system boundaries only (external APIs, DBs, time) — never internal collaborators.
- See `.agents/skills/tdd/tests.md` for good-vs-bad test examples, `mocking.md` for boundary rules, `interface-design.md` for testability patterns, `deep-modules.md` for Ousterhout's deep-module heuristic.
- Run 2 factory specs were horizontal-sliced for delivery speed; Run 3+ uses vertical tracer bullets.
<!-- SPECKIT END -->
