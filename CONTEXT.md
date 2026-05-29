# Spec-kit Concierge — Context

> Glossary only. No implementation details. No specs. No decisions —
> those go in `docs/adr/`. Terms are added as they are resolved during
> grilling and design sessions.

## Glossary

### Concierge App

The Electron desktop application. Owns the UI, the IPC boundary between
renderer and main process, the localhost HTTP API for external agents,
the on-disk evidence under `specs/<branch>/`, the git operations on the
active Workspace, and the implementation of spec-kit extension hooks. A
user runs *the Concierge App*; everything else is something it drives
or hosts.

### Step Agent

A spec-kit per-step agent file shipped by `specify init --ai <cli>`. For
the Copilot integration these live at `.github/agents/speckit.<step>.agent.md`.
Each Step Agent is the specialized prompt and execution instructions for
exactly one spec-kit step. The Bound CLI runs them. The Concierge App
does not author or modify spec-kit-owned Step Agents.

Step Agents installed by `specify init --ai copilot`:
`specify, clarify, plan, tasks, analyze, implement, constitution,
checklist, taskstoissues`.

The Concierge App may author or customize per-step agent files installed
by spec-kit extensions (e.g., a JIRA tasks-to-issues extension). Such
customizations are tracked in version control and may need to be
re-applied after extension upgrades.

### Step Invocation

The act of the Concierge App firing a slash command (e.g.
`/speckit.clarify`) at the Bound CLI, optionally with `$ARGUMENTS`. The
CLI executes the matching Step Agent. Handoffs between steps are declared
in each agent file's `handoffs:` frontmatter; the Concierge App reads
those to populate next-step affordances in the UI.

### Workflow

The bundled spec-kit workflow at `.specify/workflows/speckit/workflow.yml`,
edited in place by the Concierge App to add the mandatory Clarify step
and to place Analyze after Tasks per spec-kit canon. The workflow's
authoritative order is:

`Specify → Clarify → Plan → Tasks → Analyze → Review (Send to JIRA)`

Six canonical steps, fixed. Spec-kit upstream owns the set; team-invented
steps are out of scope. Clarify and Review are human-driven. Plan, Tasks,
and Analyze run AI-passive with evidence surfaced in the activity stream.

### Extension Hook

A registered `before_<step>` or `after_<step>` entry in
`.specify/extensions.yml`. Every spec-kit Step Agent reads this file at
the start and end of its work and executes registered hooks. This is the
official seam spec-kit publishes for app integration. The Concierge App
implements the hooks; they own factory validation, commit-on-pass,
failure surfacing on factory rejection, and UI state transitions. The
Concierge App does **not** observe step completion any other way — no
log scraping, no filesystem watcher.

### Step Contract

The factory-validated typed shape that a step's emitted artifacts
must satisfy before the Concierge App treats the step as complete.
Enforced inside the `after_<step>` hook by a hand-written
trust-boundary factory (see Principle IV). Clarify's contract is the tightest because of
historical real-world flakiness — each ClarifyQuestion must have a
non-empty `questionText`, ≥2 well-formed `choices` (key + label), a
present short-answer affordance, and LF-normalized line endings.

### Step Commit

The single git commit emitted by an `after_<step>` hook when its Step
Contract passes. Contains exactly the step's expected artifacts. Carries
a `Concierge-Step: <step>` git trailer so commit history is
machine-readable; the Concierge App reads this trailer on Session resume
to compute which step a branch is at. Analyze commits with
`--allow-empty` if no diff resulted. Plan's commit also touches
`.github/copilot-instructions.md`. The Bound CLI is forbidden from
making git commits during step execution; commits are exclusively the
Concierge App's `after_<step>` responsibility.

### Session

A bound tuple of: (Workspace path, git branch, Bound CLI binary,
selected model). Alive from the moment the user picks a repo + branch
combination to the moment they close the workspace, abandon the
Session, or hand off after Review. Exactly one Session per Concierge
App window. CLI binding is immutable for the lifetime of the Session;
changing CLI ends the Session (a new Session can resume the same
branch with the new CLI). The model may change between steps, never
mid-step.

### Step States

The three states a step can be in for a given Session:

- **`not_available`** — prerequisite steps haven't completed yet. Locked.
- **`pending`** — the active step. Exactly one step is pending at a
  time. Interactive. The Bound CLI runs against this step.
- **`complete`** — a Step Commit for this step exists on the branch.
  Locked read-only; viewable but not editable; the UI bounces the user
  back to the pending step.

Status transitions are monotonic forward. Reverting requires an
explicit user-confirmed escape hatch (see Step Escape Hatch).

### Step Escape Hatch

The single canonical recovery flow shared by all step failure modes —
factory rejection, Bound CLI crash, malformed clarify output,
`after_<step>` hook failure, ACP error. The hatch: cancel the Bound
CLI's active turn → revert the Workspace's step-owned artifacts to the
last Step Commit (the per-step artifact manifest defines what counts as
"step-owned") → reset the step's pending state in the UI →
present a "Retry step" affordance. Retry is manual; the Concierge App
never silently auto-retries.

### Clarify Re-ask

A per-question variant of the Step Escape Hatch, specific to malformed
Clarify questions. When a malformed question is detected, the Concierge
App keeps that question visibly present, records a structured
malformation, asks the Bound CLI to rewrite only that question, and
replaces the malformed question in place when a valid rewrite arrives.
If the bounded re-ask path is exhausted, Clarify falls back to the Step
Escape Hatch.

### Step Agent Failure Modes (Clarify-specific)

Real-world failures observed before this project, used to scope the
Clarify Step Contract and the Clarify Re-ask flow:

- LF / CRLF mixing across platforms (mac vs windows) corrupting question
  bodies
- Question text missing from the emitted payload while answers are
  present
- Multiple-choice answer block missing, malformed, or merged into the
  question
- Rendered short-answer affordance absent from the UI
- Markdown emphasis (`*foo*`) at start of line confusing parsers

The clarify flow MUST detect and refuse or repair these before
completion.

### Bound CLI

The ACP-compliant coding-agent CLI executable bound to the current
Session. v1 default: GitHub Copilot CLI. The Concierge App talks to it
over the Agent Client Protocol (ACP) — JSON-RPC 2.0 over stdio — so any
ACP-compliant CLI can be substituted by changing one entry in the agent
manifest. The Bound CLI runs with `--allow-all-tools` (or the
ACP-equivalent permission grant); the Concierge App does not surface
per-tool permission prompts in v1.

### ACP (Agent Client Protocol)

The cross-vendor protocol the Concierge App uses to drive coding-agent
CLIs. Open standard documented at agentclientprotocol.com. The
Concierge App is an ACP *client*; the Bound CLI is an ACP *agent*. v1
supports only ACP-native CLIs (Copilot CLI, Codex CLI, Gemini CLI,
OpenCode, etc.). Non-ACP CLIs (e.g., Claude Code today, which is an ACP
client itself) are out of scope as Bound CLIs until they ship an ACP
agent.

### Concierge App External API

A localhost HTTP API exposed by the Concierge App's main process on a
random port published to the Electron `userData` directory. Allows
external agents (verifier agents, Claude Code, ad-hoc scripts) to drive
the Concierge App through the same actions a human user has. Every
action available to a human is available via the API, gated by the same
Session state machine. The GUI mirrors external-agent activity in
real-time, indistinguishable from a human click sequence. v1 transport
is HTTP only; MCP compatibility is not v1.

### MCP (Model Context Protocol)

The protocol the Bound CLI uses to call external services (Atlassian,
GitHub, others). The Bound CLI is the MCP host; the Concierge App is
not. The Concierge App's only MCP responsibility is detecting at launch
whether the Bound CLI's MCP configuration includes the required MCP
servers (v1: Atlassian only), and presenting a "click to fix"
affordance to write the configuration if missing. Activity stream
surfaces every MCP tool call as a summarized one-liner with tool name
and brief target; full payloads are logged to a debug file on disk.
Plugin architecture for adding more MCPs is post-v1; v1 hard-codes
Atlassian.

### JIRA Submission

The terminal action on the Review step. Implemented via a customized
spec-kit JIRA extension agent (installed from the spec-kit extensions
marketplace, customized to scope each invocation to one ticket). The
Concierge App owns a deterministic outer loop: iterate tasks in
tasks.md → invoke the per-ticket agent → wait for the agent to call
Atlassian MCP, create the ticket, verify (not duplicate), and write to
a stateful record on disk → the Concierge App reads the record after
each invocation and verifies the expected delta → continue or halt.
Idempotent on resume; if the app crashes mid-loop, the outer loop reads
the stateful record on relaunch and skips already-verified tasks. The
Concierge App never speaks to Atlassian directly.

### Workspace

The local shallow clone of a `collette-travel` organization repository
the Concierge App operates on, stored at
`{userData}/repos/{owner}/{name}`. One Session is bound to one
Workspace; the Concierge App refuses to write outside the Workspace
path. The app owns the clone — it is not shared with the user's normal
development workflow. Org name is hard-coded as a constant in v1
(single-org). External git mutations on spec branches by other actors
are out of scope.

### Workspace Dirty Resume

A specific Session resume case: the user closed the app mid-step, the
Workspace has uncommitted changes to that step's expected artifacts.
On relaunch, the Concierge App does not silently revert (loses work)
and does not silently commit (might commit garbage). Instead, it
invokes the Bound CLI to resume from the dirty state, passing context
about what was interrupted and what's on disk. The step agent decides
how to complete from there. Only applies when there are
expected-but-uncommitted artifacts for the current step.

### Auth Gate

The precondition that must be satisfied before the Concierge App
allows navigation past the sign-in screen. All three providers —
GitHub CLI, Copilot CLI, and Atlassian — must be authenticated
(`'ok'`). If any provider's session expires mid-workflow, the user is
returned to the sign-in screen.

### Pure Layer vs Effect Layer

Pure layers contain no I/O, no mutation, no Electron or Node API
dependency, and no class instantiation except for third-party
framework interop. Effect layers contain the explicit side-effect
plumbing the app needs (Electron main bootstrap, IPC handlers, ACP
client, FS module, git module, child-process supervisor, localhost
HTTP server). A pure-layer file may not import from an effect-layer
module directly — only from its transform/factory partner. The split
is enforced by directory layout and ESLint rules.
