# Spec-kit Concierge Constitution

> Electron desktop application that hosts the six-step spec-kit flow
> (Specify → Clarify → Plan → Tasks → Analyze → Review) for the
> `collette-travel` GitHub organization, driving a Bound CLI (GitHub
> Copilot CLI in v1, any ACP-compliant CLI later) over the Agent Client
> Protocol, exposing every human action through a localhost HTTP API so
> external agents can drive the app the same way a human does.

## Core Principles

### I. Layered Architecture (NON-NEGOTIABLE)

The renderer holds UI, navigation, and per-session work-in-progress.
The main process holds all I/O — git, filesystem, child processes, ACP
client, localhost HTTP server. They communicate exclusively through
the IPC bridge.

```
┌───────────────────────────────────────────────────────────────────────┐
│  Renderer (React 18 + Redux Toolkit + RTK Query + TypeScript strict)  │
│  ┌────────┐ ┌──────────────┐ ┌─────────────────┐ ┌─────────────────┐  │
│  │ Slices │ │ RTK Query    │ │ Listener        │ │ Selectors       │  │
│  │ (8)    │ │ APIs (IPC)   │ │ middleware      │ │ (createSelector)│  │
│  └────────┘ └──────────────┘ └─────────────────┘ └─────────────────┘  │
└──────────────────┬──────────────────────────┬─────────────────────────┘
                   │ IPC contextBridge        │ HTTP loopback (token)
                   ▼                          ▲ external agents
┌───────────────────────────────────────────────────────────────────────┐
│  Main (Electron, Node 22+)                                            │
│  data-layer: acp/, fs/, git/, http/, mcp-config/                      │
│  spec-kit extension hooks · Step Commits · Bound CLI supervisor       │
└───────────────────────────────────────────────────────────────────────┘
```

Rules:
- Renderer code MUST NOT `import('electron')`, `import('node:*')`,
  `child_process`, `simple-git`, or `fs`. Only IPC handlers exposed by
  the main process and the RTK Query API surface that wraps them.
- Main-process code MUST NOT import React, Redux Toolkit, or any
  renderer code.
- Every IPC handler MUST validate its renderer payload with a Zod
  schema before passing it to the data layer.
- Filesystem writes go through a single `fs/safeWrite.ts` helper that
  refuses writes outside the active Workspace path.
- ACP wire I/O lives only in `main/data-layer/acp/`; nothing outside
  that directory spawns or speaks to a coding-agent CLI directly.

Rationale: A bright IPC boundary keeps the renderer testable in
Vitest + jsdom, keeps the main process replaceable by a headless
HTTP-only driver (the verifier agent), and structurally enforces
disk-as-truth.

### II. Disk Is Truth (NON-NEGOTIABLE)

The state of record for a Session lives on disk: git history,
`Concierge-Step:` trailers, the per-step artifacts under
`specs/<branch>/`, and the JIRA stateful record file. The renderer
caches a derived view of that truth in Redux. On every Session start,
on every branch switch, and on resume, the renderer's step state is
recomputed from disk — never restored from a serialized Redux blob.

Rules:
- No Redux slice serializes itself to disk as the canonical record of
  step completion. `preferences` and per-Session-blob persistence cache
  user-input work (prompt text, in-flight clarify answers); they do
  not establish step completion.
- `Concierge-Step: <step>` git trailer on a commit is the only valid
  proof a step is complete. The `after_<step>` hook is the only writer
  of those commits; the Bound CLI is forbidden from making git commits
  during step execution.
- When the renderer and disk disagree (manual git operation,
  external-agent write, app crash), disk wins on re-read. The renderer
  re-reads at every Session start.
- Step completion is detected only through git history and on-disk
  artifact validation, never through ACP stream prose.

Rationale: ACP streams, stdouts, and renderer memory all fail in
production. The Step Commit history is the only thing that survives a
crash, an external git operation, or a verifier-agent test run, and
that survival is the entire correctness story.

### III. ACP-Only Bound CLI (NON-NEGOTIABLE)

The Concierge App drives coding-agent CLIs through the Agent Client
Protocol — JSON-RPC 2.0 over stdio — and nothing else.

Rules:
- The Bound CLI interface lives at `main/data-layer/acp/agent.ts` and
  exposes a single typed `CodingAgent` surface. No code outside that
  folder spawns a coding-agent binary.
- v1 default Bound CLI: GitHub Copilot CLI in ACP mode, launched with
  `--allow-all-tools` (no per-tool permission prompts in v1).
- An agent adapter is a thin process supervisor that (a) spawns the
  binary with documented ACP flags, (b) speaks JSON-RPC 2.0 over
  stdin/stdout, (c) emits typed `AgentEvent` notifications, (d) exposes
  capability discovery so the UI hides features the current Bound CLI
  doesn't support.
- Supported Bound CLI set is data, not code: a JSON manifest at
  `main/data-layer/acp/agents.json` lists each agent's binary, args,
  and capability flags. Adding a new ACP agent requires a manifest
  entry plus contract tests against recorded transcripts.
- Non-ACP CLIs are out of scope as Bound CLIs. Claude Code (currently
  an ACP client, not an ACP agent) cannot be used as the Bound CLI
  until it ships an ACP agent.
- Model selection flows through ACP session messages, never through
  shell-level `copilot config set`. Model swap is allowed between
  steps; locked once a step is `pending` and running.

Rationale: ACP is the published cross-vendor standard. Building
against it once gives us substitutability for free with every ACP-
compliant CLI (Codex, Gemini, OpenCode, Kimi, Qwen, Junie, etc.) and
keeps the swap claim provable through transcript contract tests.

### IV. Factory-First Data Transformation

Every payload that enters the renderer (from IPC, ACP, FS, HTTP API)
MUST pass through a factory before any consumer sees it.

Rules:
- Factories live in `domain/factories/`.
- Factories accept `unknown` with a type guard and return a fully-typed
  shape with safe defaults. Defensive coercion helpers
  (`asString`, `asNumber`, `asBoolean`, `asDate`, `stripHTML`,
  `normalizeLineEndings`) live in `domain/coerce.ts`; ad-hoc casts
  inside factories are forbidden.
- Domain interfaces live in `domain/types/<domain>.d.ts`.
- Each factory has co-located unit tests covering happy path, empty
  `{}` input, partial input, and at least one malformed-type case.
- The Clarify factory is the strictest — it enforces every constraint
  in CONTEXT.md's "Step Agent Failure Modes (Clarify-specific)"
  glossary entry. A malformed question never renders raw; it surfaces
  through the Clarify Re-ask UI affordance.

Rationale: ACP events, git outputs, JIRA stateful records, and the
HTTP API's external-agent payloads all evolve independently of our
release cadence. Factories are the contract seam that absorbs that
drift.

### V. Scoped Functional Programming

All TypeScript follows functional discipline; ESLint enforces it.
Layers are tagged as Pure or Effect.

Pure layers (`domain/`, `renderer/store/*/selectors.ts`,
`renderer/hooks/derive*`, all factories):
- `const` over `let`/`var`; no `var`.
- No mutation of inputs; return new values.
- No reliance on or modification of external state inside the function.
- `map`/`filter`/`reduce`/`toSorted` over loops.
- `as const` or `Object.freeze` for non-mutated objects.
- Functional composition over inheritance.
- Function components only.
- Classes only for third-party interop (Zod schemas, RTK builder
  pattern).

Effect layers (`main/electron-bootstrap.ts`, `main/ipc/*`,
`main/data-layer/*`, `renderer/main.tsx`, `renderer/store/*/slice.ts`,
RTK Query `baseQuery` implementations):
- Side effects MUST be confined to identified files.
- A Pure-layer file may not import from an Effect-layer module
  directly — only from its transform/factory partner.
- Redux Toolkit's Immer-backed mutative syntax inside `createSlice`
  reducers is considered pure: Immer produces immutable outputs, the
  mutative syntax is presentation only.

Rationale: Predictable, testable, composable code. The Pure/Effect
split lets reviewers ask a single question — "is this in a pure-layer
file?" — instead of arguing whether a given side effect is justified.

### VI. State Management (NON-NEGOTIABLE)

Eight Redux slices, one purpose each. RTK Query for all IPC. Listener
middleware for cross-domain effects. Selectors are the only way UI
reads composite state.

Slices:

1. **`ui`** — transient view state, in-memory only. Modals, dropdowns,
   activity rail current visibility, popovers.
2. **`preferences`** — persisted via `electron-store` through a
   debounced `preferencesPersister` listener. Accent, density,
   activity rail default side and default visibility, LRU of recent
   repos, persisted model id.
3. **`auth`** — state machine for the three auth prerequisites:
   GitHub CLI, Copilot CLI, Atlassian (OAuth via system browser to a
   localhost callback). Includes identity (`username`, `avatarUrl`),
   per-prerequisite status, and last error.
4. **`workspace`** — `{repo, branch}` only. The navigation pointer.
   Org name is a v1 constant (`"collette-travel"`), not a slice field.
5. **`steps`** — the canonical step state machine: per-step status
   (`not_available` / `pending` / `complete`), the single `pending`
   step, and `viewing` (which step's UI the user has open).
   Invariants: exactly one `pending` step; status transitions are
   monotonic forward unless explicitly reset via Step Escape Hatch;
   `viewing ≤ pending` in display order. Step state is recomputed
   from disk on every Session start.
6. **`session`** — per-branch work-in-progress: `prompt`, `specMd`
   in-memory copy, `clarify.answers` (including `malformed` records
   from Clarify Re-ask), `clarify.extraQuestions`, and `pipelines` for
   `plan`, `tasks`, `analyze`, and `tojira`. Per-branch session blobs
   persist to disk so close/reopen drops the user back exactly where
   they left off.
7. **`activity`** — ring buffer of LogEntry, ambient `busy`, and
   `current` status string. Stream-fed from ACP `session/update` events
   via a subscription pipeline. Display-only — never read for state
   decisions. Activity rail auto-opens once per session on the first
   `err` entry; user can re-close and override via `preferences`.
8. **`copilot`** — currently-selected model id. Mirrors into
   `preferences` for persistence.

RTK Query APIs (all wrap `ipcRenderer.invoke` via a shared `baseQuery`
that returns `{data}` or `{error: {code, message}}` with a typed error
code enum: `AUTH_REQUIRED`, `NETWORK`, `CLI_TIMEOUT`, `GIT_DIRTY`,
`MCP_NOT_CONFIGURED`, `JIRA_FORBIDDEN`, `STEP_CONTRACT_VIOLATION`,
`UNKNOWN`):

- `authApi` (`auth:status`, `auth:gh:login`, `auth:gh:logout`,
  `auth:copilot:login`, `auth:copilot:logout`, `auth:atlassian:login`,
  `auth:atlassian:logout`) — tag `["AuthStatus"]`.
- `reposApi` (`repos:list`, `repos:refresh`) — tag `["Repos"]`.
- `branchesApi` (`branches:sessions`, `git:checkout`,
  `git:createDraft`) — tag `["Branches:repo"]`.
- `sessionApi` (`session:load`, `session:save-spec`).
- `acpApi` (`acp:runStep`, `acp:cancelTurn`,
  `acp:setModel`) — one mutation per step type, streaming via
  `onCacheEntryAdded` that pushes activity log lines and updates
  `session.pipelines.<step>`.
- `clarifyApi` (`clarify:next`, `clarify:answer`,
  `clarify:reaskMalformed`, `clarify:askAnother`, `clarify:commit`).
- `artifactsApi` (`artifact:read`) — cached per
  `{repo, branch, path}`, invalidated on any mutation that touches the
  path.
- `tasksDetailApi` (`tasks:detail`) — per-task expand modal data.
- `copilotApi` (`copilot:models`, `copilot:set-model`).
- `jiraApi` (`jira:loopCreateAndVerify`, `jira:syncedRecord`) — drives
  the deterministic outer loop in the main process; renderer dispatches
  the loop start and observes per-ticket pipeline state in
  `session.pipelines.tojira`.
- `bugReportApi` (`concierge:report`).
- `mcpConfigApi` (`mcp:config:check`, `mcp:config:fix`) — detects
  whether the Bound CLI's MCP config has the required servers and
  writes the missing entry idempotently.
- `electronApi` (`app:version`, `app:open-external`,
  `app:save-file-dialog`, `app:export-debug-log`).

Listener middleware (the only legal cross-slice coordination):

- `activityLogger` — translates RTK Query mutation lifecycle and ACP
  stream notifications into LogEntry rows.
- `pipelineProgressLogger` — translates streaming `acp:runStep`
  events into pipeline row updates plus `activity.current` and
  `activity.busy`.
- `stepAdvancer` — the only writer of `steps/STATUS_UPDATE` actions
  that promote a step from `pending` to `complete` and the next step
  from `not_available` to `pending`. Fires on `after_<step>` hook
  success acks.
- `stepEscapeHatch` — handles the canonical step recovery flow on
  any failure mode action.
- `clarifyMalformationLogger` — on each Clarify Re-ask, writes a
  structured malformation record to disk and to `activity`.
- `branchCreator` — on Specify pipeline start while
  `workspace.branch === null`, fires `branchesApi.createDraft` first
  and queues the Specify run.
- `preferencesPersister` — debounced (250 ms) write of `preferences/*`
  changes to `electron-store`.
- `sessionPersister` — per-branch session blob write.
- `authBootstrap` — on app launch, queries auth status for all three
  prerequisites; once all three are `ok`, prefetches `reposApi.listOrgRepos`.
- `repoSwitchCleanup` — on `workspace.repo` change, invalidates
  branch + session data scoped to the prior repo.
- `modelLogger` — on `copilotApi.setModel/fulfilled`, appends activity
  log line.
- `externalLinkOpener` — routes any action with `meta.external: true`
  through `electronApi.openExternal` (security: never `window.open`).
- `activityAutoOpener` — on first `err` entry per session, dispatches
  `ui/activityRail/visible = true` if the user hasn't already
  overridden.
- `stepsRestoredFromDisk` — on `workspace.repo` or `workspace.branch`
  change (or app launch with restored Session), reads git history,
  computes the status map from `Concierge-Step:` trailers, and
  dispatches `steps/restored`.
- `hangDetector` — watches `session.pipelines` for 20 minutes of no
  progress events; emits a soft notification suggesting cancel/restart.
  No auto-fail.
- `mcpConfigChecker` — on app launch and on `workspace.repo` change,
  fires `mcpConfigApi.check` and surfaces "click to fix" in `auth` if
  Atlassian MCP is missing.

Selectors:
- Co-located with their slice by default; split into `selectors.ts`
  when a slice has ≥5 selectors or any of them require `createSelector`.
- `createSelector` (from `@reduxjs/toolkit`) mandatory for any
  selector returning a fresh array, object, or computed value.
- `createEntityAdapter` for any slice modeling a collection with
  stable IDs (none in v1's eight slices — collections live in RTK
  Query caches).
- Components MUST NOT read raw slice fields. They use named selectors.
  Lint or review enforces this.

Persistence boundary:

| `electron-store` (persists) | Per-Session blob (disk) | In-memory only |
|---|---|---|
| `preferences.*` | `session.*` keyed by `${repo}#${branch}` | `ui.*`, `activity.*`, RTK Query cache, `auth.*`, `workspace.*`, `steps.*` (rebuilt from disk on Session start) |

Rationale: One state-machine per slice. RTK Query owns everything
that crosses the IPC boundary or comes from outside. Listeners are the
only legal place for cross-slice coordination, so race conditions
have one home. Selectors are the only API for reads, so the slice
shape is free to evolve without churning components.

### VII. Step Lifecycle and Recovery (NON-NEGOTIABLE)

Every step's lifecycle is owned by the spec-kit `before_<step>` and
`after_<step>` extension hooks registered in `.specify/extensions.yml`.
The Concierge App is the implementation of those hooks.

Rules:
- `before_<step>` validates prerequisites (auth, prior step commits,
  MCP config presence) and may inject context.
- `after_<step>` reads the step's expected artifacts from disk,
  validates them against the Step Contract factory, and:
  - on pass → creates a single Step Commit with the `Concierge-Step:`
    trailer and dispatches `stepAdvancer` to promote step status;
  - on fail → triggers the Step Escape Hatch.
- The per-step expected-artifact manifest is derived from spec-kit's
  installed agent files. v1 hard-codes the table; a startup
  verification reads each `.github/agents/speckit.*.agent.md` and
  warns if declared outputs drift from the hard-coded list.
- Plan's Step Commit also touches `.github/copilot-instructions.md`
  per spec-kit's plan agent intent.
- Analyze commits with `--allow-empty` if no diff resulted, so the
  `Concierge-Step:` trailer history is unbroken and resume can read
  it deterministically.
- The Bound CLI is forbidden from making git commits during step
  execution. Pre-commit hooks on the repo are honored; if a hook
  rejects a Concierge-emitted commit, the step transitions to the
  Step Escape Hatch with the hook output surfaced. No `--no-verify`.
- Mid-step model swap is forbidden. Model can change only when the
  step's status is `not_available` or `complete`, never `pending`-and-
  running. The top-bar model picker disables during a running step.
- Workspace Dirty Resume: on Session start, if the Workspace has
  uncommitted changes to the current step's expected artifacts, the
  Concierge App invokes the Bound CLI to resume from that disk state
  instead of reverting or committing.
- Hang detection: 20 minutes of ACP-stream silence triggers a soft
  user notification suggesting cancel/restart. No auto-fail.

Rationale: spec-kit's hook seam is the published integration surface.
Leaning on it gives deterministic step lifecycle, eliminates
log-scraping flakiness, and makes the Concierge App's responsibility
small and well-bounded: validate, commit, recover.

### VIII. Step Contracts and the Clarify Rigor Mandate

Every step ships a Zod schema for its expected artifacts. The
`after_<step>` hook runs the schema; rejection triggers the Step
Escape Hatch.

Rules:
- Spec, plan, tasks, analyze contracts validate the artifact files
  exist with required fields, frontmatter, and section headings.
- The Clarify contract is the strictest. Every `ClarifyQuestion`
  written to `spec.md`'s `## Clarifications` section MUST satisfy:
  - non-empty `questionText`, trimmed, LF-normalized;
  - ≥2 `choices`, each with non-empty key (`A`/`B`/`C`/...) and label;
  - short-answer affordance present in the rendered UI (data shape
    permits a `note` field per answer);
  - no leading `*` markdown emphasis that would confuse parsers;
  - no CRLF / mixed line endings in the section.
- A failed Clarify contract on a specific question routes through the
  Clarify Re-ask UI affordance, not the full Step Escape Hatch. The
  Concierge App logs a structured malformation record
  (`{questionId, malformationCategory, rawOutput, timestamp, modelId}`)
  to a disk-backed log and to the `activity` slice, then re-prompts
  the Step Agent for that one question.
- Malformed questions render visibly malformed (red border,
  annotation) — never silently broken or hidden.

Rationale: Clarify is the only HITL step with intra-step state, and
its real-world failure modes have been observed. Hardening one
factory is cheaper than building a general-purpose retry layer.

### IX. Driveable by External Agents

The Concierge App exposes a localhost HTTP API on a random port
written to the Electron `userData` directory at launch, gated by a
per-launch token written alongside the port file with `0600` perms.
Every action available to a human user is available via the API,
gated by the same Session state machine. The GUI mirrors external-
agent activity in real-time, indistinguishable from a human click
sequence.

Rules:
- The HTTP API and the human UI dispatch into the same Redux store
  through the same actions and the same IPC handlers. There is no
  alternative path.
- Every endpoint is typed (Zod request and response schemas) and
  versioned at the path level (`/v1/...`).
- Streaming subscriptions use Server-Sent Events.
- v1 ships HTTP only. MCP compatibility is not v1; if it becomes
  worth shipping, it arrives as a thin MCP-to-HTTP adapter over the
  existing API.
- Endpoints (informative, not exhaustive — final list lives in
  `docs/api.md`):
  - `GET /v1/status` — Session, step, Workspace, auth, model.
  - `GET /v1/spec` — current `spec.md`.
  - `GET /v1/evidence` — committed artifacts on the current branch
    with `Concierge-Step:` trailer mapping.
  - `GET /v1/activity?since=<seq>` — paginated log slice.
  - `GET /v1/activity/stream` (SSE) — live activity events.
  - `POST /v1/session/start` — `{repo, branch?}`. Only valid when no
    active Session or when the active Session is at `review` and
    complete.
  - `POST /v1/session/resume` — `{repo, branch}`.
  - `POST /v1/specify/begin` — `{promptText}`. Only valid when
    `steps.pending === 'specify'` and prompt is unsubmitted.
  - `POST /v1/clarify/answer` — `{qid, choice, note?}`. Only valid
    when `steps.pending === 'clarify'` and `qid` matches the currently
    surfaced question.
  - `POST /v1/clarify/reaskMalformed` — `{qid, malformationCategory}`.
  - `POST /v1/clarify/askAnother`.
  - `POST /v1/step/advance` — promotes the pending step if its Step
    Contract has passed.
  - `POST /v1/step/retry` — fires the Step Escape Hatch.
  - `POST /v1/step/run` — `{step}`. Only valid when `step ===
    steps.pending` and the step has not yet been invoked on this
    branch.
  - `POST /v1/jira/submit` — fires the JIRA Submission outer loop.
  - `POST /v1/support/report` — submit a Support Request.

Rationale: One state machine, two consumers. Internal-tool
verifier-agent E2E tests are real driveability tests because they
exercise the same paths a human exercises.

### X. MCP Posture (Observer-Only, v1)

The Bound CLI is the MCP host. The Concierge App is not. The
Concierge App's only MCP responsibility is detecting whether the
Bound CLI's MCP configuration includes the required MCP servers and
offering a one-click "fix" affordance to write them.

Rules:
- v1 required MCP set: Atlassian MCP only.
- The Concierge App reads the Bound CLI's MCP config on launch and on
  Workspace change. If Atlassian MCP entry is missing, the auth
  surface shows a "Atlassian MCP not configured — click to fix"
  affordance that idempotently writes the entry without disturbing
  user-managed entries.
- The Concierge App never speaks to Atlassian (or any service) over
  MCP directly. All MCP traffic flows through the Bound CLI.
- Activity stream surfaces every MCP tool call the Bound CLI makes as
  a summarized one-liner (tool name + brief target). Full payloads
  are written to a disk-backed debug log.
- Plugin architecture for additional MCPs is post-v1. Code is
  structured to make adding additional MCPs a config + manifest
  change. When the MCP count reaches ≥2, a dedicated `mcp` slice
  replaces the `auth.atlassian` field.

Rationale: Atlassian is the only external service v1 needs; the
Concierge App's responsibility is bounded to "make sure the Bound CLI
can reach what it needs," not "be a generic MCP client."

### XI. JIRA Submission (Concierge-Orchestrated Outer Loop)

The Send-to-JIRA action on the Review step uses a customized spec-kit
JIRA extension agent — installed from the spec-kit extensions
marketplace, customized to scope each invocation to a single ticket
with on-disk verification.

Rules:
- The Concierge App owns the deterministic outer loop. For each task
  in `tasks.md`:
  1. If the task already has a verified entry in the stateful record
     file (`specs/<branch>/jira-tickets.json` or whatever the
     extension names it), skip.
  2. Otherwise, invoke the per-ticket agent through ACP.
  3. The agent calls Atlassian MCP to create the ticket, verifies the
     ticket is not a duplicate, and writes the result to the stateful
     record file.
  4. The Concierge App reads the stateful record after the agent
     finishes and verifies the expected delta (one new verified entry
     for this task).
  5. On match, the loop advances. On mismatch, the loop halts and the
     Review UI surfaces the discrepancy with a retry affordance.
- Idempotent on resume: if the app crashes mid-loop, the outer loop
  reads the stateful record on relaunch and skips already-verified
  tasks. No duplicate tickets.
- The celebration screen reads from the stateful record, not stream
  events.
- The Concierge App never speaks to Atlassian directly.
- Same pattern generalizes to future per-unit external-service
  integrations.

Rationale: The Concierge App owns deterministic iteration and
idempotency without owning JIRA logic. The agent + MCP do all
external calls. The stateful record is the visible source of truth
for both UI and recovery.

### XII. Smart / Dumb Component Separation

All React features follow the Smart / Dumb pattern. Business logic is
separate from presentation logic.

Rules:
- Smart components own data fetching (via RTK Query hooks), store
  access (via `useAppSelector` and selectors), dispatch, workflow
  branching, and non-trivial data transformation before values reach
  presentational components.
- Dumb components receive already-prepared data and callbacks through
  props. Dumb components MUST NOT call RTK Query hooks, read from the
  store, or contain spec-kit-flow-specific decision trees.
- When a component mixes orchestration with substantial JSX, extract
  the render-only region into a dumb component and keep the smart
  wrapper focused on coordination.
- Dumb components are reusable across routes and scenarios — they're
  shaped by UI concerns, not page-specific behavior.
- Business logic shared across smart components lives in hooks,
  factories, utilities, or selectors — never reimplemented inside
  dumb components.
- Tests for dumb components target rendered output, accessibility,
  and emitted events from props. Tests for smart components target
  state orchestration and business behavior.

Rationale: The split keeps business rules centralized, presentational
components reusable, and the UI layer decoupled from data ownership.

### XIII. React Effects Discipline (NON-NEGOTIABLE)

`useEffect` is used only to synchronize with systems outside React.
Before adding `useEffect`, the author applies this decision tree and
chooses the narrowest mechanism.

Rules:
1. If the code synchronizes with something outside React (network,
   subscription, browser API, timer, external widget) — use `useEffect`.
2. If the logic is triggered by a user action — use an event handler.
3. If a value can be derived from props or state — compute it during
   render. For expensive derivations use `useMemo`.
4. If state is mirrored or reset when props change — derive during
   render, or for resets on specific transitions use a reducer or
   change the component `key`.
5. If notifying a parent or external store — call directly in the
   event handler, not from `useEffect`.
6. If fetching data tied to lifecycle or parameter changes — use RTK
   Query (default for the Concierge App) or `useEffect`.
7. If code must run once when the component appears — `useEffect`
   with an empty dependency array.
8. If code must read or mutate layout before paint — `useLayoutEffect`.
9. If styles must be injected before layout — `useInsertionEffect`.
10. If none of the above apply — no effect is needed.

- Effects declare accurate dependencies and clean up subscriptions,
  timers, and external listeners when the synchronization ends.
- Effects stay small and single-purpose. Business logic, derived
  values, and event-driven flows stay outside effect hooks.
- ACP stream subscription lives in exactly one place: the listener
  middleware's `pipelineProgressLogger` (which dispatches into Redux),
  not in components. Components never subscribe to ACP directly.

Rationale: Misused effects create duplicated state, hidden control
flow, and avoidable re-renders. Restricting effects preserves the
Concierge App's "one state machine, two consumers" guarantee.

### XIV. Accessibility (WCAG 2.1 AA)

All UI follows current W3C accessibility standards including WCAG 2.1
AA and uses ARIA per the WAI-ARIA Authoring Practices. Accessibility
is a baseline quality requirement, not optional.

Rules:
- Semantic HTML first; ARIA roles, states, and properties added only
  when native semantics don't provide the required behavior.
- All interactive UI fully operable with a keyboard — logical tab
  order, visible focus indicators, no keyboard traps.
- Every form control has an accessible name, an associated label,
  clear instructions when needed, and programmatically associated
  error messaging.
- Images and non-text content provide meaningful alt text unless
  decorative (then hidden from AT).
- Color is never the sole means of conveying meaning. Text and
  interactive controls meet W3C contrast requirements. The
  three-state orb stepper provides text labels alongside color.
- Dynamic UI changes (validation errors, loading states, dialogs,
  status updates, malformed-clarify-question announcements) are
  announced appropriately via ARIA live regions.
- Heading structure, landmark regions, and document titles communicate
  document structure for screen-reader navigation.
- Custom widgets (orb stepper, three-state controls, modals, OAuth
  flows) follow the relevant WAI-ARIA Authoring Patterns completely.

Rationale: The Concierge App is used inside an organization with
diverse needs. Baseline accessibility is non-negotiable.

### XV. Structured Observability

Observability is not optional in production builds.

Rules:
- Structured logger (`pino` or equivalent) in `main/logger.ts` with
  fields `{ts, level, type, sessionId, stepId?, modelId?, ...}`. No PII.
- Logs roll to a file under the Electron `userData` directory and
  stream into the renderer's activity log via IPC.
- Every IPC handler, every ACP turn, every step lifecycle transition,
  every MCP tool call summary, every Clarify malformation event, and
  every error has a structured log line.
- `console.log` is prohibited in production code paths.
  `console.warn` / `console.error` allowed only in unreachable
  default branches. ESLint enforces.
- v1 ships local-only logging. No telemetry vendor. The "Export
  activity log" gear-menu action writes the stripped log to disk.

Rationale: A desktop app driving long-running CLI sessions needs
structured logs to be debuggable at all. Local-only keeps the user
in control of their data.

### XVI. Spec-kit Discipline

The Concierge App uses spec-kit on itself.

Rules:
- Non-trivial changes go through `spec/NNNN-*` branches with full
  spec-kit artifacts committed before implementation.
- `/speckit.constitution` amendments require a PR labeled
  `constitution-change` with at least one non-author reviewer
  approval.
- The bundled spec-kit `Full SDD Cycle` workflow YAML is the
  authoritative workflow; modifications are made in place and
  committed.

Rationale: Eat the dogfood. If the flow doesn't work for our own
codebase, it doesn't work for users.

## Stack & Coding Standards

- Runtime: Electron LTS, Node 22+ in `main/`.
- Language: TypeScript strict. No `any` without a comment citing the
  reason.
- Renderer build: Vite + `@vitejs/plugin-react`.
- Packaging: Electron Forge. v1 ships Windows installer (NSIS or
  Squirrel maker — final choice in plan step). macOS and Linux are
  dev-from-source only in v1.
- Auto-update: deferred. Users manually download new versions when
  notified.
- UI: React 18 (function components only), Redux Toolkit with RTK
  Query, custom hooks. No other state library.
- Styling: design tokens from `design/project/styles.css` carried over
  (teal accent `#3a7e9a` / `#132f3b` dim, three-state orb palette,
  near-black surfaces). The `design/` directory is the v2 canonical
  bundle; `design/legacy/` holds the earlier v1 prototype for
  historical reference only. No CSS-in-JS runtime in v1.
- Linting: ESLint with `@typescript-eslint`, `eslint-plugin-react`,
  `eslint-plugin-functional`, and project-local rules enforcing the
  Pure / Effect layer boundary and the `console.log` prohibition.
- Formatting: Prettier. CI rejects unformatted code.
- Local skills attached to this repo: `tdd` (mandatory for new
  logic), `grill-with-docs` (planning sessions), `impeccable`
  (frontend craft). These are normative within their scopes.

## Testing Discipline (NON-NEGOTIABLE)

TDD is mandatory for new logic: failing test first → user approval
→ watch it fail → implement → refactor.

Stack:
- Unit and component tests: Vitest + React Testing Library.
  Co-located as `*.test.ts(x)` next to the module under test.
- E2E tests: Playwright driving Electron via `_electron` API. Tests
  live in `e2e/`.
- Coverage gate: 85% line coverage via `npm run test:coverage`. CI
  blocks merges that drop below. ACP-layer coverage strategy
  deferred; a carve-out for `main/data-layer/acp/` (covered by
  recorded-transcript contract tests rather than line coverage) may
  be added when we reach that work.

Rules:
- Failing tests are not committed. `it.skip` / `test.skip` requires a
  linked issue ID in the skip message.
- Tests target public behavior, not implementation. `data-testid` for
  DOM selection. Dependency Injection (props, context, factory args)
  over module-level mocks where practical.
- Every `.ts` / `.tsx` module with logic has a co-located test file.
- Tests are deterministic, isolated, and runnable via `npm test`.
- ACP adapter, IPC bridge, and HTTP API contract tests replay
  recorded JSON-RPC transcripts and HTTP fixtures against the live
  surfaces.
- E2E covers: auth flow for all three prerequisites; first-run sign-in
  + repo picker; new-session Specify→Review run; resume from mid-step
  with a Workspace Dirty Resume; Clarify Re-ask of a malformed
  question; JIRA Submission outer loop with one verified failure and
  recovery; external-agent driving the same full flow over the HTTP
  API and observing the GUI mirror in real-time.

## Development Workflow

- Branch naming: `spec/NNNN-<slug>` for spec-kit work,
  `chore/<slug>` / `fix/<slug>` otherwise.
- Every PR MUST:
  - Pass `npm run lint`, `npm run typecheck`, `npm test`,
    `npm run test:coverage` (≥85%), `npm run e2e`.
  - Include or update a co-located unit test for any logic change.
  - Include a "Constitution impact" section in the description
    (`none` is acceptable).
- Customizations to spec-kit-installed agent files (e.g., a JIRA
  extension agent) are tracked in version control and explicitly
  re-applied after extension upgrades.
- Dependencies pinned to exact versions in `package.json`.
  `npm audit --audit-level=high` clean in CI.
- Commits authored by the Concierge App's `after_<step>` hooks use
  the user's git identity with a `Concierge-Step: <step>` trailer.
  No synthetic author. No `--no-verify`.

## Governance

This constitution supersedes ad-hoc practices. When a principle is in
tension with shipping, the principle wins or the constitution is
amended — not silently violated.

Amendments:
- Filed as a PR touching this file, labeled `constitution-change`.
- Require approval from at least one contributor other than the
  author.
- Semver: MAJOR for principle removals or incompatible reframings,
  MINOR for new principles or material expansions, PATCH for
  clarifications and typo fixes.
- The amending PR description includes a Sync Impact Report listing
  every downstream template, agent file, or workflow touched.

Runtime guidance for contributors lives at
`.specify/memory/CONTRIBUTING.md` (authored in the first plan step
that needs it). PR review comments cite the principle they invoke by
number.

**Version**: 1.0.1 | **Ratified**: 2026-05-21 | **Last Amended**: 2026-05-22

### Amendment history

- **1.0.1** (2026-05-22) — PATCH: corrected the design tokens path in
  Stack & Coding Standards (`design/spec-kit-concierge-2/styles.css`
  → `design/project/styles.css`) and named the v1 prototype's location
  (`design/legacy/`). No principle change.
