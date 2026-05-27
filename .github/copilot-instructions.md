<!-- SPECKIT START -->
Plan: `specs/0003-acp-adapter/plan.md`

Run 1 plan: `specs/0001-foundation-shell/plan.md`
Run 2 plan: `specs/0002-main-data-layer/plan.md`

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

Run 3 conventions:
- ACP-only bound CLI modules live under `src/main/data-layer/acp/`; no code outside this directory may spawn or speak to a coding-agent binary.
- Run 3 adds only `@agentclientprotocol/sdk@0.22.1`; use `ClientSideConnection`/`ndJsonStream` for framing and do not hand-roll JSON-RPC correlation.
- IPC registration remains under `src/main/ipc/`; Run 3 adds only `acp:probeBoundCLI`.
- Renderer ACP access remains under `src/renderer/api/`, uses the preload bridge, and must not import Electron APIs or Node built-ins.
- ACP transcript fixtures live at `tests/fixtures/acp-transcripts/<scenario>.jsonl` as sanitized annotated JSONL: one ACP message per line with `direction` set to `client->agent` or `agent->client`; strip `direction` before wire/schema validation.
- `src/main/data-layer/acp/capabilities.ts` is the only Run 3 trust-boundary factory with the six-case floor. Trailer-style lenient parsers do not apply here, and transcript replay helpers do not get a factory-floor requirement.
- The ACP SDK is an internal collaborator; do not mock it. Mock only system boundaries such as `child_process`, filesystem writes, time, and Electron IPC.
- Session modes use full ACP URIs. Agent mode is default; Plan and Autopilot are supported; Autopilot is opt-in only and requires recording the user's `allow` decision.
- Copilot model selection uses standard `configOptions[id=model]` via `setSessionConfigOption`; `unstable_setSessionModel` is not the Copilot 1.0.54 source of truth.
<!-- SPECKIT END -->
