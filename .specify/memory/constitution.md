# Spec-kit Concierge Constitution

> Electron desktop application that hosts the six-stage Concierge flow
> (Specify → Clarify → Plan → Tasks → Analyze → Review) for the
> `collette-travel` GitHub organization. Five stages map to spec-kit
> canonical Step Agents (`specify`, `clarify`, `plan`, `tasks`,
> `analyze`); Review is the Concierge-app surface that hosts evidence
> review and invokes the spec-kit JIRA extension. The app drives a
> Bound CLI (GitHub Copilot CLI in v1, any ACP-compliant CLI later)
> over the Agent Client Protocol and exposes every human action
> through a localhost HTTP API so external agents can drive the app
> the same way a human does.

This constitution is law. Roadmap inventory, vendor choices, version
pins, file names, endpoint lists, and v1 implementation specifics live
in `ROADMAP_DECISIONS.md`. When the two conflict, this constitution
wins. When this constitution conflicts with `.github/agents/speckit.constitution.agent.md`
or any other agent prompt, this constitution wins and the agent file
is updated in the same amendment.

## Core Principles

### I. Layered Architecture (NON-NEGOTIABLE)

The renderer holds UI, navigation, and per-session work-in-progress.
The main process holds all I/O — git, filesystem, child processes, ACP
client, localhost HTTP server. They communicate exclusively through
the IPC bridge.

```
┌──────────────────────────────────────────────┐
│  Renderer                                    │
│  UI · navigation · session work-in-progress  │
└──────────────────┬───────────────────────────┘
                   │ IPC bridge (typed, validated)
                   ▼
┌──────────────────────────────────────────────┐
│  Main                                        │
│  git · fs · child processes · ACP · HTTP     │
└──────────────────────────────────────────────┘
```

Rules:
- Renderer code MUST NOT import Electron APIs, Node built-ins,
  child-process modules, git libraries, or filesystem libraries.
  Renderer reaches I/O only through IPC handlers and the RTK Query
  API surface that wraps them.
- Main-process code MUST NOT import React, Redux, or any renderer
  module.
- Every IPC handler MUST validate its renderer payload with a schema
  before passing it to the data layer.
- Filesystem writes go through typed helpers that log the target path
  and calling Step context before writing.
- ACP wire I/O lives only in the dedicated ACP data-layer module;
  nothing outside that module spawns or speaks to a coding-agent CLI
  directly.

Rationale: A bright IPC boundary keeps the renderer testable without
Electron, keeps the main process replaceable by a headless driver
(the verifier agent), and structurally enforces disk-as-truth.

### II. Disk Is Truth (NON-NEGOTIABLE)

The state of record for a Session lives on disk: git history,
`Concierge-Step:` trailers, the per-step artifacts under the feature
directory, and any external-service stateful record files. The
renderer caches a derived view of that truth. On every Session start,
on every branch switch, and on resume, the renderer's step state is
recomputed from disk — never restored from a serialized memory blob.

Rules:
- No renderer state slice serializes itself to disk as the canonical
  record of step completion. Resumable drafts (prompt text, in-flight
  clarify answers) may be persisted, but never establish step
  completion.
- A `Concierge-Step: <step>` git trailer is the only valid proof a
  step is complete. The `after_<step>` extension hook is the only
  writer of those commits; the Bound CLI is forbidden from making git
  commits during step execution.
- When renderer cache and disk disagree (manual git operation,
  external-agent write, app crash), disk wins on re-read. The
  renderer re-reads at every Session start.
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
- The Bound CLI interface is a single typed `CodingAgent` surface
  inside the ACP data-layer module. No code outside that module
  spawns a coding-agent binary.
- A Bound CLI adapter is a thin process supervisor that (a) spawns
  the binary with the documented ACP flags, (b) speaks JSON-RPC 2.0
  over stdin/stdout, (c) emits typed agent events, (d) exposes
  capability discovery so the UI hides features the current Bound
  CLI does not support.
- The supported Bound CLI set is data, not code: a JSON manifest
  lists each agent's binary, args, capability flags, and permission
  grant. Adding a new ACP-compliant agent requires a manifest entry
  plus contract tests against recorded ACP transcripts.
- Non-ACP CLIs are out of scope as Bound CLIs. A CLI that is itself
  an ACP client (rather than an ACP agent) cannot be used as the
  Bound CLI until it ships an ACP-agent surface.
- The Bound CLI runs without per-tool permission prompts; the per-CLI
  unrestricted-mode flag is declared in the manifest.
- Model selection flows through ACP session messages, never through
  shell-level CLI configuration commands. Model swap is allowed only
  between steps — when the current step's status is `not_available`
  or `complete`, never `pending` and running. The top-bar model
  picker disables during a running step. If the ACP method for model
  swap is unstable in a given runtime, the fallback is to restart
  the Bound CLI process with the new model selected via launch flag.
- CLI swap (binding a different ACP-compliant CLI) is forbidden
  mid-Session. Changing the Bound CLI ends the Session.

Rationale: ACP is the published cross-vendor standard. Building
against it once gives us substitutability across every ACP-compliant
agent (Codex, Gemini, OpenCode, Kimi, Qwen, Junie, etc.) and keeps
the swap claim provable through transcript contract tests.

### IV. Factory-First Data Transformation

Every payload that enters the renderer (from IPC, ACP, FS, or HTTP)
MUST pass through a factory before any consumer sees it.

Rules:
- Factories accept `unknown` with a type guard and return a
  fully-typed shape with safe defaults.
- Defensive coercion helpers (string, number, boolean, date,
  HTML-strip, line-ending-normalize) are co-located with the factory
  module; ad-hoc casts inside factories are forbidden.
- Each factory has co-located unit tests covering happy path, empty
  `{}` input, partial input, and at least one malformed-type case.
- The Clarify factory is the strictest. A malformed clarify question
  never renders raw; it surfaces through the Clarify Re-ask UI
  affordance.

Rationale: ACP events, git outputs, external-service stateful
records, and HTTP API payloads all evolve independently of our
release cadence. Factories are the contract seam that absorbs that
drift.

### V. Scoped Functional Programming

All TypeScript follows functional discipline; ESLint enforces it.
Layers are tagged as Pure or Effect.

Pure layers (domain, selectors, derived-state hooks, all factories):
- `const` over `let`/`var`; no `var`.
- No mutation of inputs; return new values.
- No reliance on or modification of external state inside the function.
- Non-mutating array methods over loops.
- `as const` or `Object.freeze` for non-mutated objects.
- Functional composition over inheritance.
- React function components only.
- Classes only for third-party interop (schema validators, builder
  patterns).

Effect layers (Electron bootstrap, IPC handlers, data-layer modules,
renderer entry point, RTK slice files, RTK Query baseQuery
implementations):
- Side effects are confined to identified files.
- A pure-layer file may not import from an effect-layer module
  directly — only from its transform / factory partner.
- Redux Toolkit's Immer-backed mutative syntax inside `createSlice`
  reducers is considered pure: Immer produces immutable outputs; the
  mutative syntax is presentation only.

Rationale: Predictable, testable, composable code. The Pure/Effect
split lets reviewers ask one question — "is this in a pure-layer
file?" — instead of arguing whether a given side effect is justified.

### VI. State Management (NON-NEGOTIABLE)

Renderer state architecture follows one shape:

- **Redux Toolkit slices** own all renderer-local state. One state
  machine per slice; reducers perform no I/O.
- **RTK Query** owns every renderer interaction that crosses the IPC
  boundary. A shared typed `baseQuery` wraps IPC invocation, returns
  `{ data }` or `{ error: { code, message } }` with a typed error
  code enum, and exposes typed hooks to smart components.
- **Streaming step execution** uses RTK Query lifecycle primitives
  (`onCacheEntryAdded` or equivalent). Components MUST NOT subscribe
  to ACP streams directly.
- **Listener middleware** is the only legal place for cross-domain
  renderer effects: step advancement, persistence writes, activity
  logging, branch/session cleanup, model-change logging, auth
  bootstrapping, MCP-config checks, hang detection, recovery
  orchestration, external-link opening.
- **Selectors** are the composite read API. Components read named
  selectors or RTK Query hooks; they never read raw multi-slice
  state. Selectors returning fresh objects, arrays, or computed
  values use memoization.
- **Thunks are discouraged.** Cross-domain coordination belongs in
  listener middleware; IPC-crossing async belongs in RTK Query.
  Introducing or materially expanding a Redux thunk requires a
  "Constitution impact" note in the pull request explaining why
  listener middleware or RTK Query was insufficient.
- **`createEntityAdapter`** is used for any slice modeling a
  collection with stable IDs.
- **No other state library** in v1. No Zustand, Jotai, MobX, React
  Query, Apollo Client, or ad-hoc event bus.

Slice inventory, RTK Query API inventory, listener inventory, and
the persistence boundary table live in `ROADMAP_DECISIONS.md`.

Rationale: One state-management stack, one IPC data-fetching
primitive, one cross-domain effect primitive, and one composite-read
API keep renderer behavior auditable. The constitutional law is the
ownership boundary; the exact inventory is roadmap material that
evolves without amendment.

#### VI-A. URL-Based Navigation State (Amendment)

Navigation state—specifically, which screen is displayed and which
step is active—is owned by the URL via React Router's
`createMemoryRouter`. This is the sole permitted exception to
"Redux Toolkit slices own all renderer-local state."

Ownership rules:

- **URL owns**: current route path (`/sign-in`, `/repos`,
  `/workspace`) and query parameters (`?step=<StepName>`).
- **Redux owns**: all domain state (auth status, workspace
  selection, step availability, session data). Redux never reads
  from the URL.
- **Navigation listener** (listener middleware) is the unidirectional
  bridge. It watches Redux state changes and calls
  `router.navigate()` to synchronize the URL. It always uses
  `replace: true` to prevent history stack growth.
- **Route guards** (layout route components) enforce invariants
  declaratively: `AuthGuard` redirects to `/sign-in` when the auth
  gate is closed; `WorkspaceGuard` redirects to `/repos` when no
  workspace is active.
- **Components** may read URL state via React Router hooks
  (`useSearchParams`, `useParams`) for presentation decisions
  (e.g., which step panel to render). They dispatch Redux actions
  to request navigation; they never call `router.navigate()`
  directly.
- **Back/forward** browser navigation is disabled in Electron
  (`before-input-event` blocks Alt+Arrow). The memory router has
  no address bar. Users navigate exclusively through UI controls
  that dispatch Redux actions.

Introducing additional URL-owned state (new query params, path
segments, or hash fragments) requires a "Constitution impact" note
in the pull request explaining why Redux ownership was insufficient.

### VII. Step Lifecycle and Recovery (NON-NEGOTIABLE)

Every step's lifecycle is owned by the spec-kit `before_<step>` and
`after_<step>` extension hooks. The Concierge App is the
implementation of those hooks.

Rules:
- `before_<step>` validates prerequisites (auth, prior step commits,
  MCP config presence) and may inject context.
- `after_<step>` reads the step's expected artifacts from disk,
  validates them against the Step Contract factory, and on pass
  emits a single Step Commit with the `Concierge-Step:` trailer; on
  fail it triggers the Step Escape Hatch.
- The per-step expected-artifact manifest is derived from spec-kit's
  installed agent files. The manifest is enumerated in
  `ROADMAP_DECISIONS.md`; a startup verification parses the installed
  agent files and warns if their declared outputs drift from the
  manifest.
- The Plan step's commit MAY include modifications to a Bound-CLI
  context file outside the feature directory (e.g., the agent's
  per-repo instructions file). This single exception is permitted
  because spec-kit's plan agent writes the plan path into that file
  by design.
- The Analyze step commits with `--allow-empty` if no diff resulted,
  so the `Concierge-Step:` trailer history remains unbroken and
  resume can read it deterministically.
- The Bound CLI is forbidden from making git commits during step
  execution. Pre-commit hooks on the repo are honored; if a hook
  rejects a Concierge-emitted commit, the step transitions to the
  Step Escape Hatch with the hook output surfaced. `--no-verify` is
  forbidden.
- Workspace Dirty Resume: on Session start, if the Workspace has
  uncommitted changes to the current step's expected artifacts, the
  Concierge App invokes the Bound CLI to resume from that disk state
  rather than reverting or committing. A step-in-flight marker file
  written when a step starts and removed when it commits is the
  recovery cue.
- Step Escape Hatch is the single canonical recovery flow for all
  step failure modes (factory rejection, Bound CLI crash, ACP error,
  hook failure, malformed clarify output). The hatch cancels the
  active turn, reverts the step's expected artifacts to the last
  Step Commit, resets the step's UI state, and presents a Retry
  affordance. Retry is manual; the app never silently auto-retries.
- The Cancel control is the user-invoked Step Escape Hatch. It
  requires explicit confirmation and on confirm hard-reverts to the
  last Step Commit.
- Hang detection: extended ACP-stream silence triggers a soft user
  notification suggesting cancel or restart. No auto-fail. The
  specific threshold is configured in `ROADMAP_DECISIONS.md`.

Rationale: spec-kit's hook seam is the published integration
surface. Leaning on it gives a deterministic step lifecycle,
eliminates log-scraping flakiness, and makes the Concierge App's
responsibility small and well-bounded: validate, commit, recover.

### VIII. Step Contracts and the Clarify Rigor Mandate

Every step ships a schema for its expected artifacts. The
`after_<step>` hook runs the schema; rejection triggers the Step
Escape Hatch.

Rules:
- The Specify, Plan, Tasks, and Analyze contracts validate that
  artifact files exist with required fields, frontmatter, and section
  headings.
- The Clarify contract is the strictest. Every clarify question
  written to the spec MUST satisfy:
  - non-empty question text, trimmed, with line endings normalized;
  - at least two well-formed choices, each with a key and a label;
  - a short-answer affordance present in the rendered UI;
  - no markdown emphasis at start of line that would confuse
    parsers;
  - consistent line endings throughout the clarifications section.
- A failed Clarify contract on a specific question routes through
  the Clarify Re-ask affordance — not the full Step Escape Hatch.
  The Concierge App logs a structured malformation record (question
  id, malformation category, raw output, timestamp, model id) to a
  disk-backed log and to the activity stream, then re-prompts the
  Step Agent for that one question.
- Malformed questions render visibly malformed in the UI — never
  silently broken or hidden.

Rationale: Clarify is the only HITL step with intra-step state, and
its real-world failure modes have been observed. Hardening one
factory is cheaper than building a general-purpose retry layer.

### IX. Driveable by External Agents

The Concierge App exposes a localhost HTTP API at launch on a
randomly chosen port. The port and a per-launch authentication token
are written to the Electron `userData` directory with restricted
permissions so a local automation client can discover them. Every
action available to a human user is available via the API, gated by
the same Session state machine. The GUI mirrors external-agent
activity in real-time, indistinguishable from a human click sequence.

Rules:
- The HTTP API and the human UI dispatch into the same Redux store
  through the same actions and the same IPC handlers. There is no
  alternative path.
- Every endpoint is typed (schema-validated request and response)
  and versioned at the path level.
- Streaming subscriptions use Server-Sent Events.
- v1 ships HTTP only. MCP compatibility is not v1; if it becomes
  worth shipping, it arrives as a thin MCP-to-HTTP adapter over the
  existing API.

The v1 endpoint inventory is enumerated in `ROADMAP_DECISIONS.md`.

Rationale: One state machine, two consumers. Internal-tool
verifier-agent E2E tests are real driveability tests because they
exercise the same paths a human exercises.

### X. MCP Posture (Observer-Only)

The Bound CLI is the MCP host. The Concierge App is not. The
Concierge App's only MCP responsibility is detecting whether the
Bound CLI's MCP configuration includes the required MCP servers and
silently writing the missing entry idempotently.

Rules:
- The Concierge App reads the Bound CLI's MCP configuration on launch
  and on Workspace change. If a required MCP server entry is missing,
  the app writes it idempotently and surfaces a one-time
  informational notification ("Configured `<MCP server>` for `<Bound CLI>`").
  User-managed entries are preserved.
- The Concierge App never speaks to any MCP-hosted service directly.
  All MCP traffic flows through the Bound CLI.
- The activity stream surfaces every MCP tool call the Bound CLI
  makes as a summarized one-liner (tool name plus brief target).
  Full payloads are written to a disk-backed debug log.
- Plugin architecture for additional MCPs is post-v1. Code is
  structured so adding additional MCPs is a configuration plus
  manifest change.

The v1 required MCP set is declared in `ROADMAP_DECISIONS.md`.

Rationale: Concierge's responsibility is bounded to "make sure the
Bound CLI can reach what it needs," not "be a generic MCP client."

### XI. External-Service Submission via Concierge-Orchestrated Outer Loop

External-service submission flows (the Send-to-JIRA action on the
Review stage is the v1 instance) are owned by Concierge as a
deterministic outer loop over the unit-of-work, with the per-unit
external call delegated to a customized spec-kit extension agent
running through the Bound CLI.

Rules:
- The Concierge App owns iteration over the unit-of-work
  (per-ticket, per-issue, per-row) and the verification step between
  iterations.
- For each unit, the Concierge App invokes a single per-unit agent
  invocation through ACP. The agent calls the external service via
  MCP, verifies the result is not a duplicate, and writes its result
  to a stateful record file on disk.
- After each invocation, the Concierge App reads the stateful record
  and verifies the expected delta (one new verified entry for the
  current unit). On match, the loop advances. On mismatch, the loop
  halts and the UI surfaces the discrepancy with a retry affordance.
- The flow is idempotent on resume. If the app crashes mid-loop, the
  outer loop reads the stateful record on relaunch and skips
  already-verified units. No duplicates.
- The terminal success UI (e.g., a celebration screen) reads from the
  stateful record, not from stream events.
- The Concierge App never speaks to the external service directly.

The v1 instance (JIRA) and its specific record-file conventions are
documented in `ROADMAP_DECISIONS.md`.

Rationale: Concierge owns deterministic iteration and idempotency
without owning external-service API knowledge. The agent + MCP do
all external calls. The stateful record is the visible source of
truth for both UI and recovery.

### XII. Smart / Dumb Component Separation

All React features follow the Smart / Dumb pattern. Business logic is
separate from presentation logic.

Rules:
- Smart components own data fetching (via RTK Query hooks), store
  access (via typed selectors), dispatch, workflow branching, and
  non-trivial data transformation before values reach presentational
  components.
- Dumb components receive already-prepared data and callbacks
  through props. Dumb components MUST NOT call RTK Query hooks, read
  from the store, or contain Concierge-flow-specific decision trees.
- When a component mixes orchestration with substantial JSX, the
  render-only region is extracted into a dumb component and the
  smart wrapper stays focused on coordination.
- Dumb components are reusable across routes and scenarios — they
  are shaped by UI concerns, not page-specific behavior.
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
   subscription, browser API, timer, external widget) — use
   `useEffect`.
2. If the logic is triggered by a user action — use an event handler.
3. If a value can be derived from props or state — compute it during
   render. For expensive derivations use `useMemo`.
4. If state is mirrored or reset when props change — derive during
   render, or for resets on specific transitions use a reducer or
   change the component `key`.
5. If notifying a parent or external store — call directly in the
   event handler, not from `useEffect`.
6. If fetching data tied to lifecycle or parameter changes — use RTK
   Query (default for the Concierge App).
7. If code must run once when the component appears — `useEffect`
   with an empty dependency array.
8. If code must read or mutate layout before paint — `useLayoutEffect`.
9. If styles must be injected before layout — `useInsertionEffect`.
10. If none of the above apply — no effect is needed.

- Effects declare accurate dependencies and clean up subscriptions,
  timers, and external listeners when the synchronization ends.
- Effects stay small and single-purpose. Business logic, derived
  values, and event-driven flows stay outside effect hooks.
- ACP stream subscription lives in exactly one place: the
  centralized listener middleware that dispatches into Redux. Components
  never subscribe to ACP directly.

Rationale: Misused effects create duplicated state, hidden control
flow, and avoidable re-renders. Restricting effects preserves the
Concierge App's "one state machine, two consumers" guarantee.

### XIV. Accessibility (WCAG 2.1 AA)

All UI follows current W3C accessibility standards including WCAG 2.1
AA and uses ARIA per the WAI-ARIA Authoring Practices. Accessibility
is a baseline quality requirement, not optional.

Rules:
- Semantic HTML first; ARIA roles, states, and properties added only
  when native semantics do not provide the required behavior.
- All interactive UI is fully operable with a keyboard — logical tab
  order, visible focus indicators, no keyboard traps.
- Every form control has an accessible name, an associated label,
  clear instructions when needed, and programmatically associated
  error messaging.
- Images and non-text content provide meaningful alt text unless
  decorative (then hidden from assistive technology).
- Color is never the sole means of conveying meaning. Text and
  interactive controls meet W3C contrast requirements.
- Dynamic UI changes (validation errors, loading states, dialogs,
  status updates, malformed-clarify-question announcements) are
  announced appropriately via ARIA live regions.
- Heading structure, landmark regions, and document titles
  communicate document structure for screen-reader navigation.
- Custom widgets follow the relevant WAI-ARIA Authoring Patterns
  completely.

Specific custom-widget inventory and design-token references live in
`ROADMAP_DECISIONS.md`. The standards above are constitutional and
non-extractable.

Rationale: The Concierge App is used inside an organization with
diverse needs. Baseline accessibility is non-negotiable.

### XV. Structured Observability

Observability is not optional in production builds.

Rules:
- A structured logger emits to a file under the Electron `userData`
  directory and streams into the renderer's activity log via IPC.
- Every IPC handler, every ACP turn, every step lifecycle
  transition, every MCP tool call summary, every Clarify
  malformation event, and every error has a structured log line.
- Log lines carry at minimum a timestamp, a level, a structured
  event type, correlation identifiers where applicable, and no PII
  (no email, full name, payment data, raw tokens).
- ACP wire traffic is recorded as raw JSON-RPC transcripts at full
  fidelity for contract tests, verifier-agent E2E, and audit.
- `console.log` is prohibited in production code paths.
  `console.warn` / `console.error` are allowed only in
  unreachable-default branches. ESLint enforces.
- v1 ships local-only logging. No telemetry vendor. An "Export
  activity log" action writes the stripped log to disk on demand.

Logger choice, exact field schema, file locations, and export UI
copy live in `ROADMAP_DECISIONS.md`.

Rationale: A desktop app driving long-running CLI sessions needs
structured logs to be debuggable at all. Local-only keeps the user
in control of their data.

### XVI. Spec-kit Discipline

The Concierge App uses spec-kit on itself.

Rules:
- Non-trivial changes go through `spec/NNNN-*` branches with full
  spec-kit artifacts committed before implementation.
- Every `/speckit.specify` run MUST be preceded by a grill-with-docs
  planning cadence. The grilling session produces the prompt for the
  specify run; nothing skips it. The grilling artifact is committed
  or cited in the spec branch before implementation begins.
- `/speckit.constitution` amendments require a PR labeled
  `constitution-change` with at least one non-author reviewer
  approval.
- The bundled spec-kit workflow YAML is the authoritative workflow;
  modifications are made in place and committed.
- The Review stage hosts evidence review and invokes the spec-kit
  JIRA extension via the Bound CLI. It is a Concierge-app surface,
  not a spec-kit canonical step.

Rationale: Eat the dogfood. If the flow does not work for our own
codebase, it does not work for users.

## Stack & Coding Standards

- Language: TypeScript strict. No `any` without an inline comment
  citing the reason.
- ESLint enforces the Pure / Effect layer boundary and the
  `console.log` prohibition through project-local rules.
- Prettier formats all code; CI rejects unformatted code.
- Dependencies pinned to exact versions; security audit clean at the
  configured level in CI.
- Repo-local skills (`tdd` mandatory for new logic,
  `grill-with-docs` mandatory before every `/speckit.specify`,
  `impeccable` normative for frontend craft) are binding within
  their scopes.

Concrete package picks, framework choices, build tooling, packaging
maker, and platform targets live in `ROADMAP_DECISIONS.md`.

## Testing Discipline (NON-NEGOTIABLE)

TDD is mandatory for new logic: failing test first → user approval
→ watch it fail → implement → refactor.

Rules:
- Failing tests are not committed. `it.skip` / `test.skip` requires
  a linked issue ID in the skip message.
- Tests target public behavior, not implementation. Dependency
  Injection over module-level mocks where practical. Selector by
  accessible role or stable test id over DOM-structure selectors.
- Every module that ships logic has a co-located test file with the
  same basename.
- Tests are deterministic, isolated, and runnable via a single
  command.
- ACP adapter, IPC bridge, and HTTP API contract tests replay
  recorded JSON-RPC transcripts and HTTP fixtures against the live
  surfaces.
- E2E covers: auth flow for all auth prerequisites; first-run
  sign-in plus repo picker; new-session Specify→Review run; resume
  from mid-step with a Workspace Dirty Resume; Clarify Re-ask of a
  malformed question; external-service submission outer loop with
  one verified failure and recovery; external-agent driving the
  same full flow over the HTTP API and the GUI mirroring it in
  real-time.
- Coverage gate: 85% line coverage enforced in CI. ACP-layer
  coverage strategy may use recorded-transcript contract tests in
  place of line coverage and is finalized when that layer is built.

Test stack (Vitest, React Testing Library, Playwright via
`_electron`, axe-core for accessibility) lives in
`ROADMAP_DECISIONS.md`.

## Development Workflow

- Branch naming: `spec/NNNN-<slug>` for spec-kit work,
  `chore/<slug>` / `fix/<slug>` otherwise.
- Every PR MUST:
  - Pass lint, typecheck, tests, coverage gate, and E2E.
  - Include or update a co-located unit test for any logic change.
  - Include a "Constitution impact" section in the description.
    `none` is acceptable.
  - If the PR introduces or materially expands a Redux thunk, the
    "Constitution impact" section MUST explain why listener
    middleware or RTK Query was insufficient.
- Customizations to spec-kit-installed extension agent files are
  tracked in version control and explicitly re-applied after
  extension upgrades.
- Commits authored by the Concierge App's `after_<step>` hooks use
  the user's git identity with a `Concierge-Step: <step>` trailer.
  No synthetic author. No `--no-verify`.

## Governance

This constitution supersedes ad-hoc practice. When a principle is in
tension with delivery pressure, the principle wins or the
constitution is amended — not silently violated. A roadmap edit,
plan, task list, implementation shortcut, or review comment may
clarify execution but may not silently weaken this constitution.

### Document Relationship

Two governing documents:

1. **Constitution** (`.specify/memory/constitution.md`) — durable
   principles, ownership boundaries, quality bars, workflow law, and
   governance rules. Spec-kit commands that load the constitution
   treat it as hard law.
2. **Roadmap decisions** (`ROADMAP_DECISIONS.md`) — v1 sequencing,
   current implementation inventory (slices, APIs, listeners,
   endpoints, vendor choices, version pins, file paths), extracted
   specifics, deferred scope, known risks, and pre-resolved choices
   for upcoming spec-kit runs.

Precedence: constitution first; roadmap second. If a roadmap
decision needs to weaken, remove, or materially reinterpret a
constitutional principle, that change must happen as a constitution
amendment, not as a roadmap edit.

### Conflict with Agent Files

If this constitution conflicts with
`.github/agents/speckit.constitution.agent.md` or any other agent
prompt file, this constitution wins. The agent file is downstream
procedure and MUST be updated in the same amendment.

### Amendment Process

Constitution amendments:
- Filed as a PR touching this file, labeled `constitution-change`.
- Require approval from at least one contributor other than the
  author.
- Bump version per semver: MAJOR for principle removals or
  incompatible reframings, MINOR for new principles or material
  expansions, PATCH for clarifications, typo fixes, and extraction
  of implementation inventory that does not change governing
  meaning.
- The amending PR description includes a Sync Impact Report listing
  every downstream template, agent file, roadmap section, or
  workflow touched.

Roadmap updates:
- May change without a constitution amendment when they refine
  sequence, v1 inventory, risks, open questions, or deferred scope.
- MUST NOT contradict or weaken constitutional principles.

Runtime guidance for contributors lives at
`.specify/memory/CONTRIBUTING.md`, authored in the first plan step
that needs it. PR review comments cite the principle they invoke by
number.

**Version**: 1.0.4 | **Ratified**: 2026-05-21 | **Last Amended**: 2026-05-27

### Amendment history

- **1.0.4** (2026-05-27) — PATCH: relaxed Principle I's filesystem
  write guard for Run 2. The prior workspace-path refusal clause is
  replaced with a typed-helper audit-trail clause requiring the target
  path and calling Step context to be logged before writes. This keeps
  filesystem writes in the main-process data layer while allowing
  trusted local writes outside an active Workspace. Sync impact:
  `specs/0002-main-data-layer/plan.md`,
  `specs/0002-main-data-layer/research.md`, ADR-0003,
  `ROADMAP_DECISIONS.md`, and `.github/copilot-instructions.md`
  capture the Run 2 conventions.
- **1.0.3** (2026-05-26) — PATCH: removed runtime schema library (Zod)
  from the project's borrow list and from Run 4 IPC handler
  description in `ROADMAP_DECISIONS.md`. The factory-pattern at trust
  boundaries (already first-class in Principle IV) is now the sole
  validation/normalization mechanism; the factory's return type IS
  the typed shape; no parallel schema definition is maintained.
  Updated `CONTEXT.md` Step Contract glossary entry from
  "typed schema (Zod)" to "factory-validated typed shape." No
  principle change; no governing meaning weakened — Principle IV's
  factory mandate is unchanged and is now the unambiguous answer to
  "how is incoming data normalized."
- **1.0.2** (2026-05-23) — PATCH: extracted v1 implementation
  inventory (state-management inventory in Principle VI, plan-artifact
  filename in Principle VII, endpoint inventory in Principle IX,
  Atlassian-only naming in Principle X, JIRA-specific recipe in
  Principle XI, widget examples in Principle XIV, vendor specifics
  in Principle XV, package picks in Stack & Testing sections) to
  `ROADMAP_DECISIONS.md`. Added principle-level rules: model swap
  gating in Principle III, thunks-discouraged + Constitution-impact
  note in Principle VI and Workflow, grill-with-docs mandatory
  cadence in Principle XVI, two-document precedence and agent-file
  conflict rules in Governance. Generalized Principle X to
  observer-only posture (no longer naming a single v1 service in the
  constitution itself), generalized Principle XI to "external-service
  submission outer loop" with JIRA as the v1 instance. No principle
  removed; no governing meaning weakened.
- **1.0.1** (2026-05-22) — PATCH: corrected the design tokens path in
  Stack & Coding Standards (`design/spec-kit-concierge-2/styles.css`
  → `design/project/styles.css`) and named the v1 prototype's
  location (`design/legacy/`). No principle change.
- **1.0.0** (2026-05-21) — Initial ratification.
