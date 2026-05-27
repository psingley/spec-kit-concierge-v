# /speckit.specify input — Run 3: ACP Adapter & Bound CLI Supervisor

> The exact prompt that will be passed to `copilot --agent=speckit.specify`
> via `copilot --model gpt-5.5 --effort high --allow-all-tools --add-dir .
> -p "/speckit.specify <this-content>"`. Locked from
> `specs/0003-acp-adapter/grill.md` (9 questions resolved via
> empirical verify-now probes + user decision 2026-05-27).

---

## Spec subject

Build Run 3 (ACP Adapter & Bound CLI Supervisor) of the Concierge
Electron desktop app. This is Phase B of the 13-run roadmap and the
highest-risk run because it implements constitution III (ACP-Only
Bound CLI, NON-NEGOTIABLE).

Run 2 (Main Data Layer Foundation) is complete and merged to main at
`85b4a2d` (PR #1). Working main-process data-layer exists. The
`agents.json` manifest already contains the verified Copilot CLI
1.0.54 `--acp` flag entry. The manifest loader is operational.

Run 3 introduces `src/main/data-layer/acp/` — the only module in the
codebase allowed to spawn and speak to a coding-agent CLI binary.
NOT included: domain IPC handlers, Redux store mounting, Step Commit
writers, hook executor, HTTP server, MCP integration, Jira submission,
Windows packaging changes, product UI beyond an ACP-probe surface.

## Constitutional grounding

- Constitution v1.0.4. **Principle III (ACP-Only Bound CLI,
  NON-NEGOTIABLE)** is the load-bearing seam this run implements.
- Constitution I (Layered Architecture): ACP wire I/O lives ONLY in
  `src/main/data-layer/acp/`. Renderer must reach ACP only through
  IPC handlers (deferred to Run 4) or proof endpoint added in Run 3.
- Constitution II (Disk-as-Truth): every ACP message session writes
  to `userData/transcripts/<sessionId>/<step>-<timestamp>.jsonl`.
- Constitution IV (Factory-First Data Transformation): trust-boundary
  factories at every ACP-to-Concierge translation point.
- Constitution VII (Cancel/Recovery): cancel requires explicit
  confirmation; user-initiated cancel sends ACP `session/cancel`.
- ROADMAP_DECISIONS lines 49-55 define Run 3 deliverables. Lines
  442-471 define the Bound CLI design.

## Tech-stack delta from Run 2

NEW runtime dependency: `@agentclientprotocol/sdk@0.22.1` (Apache-2.0).
The ONLY new dep. Confirmed available on npm. v1's only ACP runtime
dep. The SDK handles JSON-RPC 2.0 framing, request/response
correlation, and on-wire schema validation — we wrap it behind a typed
`CodingAgent` interface in `src/main/data-layer/acp/agent.ts` per
constitution III line 97.

## Verify-now empirical evidence (captured 2026-05-27 BEFORE grilling)

Two real ACP transcripts saved as fixture seeds:

- `tests/fixtures/acp-transcripts/copilot-1.0.54-initialize.jsonl`
- `tests/fixtures/acp-transcripts/copilot-1.0.54-session-new-full.jsonl`

Confirmed on-wire facts from these probes (Copilot CLI 1.0.54):

- **`protocolVersion: number` (not string).** On-wire value is `1`.
  ROADMAP's "0.22.1" was wrong; that's the SDK package version.
- **`session/update` is the streaming notification channel.**
  Discriminator field: `params.update.sessionUpdate`.
- **Model swap is via `configOptions[id=model]` selector**, NOT
  `unstable_setSessionModel`. ROADMAP grill premise corrected.
- **Three session modes:** `Agent` (default), `Plan`, `Autopilot`.
  Mode URIs are `https://agentclientprotocol.com/protocol/session-modes#{mode}`.
- **`models.availableModels` exposes Premium multipliers in `_meta.copilotUsage`**
  (e.g., `gpt-5.5` is `"7.5x"`, `gpt-5.4` is `"1x"`). The protocol
  itself reports our cost model.
- **`agentCapabilities`** declares:
  - `loadSession: true` (sessions are resumable)
  - `mcpCapabilities: {http: true, sse: true}` (MCP transport support)
  - `promptCapabilities: {image: true, audio: false, embeddedContext: true}`
  - `sessionCapabilities: {list: {}}` (sessions are listable)
- **`session/new` accepts `cwd`, `mcpServers[]`** parameters.
- **`authMethods`** array in initialize response — Copilot uses
  out-of-band auth (`copilot login` shell command), NOT in-protocol auth.
- **`session/cancel`** is the canonical cancel method per ACP spec.

## Locked decisions from grill (specs/0003-acp-adapter/grill.md)

These are NOT open questions; they are settled. Do NOT re-raise them
in /speckit.clarify. Each is documented in grill.md.

### Q1 — JSON-RPC framing

SDK-managed via `ClientSideConnection` from
`@agentclientprotocol/sdk@0.22.1`. Do NOT hand-roll framing. The SDK
is implementation detail behind the typed `CodingAgent` interface.

### Q2 — Process supervision on crash

When the Copilot child process crashes (exit, SIGKILL, OOM): surface
typed `BoundCLISession` error state, log exit code + signal + last
4KB of stderr, emit `session-ended` event to renderer via IPC,
DO NOT auto-restart. The user's next action decides.

Bounded retries acceptable for TRANSPORT-level failures within a
single session lifecycle (e.g., stdin pipe error before child exit),
but crashes cross back to the user. ADR-0004 candidate during Plan
step.

### Q3 — Model swap mechanism (premise correction)

Use standard ACP `configOptions[id=model]` selector update. The
`unstable_setSessionModel` ROADMAP guidance was based on stale SDK
docs and is corrected by the verify-now probe. Keep restart-with-
`--model` flag as defense-in-depth fallback for non-Copilot bound
CLIs that lack `configOptions`.

Constitution III line 117 constraint preserved: model swap allowed
only when no step is `pending` and running. ROADMAP_DECISIONS.md
lines 458-468 to be amended during Plan step to reflect this.

### Q4 — Transcript fixture format

Annotated JSONL with `direction` field prepended to each ACP message:

```jsonl
{"direction":"client->agent","jsonrpc":"2.0","id":1,"method":"initialize","params":{...}}
{"direction":"agent->client","jsonrpc":"2.0","id":1,"result":{...}}
{"direction":"agent->client","jsonrpc":"2.0","method":"session/update","params":{...}}
```

Direction values: `client->agent`, `agent->client`. One message per
line. The `direction` field is our addition (not part of ACP wire
spec) — strip before SDK schema validation.

Sanitization automated in `transcript.ts` via regex pass:
- Replace user home paths: `/Users/<actual>` → `/Users/<user>`
- Replace session UUIDs: `<actual-uuid>` → `<sessionId-placeholder>`
- Strip timestamps if any.

Captured-at-grill fixtures get backfilled with `direction` field
during the implementation tasks.

### Q5 — Cancellation semantics

User cancel → ACP `session/cancel` method. Supervisor waits up to
5 seconds for graceful shutdown of in-flight prompt response. If
agent doesn't ack cancel in 5s, supervisor sends SIGTERM to child
process and ends session (Q2 path). Tool calls in flight at
cancellation point are best-effort; their state is whatever made it
to disk before the cancel.

Cancellation requires explicit user confirmation dialog per
constitution VII (deferred renderer concern — Run 7-9 wires the
dialog; Run 3 ships the supervisor method).

### Q6 — Session listing / load

Implement `session/list` and `session/load` ACP methods in v1.
Copilot maintains session state at `~/.copilot/session-state/<uuid>/`
already; ACP exposes this. Renderer UI for picking past sessions
deferred to Run 7-9.

### Q7 — Session modes posture

Default to `Agent` mode for v1. All three modes (Agent, Plan,
Autopilot) are supported. Mode selection is via session-startup
parameter in Run 3; renderer-side switching deferred to Run 7-9.

**User decision (2026-05-27):** Autopilot mode is permitted as an
opt-in (NOT banned). Constitution VII cancel-confirmation still
applies — autopilot only disables per-tool prompts, not the top-level
cancel action.

ADR-0005 candidate during Plan step: "ACP session modes posture."

### Q8 — Testing discipline boundary

PRIMARY discipline for ACP wire I/O modules: transcript-based
contract tests using fixtures. Mock at system boundaries
(`child_process`, filesystem write); do NOT mock the SDK (it's an
internal collaborator per Pocock TDD `mocking.md`).

Module-by-module:
- `agent.ts` — pure type contract, no tests
- `protocol.ts` — fixture-replay contract tests
- `supervisor.ts` — mock `child_process` at boundary; transcript
  replay where possible
- `capabilities.ts` — TRUST-BOUNDARY FACTORY, **6-case factory floor
  applies** (happy, `{}`, null, undefined, hostile, partial)
- `transcript.ts` — mock filesystem write boundary, no factory floor
  (no parsing)

ADR-0006 candidate during Plan step: "Testing discipline for ACP
layer."

### Q9 — TDD vertical tracer bullet sequencing

**FIRST tracer bullet test:** "Given a Copilot CLI 1.0.54 binary
path, when `BoundCLISupervisor.start()` is invoked, then a
`BoundCLISession` is returned with the verified capability descriptor
from the initialize handshake."

This exercises spawn + JSON-RPC framing + initialize + capability
parsing + session lifecycle end-to-end. Per Pocock TDD SKILL.md:
RED on real binary (or fixture-replay harness), GREEN with minimal
supervisor + protocol code, then expand to session/new, session/cancel,
streaming notifications, configOptions update.

**Run 3 is the first run using vertical tracer bullets** per the
Pocock TDD skill installed in commit `a2940ba`. Do NOT write all
tests first then all code (horizontal slicing). One test → one
implementation → repeat.

## Run 3 deliverables (in dependency order)

(Constitution v1.0.4, ADR-0002, ADR-0003 already authored. Layout
refactor already complete on commit `dd7fd1b`. agents.json already
seeded with verified Copilot entry. Manifest loader operational.)

1. **Add `@agentclientprotocol/sdk@0.22.1` to `package.json`
   dependencies.** Exact pin.

2. **`src/main/data-layer/acp/agent.ts`** — typed `CodingAgent`
   interface. Single source of truth for what a bound CLI exposes to
   the rest of the codebase. No implementation; pure types.

3. **`src/main/data-layer/acp/protocol.ts`** — wraps SDK's
   `ClientSideConnection`. Provides typed request/response correlation,
   notification handler registration. Co-located fixture-based contract
   tests against `copilot-1.0.54-initialize.jsonl` and
   `copilot-1.0.54-session-new-full.jsonl`.

4. **`src/main/data-layer/acp/capabilities.ts`** — TRUST-BOUNDARY
   FACTORY that parses the `agentCapabilities` descriptor from the
   initialize response into a typed `BoundCLICapabilities` shape.
   Co-located `capabilities.factory.spec.ts` with 6-case floor:
   happy (full Copilot 1.0.54 descriptor), `{}`, null, undefined,
   hostile (malformed nested types), partial (missing
   `agentCapabilities.loadSession` field).

5. **`src/main/data-layer/acp/transcript.ts`** — writes JSONL
   transcripts to `app.getPath('userData')/transcripts/<sessionId>/<step>-<timestamp>.jsonl`.
   Includes sanitization pass for known PII patterns (home paths,
   UUIDs). Co-located tests with mocked filesystem write boundary.

6. **`src/main/data-layer/acp/supervisor.ts`** — process supervisor
   (`BoundCLISupervisor` class). Methods:
   - `start(agentName: string): Promise<BoundCLISession>` — looks up
     entry in agents.json, spawns binary with `--acp` flag from
     manifest, performs initialize handshake, parses capabilities,
     returns session.
   - `dispose(session): Promise<void>` — sends close, waits up to
     5s for graceful exit, otherwise SIGTERM.
   - `cancel(session): Promise<void>` — sends `session/cancel`, 5s
     grace period, SIGTERM fallback.
   - Crash handler: surfaces `BoundCLISession` error state, logs to
     pino, emits `session-ended` event.

7. **`src/main/data-layer/acp/session.ts`** — `BoundCLISession`
   class wrapping a live session with state machine: `initializing`,
   `ready`, `prompting`, `cancelling`, `closed`, `errored`. Provides:
   - `newSession(cwd, mcpServers): Promise<SessionId>`
   - `prompt(message): AsyncIterable<SessionUpdate>` (streams
     notifications via SDK)
   - `setModel(modelId): Promise<void>` — uses `configOptions[id=model]`
     selector update (per Q3).
   - `setMode(modeId): Promise<void>` — uses `configOptions[id=mode]`.
   - `listSessions(): Promise<SessionInfo[]>` — `session/list`.
   - `loadSession(sessionId): Promise<void>` — `session/load`.

8. **`src/main/data-layer/acp/types.ts`** — re-exports SDK types under
   Concierge-namespaced names where useful, plus Concierge-specific
   types (`BoundCLICapabilities`, `BoundCLISession`, `SessionUpdate`
   union of all sessionUpdate kinds, etc.).

9. **IPC proof endpoint `acp:probeBoundCLI`** in `src/main/ipc/`
   (Run 2 introduced this dir). Single endpoint that:
   - Takes no parameters.
   - Spawns Copilot via supervisor, performs initialize, captures
     capabilities, disposes session.
   - Returns the typed `BoundCLICapabilities` shape.
   - Emits a structured pino log line on every invocation (per
     constitution III IPC structured-logging rule).
   - Co-located `appVersion.factory.spec`-equivalent with 6-case
     floor.

10. **Preload bridge extension** for `acp:probeBoundCLI`. Single
    additional channel; surface narrow.

11. **Renderer `getBoundCLICapabilities` RTK Query endpoint** in
    `src/renderer/api/index.ts`. Tagged with `Agent`. Uses the
    `acp:probeBoundCLI` IPC channel. No UI surface beyond rendering
    the returned capability shape in the existing proof div.

12. **3 new ADRs:** ADR-0004 (process supervision policy), ADR-0005
    (ACP session modes posture), ADR-0006 (testing discipline for
    ACP layer).

13. **`.github/copilot-instructions.md`** updated with Run 3
    conventions: ACP-layer file paths, transcript fixture convention,
    SDK is internal collaborator (do not mock), capabilities factory
    is 6-case trust-boundary, session-mode default + autopilot opt-in
    posture.

14. **`ROADMAP_DECISIONS.md`** amendment: lines 458-468 corrected
    re: model swap mechanism (verify-now probe overruled the
    `unstable_setSessionModel` guidance).

## Acceptance criteria

- `npm run lint` exit 0, ESLint Pure/Effect rules apply to all new
  `src/main/data-layer/acp/` modules.
- `npm run typecheck` exit 0; SDK types resolve correctly.
- `npm run test:coverage` exit 0; test count grows by at least the
  number of new factory specs + protocol contract tests + supervisor
  unit tests. Approximate floor: 75 tests total (up from 53).
- `npm run e2e` exit 0; existing smoke still passes; **new e2e: the
  `acp:probeBoundCLI` proof endpoint returns a valid capability
  descriptor matching the captured fixture** (proves real Copilot
  binary launches via Concierge, not just fixture replay).
- Constitution III is satisfied: no code outside
  `src/main/data-layer/acp/` spawns or speaks to a coding-agent
  binary. Verified via grep + ESLint rule.
- ADRs 0004-0006 land.
- Fixture format is consistent across all transcripts under
  `tests/fixtures/acp-transcripts/` (direction field, sanitized
  paths/UUIDs).
- The first vertical tracer-bullet test from Q9 is the FIRST test
  written and the FIRST module added (proves TDD discipline applied).

## What this run does NOT introduce

- NO domain IPC handlers beyond `acp:probeBoundCLI` (Run 4)
- NO Redux store mount / Provider in product UI (Run 4)
- NO Step Commit writers (Run 5)
- NO hook executor (Run 5)
- NO factories for domain steps — specify/clarify/plan/tasks/analyze
  factories (Runs 6-9)
- NO product UI beyond rendering the capability descriptor returned
  by the proof endpoint
- NO HTTP API (Run 10)
- NO MCP server integration in Concierge (Run 11) — note:
  agentCapabilities.mcpCapabilities is captured BUT we don't act on
  it
- NO JIRA submission in the app (Run 12)
- NO Windows packaging changes (Run 13)
- NO Step Lifecycle UI hooks; the supervisor methods exist but their
  consumers are Run 5+

## Rationale for any deviation

If /speckit.specify finds a deliverable above that it believes
should be deferred or split, it MUST flag the deviation explicitly
in spec.md under a "Deviations from grill" section. The grill is the
source of truth.

The captured ACP transcripts and the 9 locked decisions are
empirically grounded — do NOT speculate alternatives.
