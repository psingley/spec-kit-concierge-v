---
feature: Specify Vertical
branch: spec/0006-specify-vertical
created: 2026-05-27
source_plan: specs/0006-specify-vertical/plan.md
---

# Tasks: Run 6 Specify Vertical

**Input**: `specs/0006-specify-vertical/plan.md`, `specs/0006-specify-vertical/spec.md`, `specs/0006-specify-vertical/grill.md`, `specs/0006-specify-vertical/clarifications.md`, `specs/0006-specify-vertical/research.md`, `design/v3-fetch/project/`, and `.agents/skills/tdd/SKILL.md`.

**TDD discipline**: Run 6 proceeds vertically: one RED behavior test, one minimal GREEN implementation, then repeat. Do not batch all component tests, IPC tests, preload tests, endpoint tests, or factory-floor cases before implementation. Tests must exercise public interfaces and may mock only system boundaries: shell-outs, Electron IPC, filesystem, time, ACP child process/transcript boundaries, and browser APIs such as canvas/requestAnimationFrame. Do not mock internal reducers, listener middleware collaborators, Run 3 ACP supervisor/session types, or the ACP SDK.

**Scope guard**: These tasks intentionally exclude ADR-0010, `.github/copilot-instructions.md` Run 6 conventions, constitution v1.0.4, ADRs 0002-0009, all Runs 2-5 infrastructure, RTK Query base API/tag taxonomy, Provider mounting from Run 4 except the Run 6 root migration, Run 5 step lifecycle/transcript capture behavior, and pre-populated spec-validate state. Run 6 implements only the Specify vertical and does not add real Atlassian OAuth/MCP, JIRA sync UI, ArtifactViewer, TaskViewer, later-step bodies, HTTP server, packaging changes, markdown/UI/icon runtime dependencies, or a ninth Redux slice.

**Pino discipline**: Handler logging tests MUST mock `createMainLogger` from `src/main/logging.ts` and assert `logger.info`/`logger.warn`/`logger.error` calls with expected structured fields. Generic logger-shaped mocks, `console` mocks, or field-shape assertions alone are not acceptable. This rider is contractual for every main IPC handler/logging task.

**Factory-floor discipline**: Every Run 6 main-side IPC factory and renderer/preload-entry factory uses the seven-case floor. The six standard floor cases MUST be implemented as SIX sequential sub-tracer-bullets inside each RED factory task: happy path, empty object named error, `null` named error, `undefined` named error, factory-specific hostile input, and partial structurally-plausible input. The seventh extra-key rejection case follows those six as its own RED -> GREEN tightening. A single RED test containing all cases violates the vertical discipline.

**Execution order**: Execute tasks in numeric order. For every RED task, run the focused test and confirm it fails for the expected missing behavior before starting the paired GREEN task. For every GREEN task, implement only the behavior required by the immediately preceding RED task, then run the focused test until it passes.

## Phase 1 - First Playwright vertical tracer bullet

- [ ] T001 Write the FIRST Specify journey Playwright test (RED).
  - Paths: `e2e/specify-vertical.spec.ts`.
  - Dependencies: none.
  - Acceptance: The failing test asserts SC-001 and SC-002 through the public app: fresh launch, GitHub login, Copilot login, Atlassian left disconnected, repository selection, new draft session creation, prompt `"Build a hello-world feature"`, Begin Specify, visible progress, rendered non-empty `spec.md`, exactly one `Concierge-Step: specify:pass` trailer on the active branch, `specify=complete`, and `clarify=pending`.

- [ ] T002 Implement the thinnest deterministic end-to-end Specify path (GREEN).
  - Paths: `e2e/specify-vertical.spec.ts`, `e2e/support/boundaries.ts` (NEW), `src/main/ipc/`, `src/preload/index.ts`, `src/renderer/`.
  - Dependencies: T001.
  - Acceptance: The e2e MUST exercise the full production IPC/preload/Run 3 ACP supervisor/Run 5 hook+factory+Step Commit path. Mocking is applied ONLY at the OS boundary via env-var-scoped adapter injection: `process.env.CONCIERGE_TEST_GH_ADAPTER`, `process.env.CONCIERGE_TEST_COPILOT_ADAPTER`, and `process.env.CONCIERGE_TEST_ACP_ADAPTER` route to fake shell-out + fake ACP supervisor implementations that satisfy the same interfaces as the production adapters. The main process's IPC handler registration MUST read these env vars at boot and substitute the adapter; production code path is unchanged. **FORBIDDEN:** renderer-only success fixtures, a "test mode" branch in the production code, any RTK Query mock that bypasses preload, any short-circuit that skips the real Step Commit. The e2e's `Concierge-Step: specify:pass` trailer assertion is the proof-of-real-path — it can only pass if Run 5's commitWithTrailer actually ran. T001 passes via this real-path-with-boundary-mocks pattern.

## Phase 2 - Font dependencies and single CSS port

- [ ] T003 Add the font dependency invariant test (RED).
  - Paths: `package.json`, `package-lock.json`, `src/renderer/index.test.tsx`.
  - Dependencies: T002.
  - Acceptance: The failing test/check proves Run 6 adds exactly `@fontsource/geist-sans` and `@fontsource/geist-mono` as runtime dependencies and no markdown, icon, UI, or animation runtime dependency.

- [ ] T004 Install and import the Geist font packages (GREEN).
  - Paths: `package.json`, `package-lock.json`, `src/renderer/index.tsx`.
  - Dependencies: T003.
  - Acceptance: `npm install @fontsource/geist-sans @fontsource/geist-mono` has updated the lockfile, `index.tsx` imports the locked Geist Sans/Mono CSS weights, and T003 passes.

- [ ] T005 Add the single-stylesheet port smoke test (RED).
  - Paths: `src/renderer/index.test.tsx`, `src/renderer/styles/index.css`, `design/v3-fetch/project/styles.css`.
  - Dependencies: T004.
  - Acceptance: The failing test/check proves `src/renderer/index.tsx` imports only `src/renderer/styles/index.css` for Run 6 design CSS, Geist font stacks are present, and the orphan declarations from `design/v3-fetch/project/styles.css` lines ~29-40 are absent rather than wrapped into a second accidental theme.

- [ ] T006 Port the v3 stylesheet to one CSS file (GREEN).
  - Paths: `src/renderer/styles/index.css`, `src/renderer/index.tsx`.
  - Dependencies: T005.
  - Acceptance: The design stylesheet is ported to one file, invalid orphan declarations are dropped, runtime accent/density/activity-side hooks are represented with classes/data attributes/CSS variables, and T005 passes.

## Phase 3 - Foundational pure components

- [ ] T007 Add `Icons` pure component tests (RED).
  - Paths: `src/renderer/components/Icons.test.tsx`, `src/renderer/components/Icons.tsx`.
  - Dependencies: T006.
  - Acceptance: The failing tests render representative `Ico.*` SVG components through React, assert accessible props/className pass through, and prove no icon runtime dependency is imported.

- [ ] T008 Port `Icons` (GREEN).
  - Paths: `src/renderer/components/Icons.tsx`.
  - Dependencies: T007.
  - Acceptance: `Icons.tsx` exports the typed `Ico` namespace from the design's inline SVG inventory, imports no store/effects, and T007 passes.

- [ ] T009 Add `Markdown` helper behavior tests (RED).
  - Paths: `src/renderer/components/Markdown.test.tsx`, `src/renderer/components/Markdown.tsx`.
  - Dependencies: T008.
  - Acceptance: The failing tests prove headings, paragraphs, lists, code fences, links, and escaped HTML render without adding a markdown runtime dependency.

- [ ] T010 Port `Markdown` helper (GREEN).
  - Paths: `src/renderer/components/Markdown.tsx`.
  - Dependencies: T009.
  - Acceptance: `Markdown.tsx` exposes the lightweight renderer used by `SpecifyStep`, escapes hostile HTML, imports no Electron/Node APIs, and T009 passes.

- [ ] T011 Add `PixelCSpinner` browser-boundary tests (RED).
  - Paths: `src/renderer/components/PixelCSpinner.test.tsx`, `src/renderer/components/PixelCSpinner.tsx`.
  - Dependencies: T010.
  - Acceptance: The failing tests mock canvas and requestAnimationFrame at browser boundaries, assert animation starts/stops with `busy`, honors `size`, `cell`, `pixelation`, `color`, `speed`, and never drives animation through React reconciliation.

- [ ] T012 Port `PixelCSpinner` canvas animation (GREEN).
  - Paths: `src/renderer/components/PixelCSpinner.tsx`.
  - Dependencies: T011.
  - Acceptance: The design's canvas + requestAnimationFrame algorithm is ported with strict TypeScript refs/context typing, cleanup cancels RAF, and T011 passes.

## Phase 4 - Existing slice extensions

- [ ] T013 Add auth slice Run 6 behavior tests (RED).
  - Paths: `src/renderer/slices/auth.test.ts`, `src/renderer/slices/auth.selectors.ts`.
  - Dependencies: T012.
  - Acceptance: The failing tests prove GitHub, Copilot, Atlassian, identity, starting/error statuses, last error, and `selectAuthGateOpen` are represented in the existing `auth` slice; GitHub + Copilot open the gate while Atlassian remains visible but optional.

- [ ] T014 Extend the auth slice (GREEN).
  - Paths: `src/renderer/slices/auth.ts`, `src/renderer/slices/auth.selectors.ts`.
  - Dependencies: T013.
  - Acceptance: Auth actions/selectors support Run 6 sign-in/titlebar flows, Copilot remains locked until GitHub is ok, Atlassian is labeled stub/optional, no ninth slice is added, and T013 passes.

- [ ] T015 Add workspace slice Run 6 behavior tests (RED).
  - Paths: `src/renderer/slices/workspace.test.ts`, `src/renderer/slices/workspace.selectors.ts`.
  - Dependencies: T014.
  - Acceptance: The failing tests prove selected repo, selected branch/session, active step, max reached step, viewed step, and draft-session entry live in the existing `workspace` slice.

- [ ] T016 Extend the workspace slice (GREEN).
  - Paths: `src/renderer/slices/workspace.ts`, `src/renderer/slices/workspace.selectors.ts`.
  - Dependencies: T015.
  - Acceptance: Workspace actions/selectors support repo browse, checkout, draft creation, canonical step navigation, and T015 passes.

- [ ] T017 Add session slice Run 6 behavior tests (RED).
  - Paths: `src/renderer/slices/session.test.ts`, `src/renderer/slices/session.selectors.ts`.
  - Dependencies: T016.
  - Acceptance: The failing tests prove the existing `session` slice owns Specify prompt, started/running state, generated `spec.md`, artifact path, commit SHA, scroll progress, and later-step placeholder data.

- [ ] T018 Extend the session slice (GREEN).
  - Paths: `src/renderer/slices/session.ts`, `src/renderer/slices/session.selectors.ts`.
  - Dependencies: T017.
  - Acceptance: Prompt starts empty, whitespace-only Begin state can be derived as disabled, pass/fail Specify events update observable session state without implementing later runs, and T017 passes.

- [ ] T019 Add preferences slice Run 6 behavior tests (RED).
  - Paths: `src/renderer/slices/preferences.test.ts`, `src/renderer/slices/preferences.selectors.ts`.
  - Dependencies: T018.
  - Acceptance: The failing tests prove accent, density, activity side, require-scroll-to-unlock, recent repositories, selected Copilot model, hydration status, persistence status, and debounced dirty state live in the existing `preferences` slice.

- [ ] T020 Extend the preferences slice (GREEN).
  - Paths: `src/renderer/slices/preferences.ts`, `src/renderer/slices/preferences.selectors.ts`.
  - Dependencies: T019.
  - Acceptance: Preference actions/selectors support CustomizeModal and selected model forwarding to `copilot:specify`, derived selectors are memoized when returning fresh objects/arrays, and T019 passes.

- [ ] T021 Add activity slice Run 6 behavior tests (RED).
  - Paths: `src/renderer/slices/activity.test.ts`, `src/renderer/slices/activity.selectors.ts`.
  - Dependencies: T020.
  - Acceptance: The failing tests prove capped entries, current status line, busy state, log-rate data for ActivityPill, and failure observability live in the existing `activity` slice with cap 256.

- [ ] T022 Extend the activity slice (GREEN).
  - Paths: `src/renderer/slices/activity.ts`, `src/renderer/slices/activity.selectors.ts`.
  - Dependencies: T021.
  - Acceptance: Activity actions append progress/auth/repo/preference events, cap remains 256, busy/current status selectors support Activity and ActivityPill, and T021 passes.

- [ ] T023 Add eight-slice integration guard tests (RED).
  - Paths: `src/renderer/store.test.ts`, `src/renderer/slices/`.
  - Dependencies: T022.
  - Acceptance: The failing test proves store assembly still has exactly `ui`, `preferences`, `auth`, `workspace`, `steps`, `session`, `activity`, and `copilot`, with no `org`, `design`, `pipeline`, or `repositories` slice.

- [ ] T024 Preserve the eight-slice store while wiring Run 6 state (GREEN).
  - Paths: `src/renderer/store.ts`, `src/renderer/slices/`.
  - Dependencies: T023.
  - Acceptance: Run 6 state is represented only by existing slices, RTK Query tag taxonomy remains unchanged, and T023 passes.

## Phase 5 - Nine main-process IPC handlers, factories, tests, and logs

- [ ] T025 Add `copilot:specify` main factory floor tests (RED).
  - Paths: `src/main/ipc/copilotSpecify.factory.spec.ts`.
  - Dependencies: T024.
  - Acceptance: Sequential sub-tracer bullets in this RED task: happy request/ack/stream envelope; empty object named error; `null` named error; `undefined` named error; hostile wrong step/model/subscription shape; partial plausible missing prompt/repo/branch; then extra-key rejection.

- [ ] T026 Implement `copilot:specify` main factory (GREEN).
  - Paths: `src/main/ipc/copilotSpecify.factory.ts`.
  - Dependencies: T025.
  - Acceptance: The factory validates request, ack, and `StepStreamEvent` envelopes, enforces `step: 'specify'`, accepts selected model metadata, rejects extra keys, and T025 passes.

- [ ] T027 Add `copilot:specify` success handler and logging tests (RED).
  - Paths: `src/main/ipc/copilotSpecify.test.ts`.
  - Dependencies: T026.
  - Acceptance: The failing test registers the handler, mocks `createMainLogger`, fakes only ACP/process/filesystem/time boundaries, applies selected model through Run 3 `configOptions[id=model]`, runs before/after Specify lifecycle hooks, emits progress plus exactly one `done/pass`, reads `spec.md` from the validated Step Contract path, and logs structured start/success fields.

- [ ] T028 Implement `copilot:specify` success path (GREEN).
  - Paths: `src/main/ipc/copilotSpecify.ts`, `src/main/index.ts`.
  - Dependencies: T027.
  - Acceptance: The handler orchestrates Run 5 lifecycle + Run 3 ACP + Step Contract readback, returns a start ack, registers exactly once, and T027 passes.

- [ ] T029 Add `copilot:specify` failure and duplicate-terminal tests (RED).
  - Paths: `src/main/ipc/copilotSpecify.test.ts`.
  - Dependencies: T028.
  - Acceptance: The failing test proves ACP/factory/lifecycle failures emit exactly one `done/fail` with reason, never mark Specify complete, log structured errors through `createMainLogger`, and duplicate terminal attempts are ignored or surfaced without a second done event.

- [ ] T030 Implement `copilot:specify` failure guard (GREEN).
  - Paths: `src/main/ipc/copilotSpecify.ts`.
  - Dependencies: T029.
  - Acceptance: Failure paths route through established Escape Hatch semantics, preserve explicit errors, enforce one terminal event, and T029 passes.

- [ ] T031 Add `auth:gh:login` main factory floor tests (RED).
  - Paths: `src/main/ipc/auth.factory.spec.ts`.
  - Dependencies: T030.
  - Acceptance: Sequential sub-tracer bullets: happy GitHub login request/result; empty object; `null`; `undefined`; hostile command-injection-like payload; partial plausible missing identity; then extra-key rejection.

- [ ] T032 Implement `auth:gh:login` main factory (GREEN).
  - Paths: `src/main/ipc/auth.factory.ts`.
  - Dependencies: T031.
  - Acceptance: The auth factory validates GitHub login inputs/outputs, returns stable named errors, preserves existing auth status behavior, and T031 passes.

- [ ] T033 Add `auth:gh:login` handler and logging tests (RED).
  - Paths: `src/main/ipc/auth.test.ts`, `src/main/data-layer/auth/cliAuth.test.ts`.
  - Dependencies: T032.
  - Acceptance: The failing test invokes the registered channel, mocks `createMainLogger`, fakes only shell-out boundaries, asserts real production path uses the GitHub CLI login adapter, exposes starting/success/error states, and propagates failures.

- [ ] T034 Implement `auth:gh:login` handler (GREEN).
  - Paths: `src/main/ipc/auth.ts`, `src/main/data-layer/auth/cliAuth.ts`, `src/main/index.ts`.
  - Dependencies: T033.
  - Acceptance: GitHub login routes through the CLI auth adapter, validates request/response, logs structured success/failure, registers once, and T033 passes.

- [ ] T035 Add `auth:copilot:login` main factory floor tests (RED).
  - Paths: `src/main/ipc/auth.factory.spec.ts`.
  - Dependencies: T034.
  - Acceptance: Sequential sub-tracer bullets: happy Copilot login request/result; empty object; `null`; `undefined`; hostile wrong GitHub prerequisite shape; partial plausible missing status; then extra-key rejection.

- [ ] T036 Implement `auth:copilot:login` main factory (GREEN).
  - Paths: `src/main/ipc/auth.factory.ts`.
  - Dependencies: T035.
  - Acceptance: The factory validates Copilot login payloads, preserves GitHub-before-Copilot lock semantics, returns stable named errors, and T035 passes.

- [ ] T037 Add `auth:copilot:login` handler and logging tests (RED).
  - Paths: `src/main/ipc/auth.test.ts`, `src/main/data-layer/auth/cliAuth.test.ts`.
  - Dependencies: T036.
  - Acceptance: The failing test invokes the channel, mocks `createMainLogger`, proves Copilot login is unavailable until GitHub is ok, production path uses the Copilot CLI auth adapter, and failures propagate without success-shaped fallback.

- [ ] T038 Implement `auth:copilot:login` handler (GREEN).
  - Paths: `src/main/ipc/auth.ts`, `src/main/data-layer/auth/cliAuth.ts`.
  - Dependencies: T037.
  - Acceptance: Copilot login uses the sanctioned CLI auth adapter, enforces GitHub prerequisite, logs structured success/failure, and T037 passes.

- [ ] T039 Add `auth:atlassian:login` main factory floor tests (RED).
  - Paths: `src/main/ipc/auth.factory.spec.ts`.
  - Dependencies: T038.
  - Acceptance: Sequential sub-tracer bullets: happy Atlassian stub request/result; empty object; `null`; `undefined`; hostile OAuth-token-like payload; partial plausible missing stub label; then extra-key rejection.

- [ ] T040 Implement `auth:atlassian:login` main factory (GREEN).
  - Paths: `src/main/ipc/auth.factory.ts`.
  - Dependencies: T039.
  - Acceptance: The factory validates Atlassian stub payloads, never accepts real OAuth/token fields, returns stable named errors, and T039 passes.

- [ ] T041 Add `auth:atlassian:login` stub handler and logging tests (RED).
  - Paths: `src/main/ipc/auth.test.ts`.
  - Dependencies: T040.
  - Acceptance: The failing test invokes the channel, mocks `createMainLogger`, uses injected time for the short visual delay, returns connected-looking stub state, and proves no OAuth/MCP/JIRA side effect is attempted.

- [ ] T042 Implement `auth:atlassian:login` stub handler (GREEN).
  - Paths: `src/main/ipc/auth.ts`.
  - Dependencies: T041.
  - Acceptance: Atlassian login is a clearly labeled Run 6 visual stub, logs structured success/failure, registers once, and T041 passes.

- [ ] T043 Add `repos:list` main factory floor tests (RED).
  - Paths: `src/main/ipc/repos.factory.spec.ts`.
  - Dependencies: T042.
  - Acceptance: Sequential sub-tracer bullets: happy repo-list request/result; empty object; `null`; `undefined`; hostile organization/owner shape; partial plausible repo missing metadata; then extra-key rejection.

- [ ] T044 Implement `repos:list` main factory (GREEN).
  - Paths: `src/main/ipc/repos.factory.ts`.
  - Dependencies: T043.
  - Acceptance: The factory validates repo summaries for `collette-travel`, tolerates optional metadata only where planned, rejects extra keys, and T043 passes.

- [ ] T045 Add `repos:list` handler and logging tests (RED).
  - Paths: `src/main/ipc/repos.test.ts`, `src/main/data-layer/repositories/repoList.test.ts`.
  - Dependencies: T044.
  - Acceptance: The failing test registers the channel, mocks `createMainLogger`, fakes only `gh repo list` shell-out boundaries, returns distinguishable repository metadata, and propagates CLI failures.

- [ ] T046 Implement `repos:list` handler (GREEN).
  - Paths: `src/main/ipc/repos.ts`, `src/main/data-layer/repositories/repoList.ts`, `src/main/index.ts`.
  - Dependencies: T045.
  - Acceptance: Repository listing routes through a data-layer helper, validates input/output, logs structured success/failure, and T045 passes.

- [ ] T047 Add `branches:sessions` main factory floor tests (RED).
  - Paths: `src/main/ipc/branches.factory.spec.ts`.
  - Dependencies: T046.
  - Acceptance: Sequential sub-tracer bullets: happy branch-session request/result; empty object; `null`; `undefined`; hostile branch/ref path; partial plausible branch missing restored states; then extra-key rejection.

- [ ] T048 Implement `branches:sessions` main factory (GREEN).
  - Paths: `src/main/ipc/branches.factory.ts`.
  - Dependencies: T047.
  - Acceptance: The factory validates repo identity, `spec/*` branch summaries, restored step states in canonical order, rejects extra keys, and T047 passes.

- [ ] T049 Add `branches:sessions` handler and logging tests (RED).
  - Paths: `src/main/ipc/branches.test.ts`, `src/main/data-layer/git/branchSessions.test.ts`.
  - Dependencies: T048.
  - Acceptance: The failing test registers the channel, mocks `createMainLogger`, uses Run 2 git/trailer seams to list `spec/*` sessions, maps trailer state faithfully, and propagates git errors.

- [ ] T050 Implement `branches:sessions` handler (GREEN).
  - Paths: `src/main/ipc/branches.ts`, `src/main/data-layer/git/branchSessions.ts`, `src/main/index.ts`.
  - Dependencies: T049.
  - Acceptance: Branch sessions use existing git shell-out/trailer helpers, preserve canonical step order, log structured success/failure, and T049 passes.

- [ ] T051 Add `git:checkout` main factory floor tests (RED).
  - Paths: `src/main/ipc/git.factory.spec.ts`.
  - Dependencies: T050.
  - Acceptance: Sequential sub-tracer bullets: happy checkout request/result; empty object; `null`; `undefined`; hostile branch path; partial plausible request missing repo path; then extra-key rejection.

- [ ] T052 Implement `git:checkout` main factory (GREEN).
  - Paths: `src/main/ipc/git.factory.ts`.
  - Dependencies: T051.
  - Acceptance: The factory validates checkout payloads, rejects path/ref attacks and extra keys, preserves existing Run 4 git read factory behavior, and T051 passes.

- [ ] T053 Add `git:checkout` handler and logging tests (RED).
  - Paths: `src/main/ipc/git.test.ts`.
  - Dependencies: T052.
  - Acceptance: The failing test registers the channel, mocks `createMainLogger`, uses the Run 2 `runGit` path for checkout, rejects dirty/failed checkout explicitly, and never uses simple-git/nodegit.

- [ ] T054 Implement `git:checkout` handler (GREEN).
  - Paths: `src/main/ipc/git.ts`, `src/main/data-layer/git/gitCommand.ts`, `src/main/index.ts`.
  - Dependencies: T053.
  - Acceptance: Checkout routes through sanctioned git shell-outs, validates output, logs structured success/failure, and T053 passes.

- [ ] T055 Add `git:createDraft` main factory floor tests (RED).
  - Paths: `src/main/ipc/git.factory.spec.ts`.
  - Dependencies: T054.
  - Acceptance: Sequential sub-tracer bullets: happy draft request/result; empty object; `null`; `undefined`; hostile default-branch/path payload; partial plausible missing repo/default branch; then extra-key rejection.

- [ ] T056 Implement `git:createDraft` main factory (GREEN).
  - Paths: `src/main/ipc/git.factory.ts`.
  - Dependencies: T055.
  - Acceptance: The factory validates draft branch inputs/outputs, accepts `spec/draft-<base36 timestamp suffix>` results only, rejects extra keys, and T055 passes.

- [ ] T057 Add `git:createDraft` handler and collision tests (RED).
  - Paths: `src/main/ipc/git.test.ts`, `src/main/data-layer/git/gitCommand.test.ts`.
  - Dependencies: T056.
  - Acceptance: The failing test registers the channel, mocks `createMainLogger`, creates/checks out a draft branch before workspace entry, retries suffix collisions, and propagates dirty repo/checkout failures.

- [ ] T058 Implement `git:createDraft` handler (GREEN).
  - Paths: `src/main/ipc/git.ts`, `src/main/data-layer/git/gitCommand.ts`.
  - Dependencies: T057.
  - Acceptance: Draft creation uses `runGit`, names branches `spec/draft-<base36 timestamp suffix>`, retries collisions safely, logs structured success/failure, and T057 passes.

- [ ] T059 Add `artifacts:read` main factory floor tests (RED).
  - Paths: `src/main/ipc/artifacts.factory.spec.ts`.
  - Dependencies: T058.
  - Acceptance: Sequential sub-tracer bullets: happy artifact read request/result; empty object; `null`; `undefined`; hostile traversal/absolute path; partial plausible missing artifact path; then extra-key rejection.

- [ ] T060 Implement `artifacts:read` main factory (GREEN).
  - Paths: `src/main/ipc/artifacts.factory.ts`.
  - Dependencies: T059.
  - Acceptance: The factory validates relative artifact paths and text/size/mtime responses, rejects extra keys, and T059 passes.

- [ ] T061 Add `artifacts:read` handler and logging tests (RED).
  - Paths: `src/main/ipc/artifacts.test.ts`.
  - Dependencies: T060.
  - Acceptance: The failing test registers the channel, mocks `createMainLogger`, reads the same relative `artifactPath` carried by `copilot:specify` done/pass, rejects traversal, and propagates missing/empty/too-large read errors explicitly.

- [ ] T062 Implement `artifacts:read` handler (GREEN).
  - Paths: `src/main/ipc/artifacts.ts`, `src/main/index.ts`.
  - Dependencies: T061.
  - Acceptance: Artifact reads use sanctioned filesystem helpers, validate request/response, log structured success/failure, and T061 passes.

## Phase 6 - Preload bridge extension

- [ ] T063 Add preload invoke bridge tests for nine Run 6 capabilities (RED).
  - Paths: `src/preload/index.test.ts`, `src/preload/index.ts`.
  - Dependencies: T062.
  - Acceptance: The failing tests prove the preload bridge exposes invoke methods for exactly `copilot:specify`, `auth:gh:login`, `auth:copilot:login`, `auth:atlassian:login`, `repos:list`, `branches:sessions`, `git:checkout`, `git:createDraft`, and `artifacts:read` without exposing raw `ipcRenderer` to the renderer.
  - Vertical discipline rider: Implementer MUST split this into sequential sub-tracer-bullets: one RED per behavior, one GREEN per RED, before moving to the next behavior.

- [ ] T064 Implement preload invoke bridge methods (GREEN).
  - Paths: `src/preload/index.ts`.
  - Dependencies: T063.
  - Acceptance: The bridge exposes typed invoke helpers for all nine channels, preserves existing Run 2-5 bridge APIs, and T063 passes.

- [ ] T065 Add preload `copilot:specify` subscribe tests (RED).
  - Paths: `src/preload/index.test.ts`.
  - Dependencies: T064.
  - Acceptance: The failing tests prove `subscribeSpecify(subscriptionId, callback)` listens to derived `copilot:specify:event`, validates envelopes before callback, filters by subscription id, returns cleanup that removes the listener, and treats the event as transport for the single `copilot:specify` capability rather than a tenth business channel.

- [ ] T066 Implement preload subscribe support (GREEN).
  - Paths: `src/preload/index.ts`.
  - Dependencies: T065.
  - Acceptance: Subscription setup/cleanup is owned by preload, renderer receives only validated `StepStreamEvent` values, and T065 passes.

## Phase 7 - Renderer API endpoints and renderer-entry factories

- [ ] T067 Add `copilot:specify` renderer-entry factory floor tests (RED).
  - Paths: `src/renderer/api/copilotSpecify.factory.spec.ts`.
  - Dependencies: T066.
  - Acceptance: Sequential sub-tracer bullets: happy start/done/progress payloads; empty object; `null`; `undefined`; hostile duplicate terminal/wrong step; partial plausible missing `subscriptionId`; then extra-key rejection.

- [ ] T068 Implement `copilot:specify` renderer-entry factory (GREEN).
  - Paths: `src/renderer/api/copilotSpecify.factory.ts`, `src/renderer/api/streamEvents.ts`.
  - Dependencies: T067.
  - Acceptance: Renderer factories validate preload-returned unknown start and stream values, enforce `StepStreamEvent`, import no Electron/Node APIs, and T067 passes.

- [ ] T069 Add `runSpecify` streaming endpoint tests (RED).
  - Paths: `src/renderer/api/copilotSpecify.endpoint.test.ts`.
  - Dependencies: T068.
  - Acceptance: The failing endpoint test uses the real preload bridge mock, subscribes before/at mutation start through `onCacheEntryAdded`, dispatches progress events into activity, dispatches pass/fail into public slice actions, ignores duplicate terminal events defensively, and unsubscribes on cache removal.

- [ ] T070 Implement `runSpecify` endpoint (GREEN).
  - Paths: `src/renderer/api/copilotSpecify.endpoint.ts`, `src/renderer/api/index.ts`, `src/renderer/api/baseQuery.ts`.
  - Dependencies: T069.
  - Acceptance: The endpoint injects into the existing RTK Query API, preserves fixed tag taxonomy, uses only preload, and T069 passes.

- [ ] T071 Add `auth:gh:login` renderer-entry factory floor tests (RED).
  - Paths: `src/renderer/api/auth.factory.spec.ts`.
  - Dependencies: T070.
  - Acceptance: Sequential sub-tracer bullets: happy GitHub login result; empty object; `null`; `undefined`; hostile identity shape; partial plausible missing status; then extra-key rejection.

- [ ] T072 Implement `auth:gh:login` renderer-entry factory (GREEN).
  - Paths: `src/renderer/api/auth.factory.ts`.
  - Dependencies: T071.
  - Acceptance: The factory validates preload results for GitHub login, preserves existing auth status parsing, imports no Electron/Node APIs, and T071 passes.

- [ ] T073 Add `loginGitHub` endpoint tests (RED).
  - Paths: `src/renderer/api/auth.endpoint.test.ts`.
  - Dependencies: T072.
  - Acceptance: The failing endpoint test uses the preload bridge mock, invokes `auth:gh:login`, validates through the renderer factory, updates observable auth state through public actions, and preserves IPC/factory errors.

- [ ] T074 Implement `loginGitHub` endpoint (GREEN).
  - Paths: `src/renderer/api/auth.endpoint.ts`, `src/renderer/api/index.ts`.
  - Dependencies: T073.
  - Acceptance: The endpoint uses only preload, exposes the mutation hook, provides/invalidates planned tags, and T073 passes.

- [ ] T075 Add `auth:copilot:login` renderer-entry factory floor tests (RED).
  - Paths: `src/renderer/api/auth.factory.spec.ts`.
  - Dependencies: T074.
  - Acceptance: Sequential sub-tracer bullets: happy Copilot login result; empty object; `null`; `undefined`; hostile prerequisite shape; partial plausible missing status; then extra-key rejection.

- [ ] T076 Implement `auth:copilot:login` renderer-entry factory (GREEN).
  - Paths: `src/renderer/api/auth.factory.ts`.
  - Dependencies: T075.
  - Acceptance: Copilot login parser preserves GitHub lock semantics, imports no Electron/Node APIs, and T075 passes.

- [ ] T077 Add `loginCopilot` endpoint tests (RED).
  - Paths: `src/renderer/api/auth.endpoint.test.ts`.
  - Dependencies: T076.
  - Acceptance: The failing test invokes `auth:copilot:login` through the bridge, keeps mutation disabled/blocked until GitHub is ok, validates results, and propagates errors.

- [ ] T078 Implement `loginCopilot` endpoint (GREEN).
  - Paths: `src/renderer/api/auth.endpoint.ts`.
  - Dependencies: T077.
  - Acceptance: The endpoint uses only preload, coordinates with auth state through public actions, and T077 passes.

- [ ] T079 Add `auth:atlassian:login` renderer-entry factory floor tests (RED).
  - Paths: `src/renderer/api/auth.factory.spec.ts`.
  - Dependencies: T078.
  - Acceptance: Sequential sub-tracer bullets: happy Atlassian stub result; empty object; `null`; `undefined`; hostile OAuth-token-like result; partial plausible missing stub label; then extra-key rejection.

- [ ] T080 Implement `auth:atlassian:login` renderer-entry factory (GREEN).
  - Paths: `src/renderer/api/auth.factory.ts`.
  - Dependencies: T079.
  - Acceptance: The parser accepts only the Run 6 stub result shape, never real OAuth claims, imports no Electron/Node APIs, and T079 passes.

- [ ] T081 Add `loginAtlassianStub` endpoint tests (RED).
  - Paths: `src/renderer/api/auth.endpoint.test.ts`.
  - Dependencies: T080.
  - Acceptance: The failing test invokes `auth:atlassian:login`, updates visible status only, does not gate repository selection, and records activity as a stub.

- [ ] T082 Implement `loginAtlassianStub` endpoint (GREEN).
  - Paths: `src/renderer/api/auth.endpoint.ts`.
  - Dependencies: T081.
  - Acceptance: The endpoint exposes the visual stub mutation, keeps Atlassian optional, and T081 passes.

- [ ] T083 Add `repos:list` renderer-entry factory floor tests (RED).
  - Paths: `src/renderer/api/repositories.factory.spec.ts`.
  - Dependencies: T082.
  - Acceptance: Sequential sub-tracer bullets: happy repo summaries; empty object; `null`; `undefined`; hostile repo metadata; partial plausible missing name/default branch; then extra-key rejection.

- [ ] T084 Implement `repos:list` renderer-entry factory (GREEN).
  - Paths: `src/renderer/api/repositories.factory.ts`.
  - Dependencies: T083.
  - Acceptance: The factory validates repository summaries, imports no Electron/Node APIs, and T083 passes.

- [ ] T085 Add `listRepos` endpoint tests (RED).
  - Paths: `src/renderer/api/repositories.endpoint.test.ts`.
  - Dependencies: T084.
  - Acceptance: The failing test uses the preload bridge mock, invokes `repos:list`, validates results, supports empty/failure states, and provides existing RTK Query tags without adding new tag types.

- [ ] T086 Implement `listRepos` endpoint (GREEN).
  - Paths: `src/renderer/api/repositories.endpoint.ts`, `src/renderer/api/index.ts`.
  - Dependencies: T085.
  - Acceptance: The endpoint injects into the existing API, imports no Electron/Node APIs, and T085 passes.

- [ ] T087 Add `branches:sessions` renderer-entry factory floor tests (RED).
  - Paths: `src/renderer/api/branches.factory.spec.ts`.
  - Dependencies: T086.
  - Acceptance: Sequential sub-tracer bullets: happy branch sessions; empty object; `null`; `undefined`; hostile branch/trailer state; partial plausible missing restored states; then extra-key rejection.

- [ ] T088 Implement `branches:sessions` renderer-entry factory (GREEN).
  - Paths: `src/renderer/api/branches.factory.ts`.
  - Dependencies: T087.
  - Acceptance: The factory validates branch sessions, canonical restored step states, imports no Electron/Node APIs, and T087 passes.

- [ ] T089 Add `listBranchSessions` endpoint tests (RED).
  - Paths: `src/renderer/api/branches.endpoint.test.ts`.
  - Dependencies: T088.
  - Acceptance: The failing test invokes `branches:sessions` through the preload mock, exposes restored step state in canonical order, and preserves errors.

- [ ] T090 Implement `listBranchSessions` endpoint (GREEN).
  - Paths: `src/renderer/api/branches.endpoint.ts`, `src/renderer/api/index.ts`.
  - Dependencies: T089.
  - Acceptance: The endpoint uses only preload, provides/invalidate planned tags consistently, and T089 passes.

- [ ] T091 Add `git:checkout` renderer-entry factory floor tests (RED).
  - Paths: `src/renderer/api/git.factory.spec.ts`.
  - Dependencies: T090.
  - Acceptance: Sequential sub-tracer bullets: happy checkout result; empty object; `null`; `undefined`; hostile branch path; partial plausible missing branch; then extra-key rejection.

- [ ] T092 Implement `git:checkout` renderer-entry factory (GREEN).
  - Paths: `src/renderer/api/git.factory.ts`.
  - Dependencies: T091.
  - Acceptance: The parser validates checkout results, preserves existing git read parsing, imports no Electron/Node APIs, and T091 passes.

- [ ] T093 Add `checkoutBranch` endpoint tests (RED).
  - Paths: `src/renderer/api/git.endpoint.test.ts`.
  - Dependencies: T092.
  - Acceptance: The failing test invokes `git:checkout`, validates results, updates workspace/session state through public actions, invalidates relevant tags, and preserves failures.

- [ ] T094 Implement `checkoutBranch` endpoint (GREEN).
  - Paths: `src/renderer/api/git.endpoint.ts`, `src/renderer/api/index.ts`.
  - Dependencies: T093.
  - Acceptance: The endpoint uses only preload, preserves fixed tag taxonomy, and T093 passes.

- [ ] T095 Add `git:createDraft` renderer-entry factory floor tests (RED).
  - Paths: `src/renderer/api/git.factory.spec.ts`.
  - Dependencies: T094.
  - Acceptance: Sequential sub-tracer bullets: happy draft result; empty object; `null`; `undefined`; hostile draft branch shape; partial plausible missing branch; then extra-key rejection.

- [ ] T096 Implement `git:createDraft` renderer-entry factory (GREEN).
  - Paths: `src/renderer/api/git.factory.ts`.
  - Dependencies: T095.
  - Acceptance: The parser accepts only `spec/draft-<base36 suffix>` draft results, imports no Electron/Node APIs, and T095 passes.

- [ ] T097 Add `createDraftBranch` endpoint tests (RED).
  - Paths: `src/renderer/api/git.endpoint.test.ts`.
  - Dependencies: T096.
  - Acceptance: The failing test invokes `git:createDraft` before workspace entry, validates the result, opens the workspace on the draft branch through public actions, and preserves failures.

- [ ] T098 Implement `createDraftBranch` endpoint (GREEN).
  - Paths: `src/renderer/api/git.endpoint.ts`.
  - Dependencies: T097.
  - Acceptance: The endpoint uses only preload, coordinates workspace entry, and T097 passes.

- [ ] T099 Add `artifacts:read` renderer-entry factory floor tests (RED).
  - Paths: `src/renderer/api/artifacts.factory.spec.ts`.
  - Dependencies: T098.
  - Acceptance: Sequential sub-tracer bullets: happy artifact result; empty object; `null`; `undefined`; hostile artifact path/text shape; partial plausible missing text or mtime; then extra-key rejection.

- [ ] T100 Implement `artifacts:read` renderer-entry factory (GREEN).
  - Paths: `src/renderer/api/artifacts.factory.ts`.
  - Dependencies: T099.
  - Acceptance: The parser validates artifact text/size/mtime results, imports no Electron/Node APIs, and T099 passes.

- [ ] T101 Add `readArtifact` endpoint tests (RED).
  - Paths: `src/renderer/api/artifacts.endpoint.test.ts`.
  - Dependencies: T100.
  - Acceptance: The failing test invokes `artifacts:read`, validates results through the renderer factory, supports refresh/modal reads from the same relative artifact path as Specify done/pass, and preserves failures.

- [ ] T102 Implement `readArtifact` endpoint (GREEN).
  - Paths: `src/renderer/api/artifacts.endpoint.ts`, `src/renderer/api/index.ts`.
  - Dependencies: T101.
  - Acceptance: The endpoint uses only preload, injects into the existing API, and T101 passes.

## Phase 8 - Props-only UI components in design import-graph order

- [ ] T103 Add `SignInScreen` component tests (RED).
  - Paths: `src/renderer/components/SignInScreen.test.tsx`, `src/renderer/components/SignInScreen.tsx`.
  - Dependencies: T102.
  - Acceptance: The failing tests render three prerequisite rows, Copilot locked until GitHub ok, Atlassian visible/optional/stub-labeled, and no store hooks are imported.

- [ ] T104 Port `SignInScreen` (GREEN).
  - Paths: `src/renderer/components/SignInScreen.tsx`.
  - Dependencies: T103.
  - Acceptance: The props-only component matches the v3 sign-in shape with Run 6 gate semantics and T103 passes.

- [ ] T105 Add `RepoBrowseScreen` component tests (RED).
  - Paths: `src/renderer/components/RepoBrowseScreen.test.tsx`, `src/renderer/components/RepoBrowseScreen.tsx`.
  - Dependencies: T104.
  - Acceptance: The failing tests cover search/filter, recent/all presentation, metadata display, branch/session picker, resume, and start-new-session callbacks.

- [ ] T106 Port `RepoBrowseScreen` (GREEN).
  - Paths: `src/renderer/components/RepoBrowseScreen.tsx`.
  - Dependencies: T105.
  - Acceptance: The props-only repo browse and branch picker components use no store/effects and T105 passes.

- [ ] T107 Add `Titlebar` component tests (RED).
  - Paths: `src/renderer/components/Titlebar.test.tsx`, `src/renderer/components/Titlebar.tsx`.
  - Dependencies: T106.
  - Acceptance: The failing tests cover AuthChip, RepoChip, BranchChip, ModelPicker, GearMenu, click-outside behavior, Customize/About/Request callbacks, optional Atlassian status, and canonical `review` naming.

- [ ] T108 Port `Titlebar` (GREEN).
  - Paths: `src/renderer/components/Titlebar.tsx`.
  - Dependencies: T107.
  - Acceptance: The props-only grouped chip/menu component imports no store/effects, exposes all required callbacks, and T107 passes.

- [ ] T109 Add `Stepper` component tests (RED).
  - Paths: `src/renderer/components/Stepper.test.tsx`, `src/renderer/components/Stepper.tsx`.
  - Dependencies: T108.
  - Acceptance: The failing tests assert canonical order `specify -> clarify -> plan -> tasks -> analyze -> review`, Specify is actionable first, Clarify becomes selectable placeholder after Specify pass, and later steps remain not available unless restored history says otherwise.

- [ ] T110 Port `Stepper` (GREEN).
  - Paths: `src/renderer/components/Stepper.tsx`.
  - Dependencies: T109.
  - Acceptance: The props-only Stepper uses the three-state vocabulary, maps design `final` wording to `review`, and T109 passes.

- [ ] T111 Add `SpecifyStep` component tests (RED).
  - Paths: `src/renderer/components/SpecifyStep.test.tsx`, `src/renderer/components/SpecifyStep.tsx`.
  - Dependencies: T110.
  - Acceptance: The failing tests cover empty prompt placeholder `"What do you want to build today?"`, whitespace Begin disabled, valid Begin enabled, running state, complete markdown preview/edit modes, scroll progress, scroll-gate preference, and popped-out editor modal.
  - Vertical discipline rider: Implementer MUST split this into sequential sub-tracer-bullets: one RED per behavior, one GREEN per RED, before moving to the next behavior.

- [ ] T112 Port `SpecifyStep` (GREEN).
  - Paths: `src/renderer/components/SpecifyStep.tsx`.
  - Dependencies: T111.
  - Acceptance: The props-only Specify body implements only Specify, keeps editor mode/local UI state local, uses `Markdown`, and T111 passes.

- [ ] T113 Add `Activity` component tests (RED).
  - Paths: `src/renderer/components/Activity.test.tsx`, `src/renderer/components/Activity.tsx`.
  - Dependencies: T112.
  - Acceptance: The failing tests cover capped entry rendering, current status, busy state, side placement, hidden/off display contract, and local scroll position.
  - **VERTICAL DISCIPLINE:** implementer MUST split into sequential RED → GREEN sub-tracer-bullets per behavior listed above. Do not batch all RED tests before any GREEN passes.

- [ ] T114 Port `Activity` (GREEN).
  - Paths: `src/renderer/components/Activity.tsx`.
  - Dependencies: T113.
  - Acceptance: The props-only activity rail preserves cap display semantics, imports no store/effects, and T113 passes.

- [ ] T115 Add `ActivityPill` component tests (RED).
  - Paths: `src/renderer/components/ActivityPill.test.tsx`, `src/renderer/components/ActivityPill.tsx`.
  - Dependencies: T114.
  - Acceptance: The failing tests prove the pill remains visible when activity rail is hidden, toggles visibility, always shows `PixelCSpinner` for busy/progress affordance, and maps log rate/current step to spinner speed/pixelation.
  - **VERTICAL DISCIPLINE:** implementer MUST split into sequential RED → GREEN sub-tracer-bullets per behavior listed above. Do not batch all RED tests before any GREEN passes.

- [ ] T116 Port `ActivityPill` (GREEN).
  - Paths: `src/renderer/components/ActivityPill.tsx`.
  - Dependencies: T115.
  - Acceptance: The props-only pill uses `PixelCSpinner`, imports no store/effects, and T115 passes.

- [ ] T117 Add modal component tests (RED).
  - Paths: `src/renderer/components/CustomizeModal.test.tsx`, `src/renderer/components/AboutModal.test.tsx`, `src/renderer/components/RequestModal.test.tsx`.
  - Dependencies: T116.
  - Acceptance: The failing tests cover Customize accent/density/activity-side/require-scroll controls, About model/repo/branch display, RequestModal scaffold only, and no `concierge:report` IPC.
  - Vertical discipline rider: Implementer MUST split this into sequential sub-tracer-bullets: one RED per behavior, one GREEN per RED, before moving to the next behavior.

- [ ] T118 Port Run 6 modal components (GREEN).
  - Paths: `src/renderer/components/CustomizeModal.tsx`, `src/renderer/components/AboutModal.tsx`, `src/renderer/components/RequestModal.tsx`.
  - Dependencies: T117.
  - Acceptance: The modal components are props-only, `tweaks-panel.jsx` is not ported, RequestModal remains UI scaffold only, and T117 passes.

- [ ] T119 Add `AppShell` and placeholder tests (RED).
  - Paths: `src/renderer/components/AppShell.test.tsx`, `src/renderer/components/AppShell.tsx`.
  - Dependencies: T118.
  - Acceptance: The failing tests render sign-in, repo browse, workspace shell, titlebar, stepper, Specify body, activity rail/pill, modals, and explicit Run 7-9 placeholders for Clarify/Plan/Tasks/Analyze/Review without implementing deferred bodies/viewers.
  - **VERTICAL DISCIPLINE:** implementer MUST split into sequential RED → GREEN sub-tracer-bullets per behavior listed above. Do not batch all RED tests before any GREEN passes.

- [ ] T120 Port `AppShell` and deferred placeholders (GREEN).
  - Paths: `src/renderer/components/AppShell.tsx`.
  - Dependencies: T119.
  - Acceptance: The props-only shell composes Run 6 components, shows honest placeholders for deferred experiences, imports no store/effects, and T119 passes.

## Phase 9 - Smart containers wiring components to store/API

- [ ] T121 Add `SignInScreenContainer` tests (RED).
  - Paths: `src/renderer/components/SignInScreenContainer.test.tsx`, `src/renderer/components/SignInScreenContainer.tsx`.
  - Dependencies: T120.
  - Acceptance: The failing tests use typed store hooks/RTK Query hooks, dispatch login mutations, update auth state through public actions, and open the repo gate with GitHub + Copilot while Atlassian stays optional.
  - **VERTICAL DISCIPLINE:** implementer MUST split into sequential RED → GREEN sub-tracer-bullets per behavior listed above. Do not batch all RED tests before any GREEN passes.

- [ ] T122 Implement `SignInScreenContainer` (GREEN).
  - Paths: `src/renderer/components/SignInScreenContainer.tsx`.
  - Dependencies: T121.
  - Acceptance: The container is the only sign-in component using store/API hooks, imports no Electron/Node APIs, and T121 passes.

- [ ] T123 Add `RepoBrowseScreenContainer` tests (RED).
  - Paths: `src/renderer/components/RepoBrowseScreenContainer.test.tsx`, `src/renderer/components/RepoBrowseScreenContainer.tsx`.
  - Dependencies: T122.
  - Acceptance: The failing tests wire `listRepos`, `listBranchSessions`, `checkoutBranch`, and `createDraftBranch`, with draft creation before workspace entry.
  - Vertical discipline rider: Implementer MUST split this into sequential sub-tracer-bullets: one RED per behavior, one GREEN per RED, before moving to the next behavior.

- [ ] T124 Implement `RepoBrowseScreenContainer` (GREEN).
  - Paths: `src/renderer/components/RepoBrowseScreenContainer.tsx`.
  - Dependencies: T123.
  - Acceptance: The container owns repo/session data fetching and workspace entry actions through public APIs only, and T123 passes.

- [ ] T125 Add `TitlebarContainer` tests (RED).
  - Paths: `src/renderer/components/TitlebarContainer.test.tsx`, `src/renderer/components/TitlebarContainer.tsx`.
  - Dependencies: T124.
  - Acceptance: The failing tests wire auth, repo, branch, selected Copilot model, gear menu modal flags, Customize/About/Request affordances, and selected model persistence.
  - **VERTICAL DISCIPLINE:** implementer MUST split into sequential RED → GREEN sub-tracer-bullets per behavior listed above. Do not batch all RED tests before any GREEN passes.

- [ ] T126 Implement `TitlebarContainer` (GREEN).
  - Paths: `src/renderer/components/TitlebarContainer.tsx`.
  - Dependencies: T125.
  - Acceptance: The container reads existing slices, dispatches public actions only, and T125 passes.

- [ ] T127 Add `SpecifyStepContainer` tests (RED).
  - Paths: `src/renderer/components/SpecifyStepContainer.test.tsx`, `src/renderer/components/SpecifyStepContainer.tsx`.
  - Dependencies: T126.
  - Acceptance: The failing tests wire prompt state, Begin disabled/enabled, selected model forwarding, `runSpecify`, progress/pass/fail observable state, artifact refresh, and Clarify pending after Specify pass.
  - Vertical discipline rider: Implementer MUST split this into sequential sub-tracer-bullets: one RED per behavior, one GREEN per RED, before moving to the next behavior.

- [ ] T128 Implement `SpecifyStepContainer` (GREEN).
  - Paths: `src/renderer/components/SpecifyStepContainer.tsx`.
  - Dependencies: T127.
  - Acceptance: The container owns Specify API orchestration through RTK Query/public actions, components stay props-only, and T127 passes.

- [ ] T129 Add activity container tests (RED).
  - Paths: `src/renderer/components/ActivityRailContainer.test.tsx`, `src/renderer/components/ActivityPillContainer.test.tsx`.
  - Dependencies: T128.
  - Acceptance: The failing tests wire activity entries/current/busy/side, cap 256, hidden rail with visible pill, and log-rate-to-spinner props through selectors.
  - Vertical discipline rider: Implementer MUST split this into sequential sub-tracer-bullets: one RED per behavior, one GREEN per RED, before moving to the next behavior.

- [ ] T130 Implement activity containers (GREEN).
  - Paths: `src/renderer/components/ActivityRailContainer.tsx`, `src/renderer/components/ActivityPillContainer.tsx`.
  - Dependencies: T129.
  - Acceptance: Activity containers read only typed selectors, dispatch only public toggle/clear actions, and T129 passes.

- [ ] T131 Add `CustomizeModalContainer` tests (RED).
  - Paths: `src/renderer/components/CustomizeModalContainer.test.tsx`, `src/renderer/components/CustomizeModalContainer.tsx`.
  - Dependencies: T130.
  - Acceptance: The failing tests wire accent, density, activity side, require-scroll preference changes, dirty persistence state, and modal close behavior.
  - **VERTICAL DISCIPLINE:** implementer MUST split into sequential RED → GREEN sub-tracer-bullets per behavior listed above. Do not batch all RED tests before any GREEN passes.

- [ ] T132 Implement `CustomizeModalContainer` (GREEN).
  - Paths: `src/renderer/components/CustomizeModalContainer.tsx`.
  - Dependencies: T131.
  - Acceptance: The container updates only the existing preferences slice, no new persistence channel is introduced, and T131 passes.

- [ ] T133 Add `WorkspaceContainer` tests (RED).
  - Paths: `src/renderer/components/WorkspaceContainer.test.tsx`, `src/renderer/components/WorkspaceContainer.tsx`.
  - Dependencies: T132.
  - Acceptance: The failing tests compose titlebar, stepper, Specify container, later-step placeholders, activity rail/pill, modal containers, canonical step navigation, and restored later states without implementing later bodies.
  - **VERTICAL DISCIPLINE:** implementer MUST split into sequential RED → GREEN sub-tracer-bullets per behavior listed above. Do not batch all RED tests before any GREEN passes.

- [ ] T134 Implement `WorkspaceContainer` (GREEN).
  - Paths: `src/renderer/components/WorkspaceContainer.tsx`.
  - Dependencies: T133.
  - Acceptance: The workspace smart container owns workflow branching and store/API access, leaves props-only components pure, and T133 passes.

## Phase 10 - App root composition and Provider migration

- [ ] T135 Add root composition and Provider tests (RED).
  - Paths: `src/renderer/index.test.tsx`, `src/renderer/App.tsx`, `src/renderer/index.tsx`.
  - Dependencies: T134.
  - Acceptance: The failing test proves the app root mounts the existing Redux Provider once, imports fonts and `styles/index.css` once, routes SignInScreen -> RepoBrowseScreen -> WorkspaceContainer from store state, and no component outside smart containers uses store hooks.

- [ ] T136 Implement Run 6 app root composition (GREEN).
  - Paths: `src/renderer/App.tsx`, `src/renderer/index.tsx`, `src/renderer/components/AppShell.tsx`.
  - Dependencies: T135.
  - Acceptance: The root composes AppShell/containers under the existing Provider, preserves Run 4 store setup, removes obsolete proof-only renderer surface where necessary, and T135 passes.

## Phase 11 - Preferences persistence listener body

- [ ] T137 Add preferences persistence listener tests (RED).
  - Paths: `src/renderer/listeners/preferencesPersistence.listener.test.ts`, `src/renderer/api/preferences.endpoint.test.ts`.
  - Dependencies: T136.
  - Acceptance: The failing tests prove preference changes debounce and call the existing `preferences:write` endpoint within 250 ms under normal conditions, rehydrate through existing read behavior, observable persistence failures record activity, and no new persistence IPC channel is added.

- [ ] T138 Implement preferences persistence listener body (GREEN).
  - Paths: `src/renderer/listeners/preferencesPersistence.listener.ts`, `src/renderer/api/preferences.endpoint.ts`, `src/renderer/slices/preferences.ts`, `src/renderer/slices/activity.ts`.
  - Dependencies: T137.
  - Acceptance: Only `preferencesPersistence.listener.ts` receives a new Run 6 body among previously empty Run 4 listeners, it reuses `preferences:write`, preserves explicit failures, and T137 passes.

## Phase 12 - Final verification executable T-series

- [ ] T139 Verify Run 6 automated checks and boundary greps.
  - Paths: `package.json`, `package-lock.json`, `src/`, `e2e/`, `specs/0006-specify-vertical/tasks.md`.
  - Dependencies: T138.
  - Acceptance: ALL must pass:
    - `npm run lint`
    - `npm run typecheck`
    - `npm run test:coverage`
    - `npm run e2e`
    - `rg "from ['\"](electron|node:|fs|child_process|path|os)" src/renderer --type ts --type tsx` returns no renderer matches.
    - `rg "ipcRenderer\\.(invoke|send|on|off)" src/renderer --type ts --type tsx` returns no renderer matches.
    - `rg "simple-git|nodegit|--no-verify" src package.json` returns no production matches.
    - `rg "tweaks-panel|TweaksPanel|concierge:report" src/renderer --type ts --type tsx` returns no Run 6 product implementation matches.

- [ ] T140 Verify Run 6 executable invariants.
  - Paths: `src/renderer/store.test.ts`, `src/renderer/components/Stepper.test.tsx`, `src/renderer/api/auth.endpoint.test.ts`, `src/renderer/listeners/preferencesPersistence.listener.test.ts`, `src/renderer/listeners/stepLifecycle.listener.test.ts`, `src/renderer/listeners/transcriptCapture.listener.test.ts`.
  - Dependencies: T139.
  - Acceptance: ALL executable assertions pass:
    - Test count is at least 700:
      ```sh
      count=$(npm run test:coverage 2>&1 | grep -oE "Tests +[0-9]+ passed" | grep -oE "[0-9]+" | head -1)
      if [ -z "$count" ] || [ "$count" -lt 700 ]; then
        echo "Run 6 test-count violated: expected >= 700 tests, got ${count:-unknown}"; exit 1
      fi
      echo "Run 6 test-count: $count (>= 700)"
      ```
    - Store assembly contains exactly the eight constitutional slices and no ninth slice.
    - Atlassian remains a visible Run 6 stub and does not gate repository/workspace entry or claim OAuth/MCP/JIRA behavior.
    - Step order is exactly `specify -> clarify -> plan -> tasks -> analyze -> review`.
    - Activity cap remains exactly 256.
    - Listener body count is locked: Run 5 `stepLifecycle.listener.ts` and `transcriptCapture.listener.ts` remain intact; Run 6 fills only `preferencesPersistence.listener.ts`; `acpStreamSubscription.listener.ts`, `sessionLifecycle.listener.ts`, and `workspaceChange.listener.ts` remain infrastructure-only/empty for Run 6.

- [ ] T141 Verify Run 6 dependency, factory, and IPC governance.
  - Paths: `package.json`, `package-lock.json`, `src/main/ipc/`, `src/preload/index.ts`, `src/renderer/api/`, `src/renderer/components/`.
  - Dependencies: T140.
  - Acceptance: ALL must pass:
    - Runtime dependency diff from the Run 5 baseline is exactly `@fontsource/geist-sans` and `@fontsource/geist-mono`.
    - Exactly nine Run 6 business IPC capabilities are registered: `copilot:specify`, `auth:gh:login`, `auth:copilot:login`, `auth:atlassian:login`, `repos:list`, `branches:sessions`, `git:checkout`, `git:createDraft`, and `artifacts:read`.
    - `copilot:specify:event` exists only as a derived transport event for `copilot:specify`, not a tenth business capability.
    - Every new main IPC capability has main-side factory tests with the six standard floor cases plus extra-key rejection.
    - Every new renderer/preload-entry shape has renderer factory tests with the six standard floor cases plus extra-key rejection.
    - Every main handler logging test mocks `createMainLogger`.
    - No real Atlassian OAuth/MCP, JIRA sync UI, ArtifactViewer, TaskViewer, later-step body, HTTP server, or packaging change was introduced.

- [ ] T141a Verify Run 6 Copilot/project instruction conventions.
  - Paths: `.github/copilot-instructions.md`, `specs/0006-specify-vertical/tasks.md`.
  - Dependencies: T141.
  - Acceptance: ALL grep-based assertions must pass against `.github/copilot-instructions.md`:
    - `rg "Run 6 conventions" .github/copilot-instructions.md`
    - `rg "component naming|Component file naming convention" .github/copilot-instructions.md`
    - `rg "smart/dumb|Smart.*Dumb|props-only" .github/copilot-instructions.md`
    - `rg "single stylesheet|styles/index\\.css" .github/copilot-instructions.md`
    - `rg "canvas spinner|PixelCSpinner" .github/copilot-instructions.md`
    - `rg "font.*dep|@fontsource/geist" .github/copilot-instructions.md`
    - `rg "streaming channel|IPC.*naming|copilot:specify:event" .github/copilot-instructions.md`

- [ ] T141b Manually verify the first-run Specify app journey.
  - Paths: `specs/0006-specify-vertical/manual-verification.md` (NEW — durable evidence artifact at this exact path), `e2e/artifacts/run6-manual-trace/` (Playwright trace + screenshot output directory).
  - Dependencies: T141a.
  - Acceptance: Implementer MUST write a durable evidence file at `specs/0006-specify-vertical/manual-verification.md` containing AT MINIMUM these fields:
    - `npm_run_dev_started_at` (ISO timestamp from `date -u +%Y-%m-%dT%H:%M:%SZ`)
    - `npm_run_dev_finished_at` (ISO timestamp at the end of the manual session)
    - `auth_mode`: `mocked` (which env-var adapter set was active per T002)
    - `repo`: the chosen repo name
    - `branch_before_specify`: the branch state before clicking Begin (usually `main`)
    - `branch_after_specify`: the `spec/draft-<suffix>` branch name created by `git:createDraft`
    - `prompt`: the prompt text typed (verbatim)
    - `screenshot_path`: relative path to a screenshot of the rendered spec.md viewer (e.g., `e2e/artifacts/run6-manual-trace/rendered-spec-md.png`)
    - `playwright_trace_path`: relative path to a Playwright trace.zip recorded via `npx playwright codegen` or equivalent (e.g., `e2e/artifacts/run6-manual-trace/trace.zip`)
    - `git_log_output`: paste of `git log -1 --format=%B` showing the `Concierge-Step: specify:pass` trailer
    - `observations`: free-text notes on orb animation visible, activity log scrolling, PixelCSpinner pixelation level matching specify=1.0 step
    - `result`: `pass | partial | fail`
    
    The file is committed alongside the implement landing. This is deliberate human-eye verification; the artifact prevents skipping by requiring concrete proof.

- [ ] T141c Verify accessibility e2e coverage for Run 6 major screens.
  - Paths: `src/renderer/**/*.tsx`, `e2e/**/*.spec.ts`, `package.json`.
  - Dependencies: T141b.
  - Acceptance: Semantic roles/names are correct: SignInScreen rows have button role; modals have `role='dialog'` + `aria-labelledby` pointing at the heading; the stepper has `role='tablist'` or equivalent; orb visuals have `aria-hidden=true` (decorative); custom widgets (segmented controls, toggles) have proper ARIA attrs (per design's `customize-modal.jsx` `role='switch'` + `aria-checked` pattern).
  - Acceptance: Keyboard paths are complete: Tab order matches visual order; Escape closes modals; Enter triggers primary buttons; arrow keys work on segmented controls if implemented.
  - Acceptance: Live regions exist for activity log + status changes using `aria-live='polite'`.
  - Acceptance: Focus management is explicit: opening a modal focuses the first focusable element; closing returns focus to the trigger.
  - Acceptance: Add `@axe-core/playwright` to the e2e test, run axe-core on each major screen (sign-in / repo browse / workspace + Specify), and expect zero serious/critical violations.
  - Acceptance: After adding the accessibility devDependency and e2e scan, rerun `npm run typecheck` and `npm run e2e` so accessibility coverage is inside the final merge gate.
  - Dependency note: `@axe-core/playwright` is a new devDependency — first new dep Run 6 introduces beyond fontsource; add to `package.json` devDependencies.

## Dependencies and execution order

- Execute tasks in numeric order. Run 6 intentionally has no parallel implementation tasks because the plan requires vertical tracer bullets.
- For each factory RED task, execute the six standard floor cases as six sequential sub-tracer-bullets before the seventh extra-key rejection case.
- Do not start a later channel, endpoint, component, container, or listener until the current RED/GREEN pair is complete.
- Final verification begins only after T138 is green; T139-T141c are the verification sequence and MUST all pass before merge.
