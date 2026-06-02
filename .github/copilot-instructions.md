<!-- SPECKIT START -->
Plan: `specs/001-remove-fake-traffic-lights/plan.md`

Run 1 plan: `specs/0001-foundation-shell/plan.md`
Run 2 plan: `specs/0002-main-data-layer/plan.md`
Run 3 plan: `specs/0003-acp-adapter/plan.md`
Run 4 plan: `specs/0004-ipc-bridge-redux-skeleton/plan.md`
Run 5 plan: `specs/0005-step-lifecycle-hooks/plan.md`

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

Run 4 conventions:
- Store assembly lives at `src/renderer/store.ts`; the first implementation test must be the product store assembly test asserting canonical initial state across all 8 slices.
- Slice catalog is fixed by `specs/0004-ipc-bridge-redux-skeleton/plan.md`: `ui`, `preferences`, `auth`, `workspace`, `steps`, `session`, `activity`, `copilot`; Run 4 slice reducers and extra reducers stay empty.
- Listener catalog is fixed by `docs/adr/0007-listener-middleware-catalog.md`: `acpStreamSubscription`, `preferencesPersistence`, `sessionLifecycle`, `stepLifecycle`, `transcriptCapture`, `workspaceChange`; initialize listener setup functions alphabetically by filename, and keep ACP stream subscription ownership single.
- Per-slice selectors live at `src/renderer/slices/<slice>.selectors.ts` and use `select<Slice><Field>` names; selectors returning fresh objects, arrays, or derived multi-field values must be memoized.
- Typed store hooks live only at `src/renderer/hooks/store.ts` as `useAppDispatch`, `useAppSelector`, and `useAppStore`.
- Run 4 IPC adds `workspace:read`, `git:read`, `steps:read`, `preferences:read`, `preferences:write`, `auth:status`, `session:listAcp`, `session:createAcp`, and `activity:read`; `preferences:write` is the only Run 4 write handler.
- Trust-boundary factories are required at both main-side IPC entry and renderer-side preload-bridge exit; renderer endpoint tests use the real preload bridge mock and do not mock internal supervisors or slice reducers.
- Run 4 introduces no runtime dependencies and does not redo Runs 2-3.

Run 5 conventions:
- Hook executor layout is fixed by `specs/0005-step-lifecycle-hooks/grill.md`: `src/main/hooks/dispatcher.ts`, `src/main/hooks/manifest.ts`, `src/main/hooks/driftVerifier.ts`, and exactly twelve named hook files: `beforeSpecify.hook.ts`, `afterSpecify.hook.ts`, `beforeClarify.hook.ts`, `afterClarify.hook.ts`, `beforePlan.hook.ts`, `afterPlan.hook.ts`, `beforeTasks.hook.ts`, `afterTasks.hook.ts`, `beforeAnalyze.hook.ts`, `afterAnalyze.hook.ts`, `beforeReview.hook.ts`, and `afterReview.hook.ts`.
- Step Contract disk-entry factories live under `src/main/domain/factories/` as one file per step (`specify`, `clarify`, `plan`, `tasks`, `analyze`, `review`) plus shared `types.ts`; IPC-entry and renderer-entry factories keep the existing Run 4 paths under `src/main/ipc/` and `src/renderer/api/` when Run 5 data crosses those boundaries.
- Disk-entry factories use the seven-case floor: the six standard factory cases plus extra-key rejection for malicious JSON/frontmatter payloads. Write each floor case as a sequential RED -> GREEN sub-tracer bullet, not a horizontal batch.
- Step state vocabulary is exactly `not_available | pending | complete`. Ordinary progression is `not_available -> pending -> complete`; Step Escape Hatch resets to `not_available`. Trailer restoration maps `pass -> complete`, `pending -> pending`, and `fail | skipped -> not_available` per `docs/adr/0008-step-state-machine.md`.
- `.specify/extensions.yml` Run 5 lifecycle entries register all twelve `before_<step>` and `after_<step>` hooks for specify, clarify, plan, tasks, analyze, and review. Each Concierge lifecycle entry points to the single dispatcher command and preserves existing extension entries.
- In-flight markers live at `userData/in-flight/${sessionId}/${step}.marker` and contain JSON with step, start time, session id, and expected artifacts. Markers are written by before-hook success and removed only after Step Commit success.
- Step Commits use real `git` shell-outs through the Run 2 `gitCommand.ts` path, append exactly one `Concierge-Step: <step>:pass` trailer with `git interpret-trailers`, honor pre-commit hooks, and never use `--no-verify`, simple-git, or nodegit. Analyze is the only step that may use `--allow-empty`.
- Run 5 fills only `stepLifecycle.listener.ts` and `transcriptCapture.listener.ts`; the other four Run 4 listener bodies stay empty. Clarify re-ask lives in `stepLifecycle.listener.ts`, is bounded to three attempts per malformed question, and exhausts with Step Escape Hatch reason `clarify-rigor-exhausted` per `docs/adr/0009-clarify-reask-listener.md`.
- Hang detection is based only on ACP stream silence: check every 30 seconds, emit `hang-suspected` at exactly 20 minutes or later, and never auto-fail, auto-cancel, or auto-retry a step.
- Step lifecycle structured log event names are fixed: `step-before-hook-start`, `step-before-hook-end`, `step-pending`, `step-prompt-issued`, `step-prompt-complete`, `step-after-hook-start`, `step-after-hook-end`, `step-commit-written`, `step-complete`, `step-escape-hatch-triggered`, `workspace-dirty-resume`, `agent-manifest-drift`, and `hang-suspected`. Fields include `event`, `step`, `sessionId`, optional `latencyMs`, optional `reason`, and optional `trailer`. Handler/hook logging tests mock `createMainLogger`, not duck-typed logger shapes.
- Run 5 introduces no runtime dependencies and does not redo Runs 2-4.

Run 6 conventions:
- Run 6 plan is `specs/0006-specify-vertical/plan.md`; renderer shape is canonical from `design/v3-fetch/project/`, with locked overrides from `grill.md` and `clarifications.md`.
- Component file naming convention / component naming uses PascalCase TSX under `src/renderer/components/`: `AppShell.tsx`, `SignInScreen.tsx`, `RepoBrowseScreen.tsx`, `Titlebar.tsx`, `Stepper.tsx`, `SpecifyStep.tsx`, `Activity.tsx`, `ActivityPill.tsx`, `PixelCSpinner.tsx`, `CustomizeModal.tsx`, `AboutModal.tsx`, `RequestModal.tsx`, `Icons.tsx`, and `Markdown.tsx`; smart containers use `*Container.tsx`.
- Smart containers are the only renderer components that use `useAppSelector`, `useAppDispatch`, or RTK Query hooks. props-only components stay dumb and receive all data/callbacks via props.
- Port design CSS to one single stylesheet at `src/renderer/styles/index.css`, imported once from `src/renderer/index.tsx`; drop the orphan declarations after the first `:root` block in `design/v3-fetch/project/styles.css` lines ~29-40 unless a later design artifact proves they are intentional.
- Run 6 adds only `@fontsource/geist-sans` and `@fontsource/geist-mono`; no markdown, icon, UI, or animation runtime dependency is added.
- `PixelCSpinner` remains a canvas + `requestAnimationFrame` component. Use it in `ActivityPill` as the always-visible busy/progress affordance; mock canvas/RAF at browser boundaries in tests.
- Step order stays spec-kit canonical: `specify -> clarify -> plan -> tasks -> analyze -> review`. The design's `final` label maps to `review`; the design's `plan -> analyze -> tasks` order is not used.
- Atlassian is a visible Run 6 auth row/titlebar status and visual stub only. GitHub + Copilot gate repository/workspace entry; Atlassian does not block Specify.
- `tweaks-panel.jsx` is not ported. Gear menu opens `CustomizeModal`, which edits accent, density, activity side, and require-scroll preferences.
- Activity history cap remains 256. Do not adopt the design's larger implied log cap.
- Run 6 new IPC capabilities are exactly `copilot:specify`, `auth:gh:login`, `auth:copilot:login`, `auth:atlassian:login`, `repos:list`, `branches:sessions`, `git:checkout`, `git:createDraft`, and `artifacts:read`.
- Step pipeline streaming channel / IPC naming uses `copilot:<step>` capability names and derived transport event names `<capability>:event`; Run 6 implements `copilot:specify`, transports events on `copilot:specify:event`, and emits the ADR-0010 `StepStreamEvent` shape with progress events plus exactly one terminal `done`.
- RTK Query streaming mutations use `onCacheEntryAdded` to subscribe through preload, dispatch public slice actions, and unsubscribe on `cacheEntryRemoved`.
- Preferences persistence listener reuses the existing Run 4 `preferences:write` channel; do not add a new persistence channel.
- Trust-boundary factories for Run 6 use the seven-case floor: the six standard cases plus extra-key rejection. Handler logging tests must mock `createMainLogger`.
- Run 6 first implementation test is `e2e/specify-vertical.spec.ts`; continue vertical tracer bullets one RED test then one minimal GREEN implementation.
Run 9 plan: `specs/0009-review-evidence/plan.md`
Run 13 plan: `specs/0013-hybrid-manifest-architecture/plan.md`
Run 13 conventions:
- Run 13 uses a constitution-approved exception to replace ACP step-agent execution with the typed Copilot print-mode adapter: `copilot -p --agent speckit.<step> --output-format json --session-id <uuid> --log-dir <dir>`.
- This exception is scoped to step execution only. Bound CLI integrations remain ACP by default, and deterministic app code remains the only writer of manifest state, completion trailers, failed markers, guarded mutations, and completion status.
- This dogfood lane may remain on `build/manifest-architecture-dogfood` while `.specify/feature.json` points at `specs/0013-hybrid-manifest-architecture`; do not switch branches during implementation.
- Manifest is the durable attempt-state ledger. Step completion is displayed only after reconciliation agrees across manifest attempt state, branch trailer evidence, and step-owned artifacts.
- The print-mode child-process adapter lives in a main data-layer module under `src/main/data-layer/agents/`; IPC handlers validate and orchestrate but do not spawn coding-agent binaries directly.
- Manifest read, reconcile, audit trail, doctor status, and nudge must be available through both renderer bridge and localhost HTTP API, sharing the same data-layer path and factories.
- Deterministic guarded recovery runs before doctor escalation under the Run 13 constitution exception and covers the safe recovery catalog: relocate step-owned artifact, adopt valid completion, refresh failed marker, revert proven unrelated file, cancel observed active step, and pinned-context restart only after explicit user confirmation or an approved guarded doctor request. It must audit, return to reconciliation, and never silently re-run a step, mark completion directly, or write completion trailers outside hook ownership.
- The doctor is a bounded anomaly intermediary with exactly six read-only tools and six guarded mutating tools. Every mutating tool re-reads disk truth, validates preconditions, appends audit records, and returns to reconciliation.
- Renderer session and step state are projections of reconciliation and audit responses. Renderer state never marks completion directly.
- Nudge appears only for `needs-attention` sessions after deterministic recovery and doctor paths fail or are unavailable; failed-vs-terminal-stuck ambiguity is not guessed and remains a human/doctor escalation state.
- Failed, remediated, and nudged sessions must expose bounded audit inspection without raw transcripts, secrets, or unrelated file contents.
- Run 13 verification includes visible RED output before each paired GREEN task, `npm run test:coverage`, and the existing typecheck, lint, unit, and E2E gates.
- Workflow validation keeps the Run 13 exception narrow: `.specify/scripts/bash/check-prerequisites.sh` may accept `build/manifest-architecture-dogfood` only when `.specify/feature.json` resolves to `specs/0013-hybrid-manifest-architecture`; all other branches keep the normal numbered feature-branch rule.
- ACP is retired only for Run 13 step-agent execution. Bound CLI integrations remain ACP by default; step completion still requires deterministic reconciliation and hook-owned trailers.
<!-- SPECKIT END -->
