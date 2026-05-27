# Grill — Run 3: ACP Adapter & Bound CLI Supervisor

> Grill-with-docs session per Principle XVI. Resolves ambiguities in
> ROADMAP_DECISIONS Run 3 scope before `/speckit.specify` is invoked.
> Format mirrors `specs/0002-main-data-layer/grill.md`.

**Scope (from ROADMAP_DECISIONS line 49-55):**
`main/data-layer/acp/` — process supervisor, JSON-RPC 2.0 stdio
framing, capability discovery, model selection messages, cancellation,
recorded-transcript contract tests fixture format
(`tests/fixtures/acp-transcripts/<scenario>.jsonl`). v1 binds only to
Copilot CLI (manifest entry); the interface admits any ACP agent.
**Depends on Runs 1, 2. Highest risk. Blocks Runs 4 and 6.**

Constitution III (ACP-Only Bound CLI) is NON-NEGOTIABLE and the
load-bearing seam this run implements. Constitutional violation here
fails the whole product.

**Verify-now probes captured at grill time (2026-05-27):**

Two real ACP transcripts saved before grilling:
- `tests/fixtures/acp-transcripts/copilot-1.0.54-initialize.jsonl`
  (initialize handshake)
- `tests/fixtures/acp-transcripts/copilot-1.0.54-session-new-full.jsonl`
  (full initialize + session/new + session/update notifications)

These captured the ACTUAL Copilot CLI 1.0.54 ACP wire format. Many
grill questions are pre-locked because we have ground truth on disk.

---

## Locked in advance (no grilling needed — verified empirically)

### Protocol shape (FROM CAPTURED TRANSCRIPTS)

- **`protocolVersion` is a NUMBER, not a string.** ROADMAP's
  best-evidence ("0.22.1") was wrong. On-wire value is `1`. The SDK
  version (`@agentclientprotocol/sdk@0.22.1`) is the npm package
  version; the on-wire protocol version is `1`.
- **`session/update` is the streaming notification method.** All
  agent→client events from a session ride this channel. Discriminator
  is `params.update.sessionUpdate` (kind tag — confusing dual-key but
  empirically verified).
- **session/new returns `models.availableModels` AND `models.currentModelId`.**
  Model swap is a standard `configOptions[id=model]` selector update,
  NOT an `unstable_setSessionModel` call. This invalidates the
  ROADMAP grill premise.
- **`configOptions` field on session/new** carries: mode (Agent /
  Plan / Autopilot), model (with `_meta.copilotUsage` Premium
  multipliers), reasoning_effort (none/low/medium/high), agent
  (custom agent selector), allow_all (permissions toggle).
- **Session-mode URIs are namespaced:**
  `https://agentclientprotocol.com/protocol/session-modes#{agent|plan|autopilot}`.
  This is the canonical ACP spec URI scheme.
- **`agentCapabilities.mcpCapabilities`** declares MCP transport
  support: `{ http: true, sse: true }`. MCP servers can be passed to
  `session/new` via `params.mcpServers` array.
- **`session/new` accepts `cwd` parameter** — sets the agent's
  working directory for the session lifetime.
- **Auth surface:** `authMethods` array in initialize response
  declares `{id, name, description}` per method. Copilot uses
  `copilot-login` (run `copilot login` in terminal — out-of-band, not
  inside ACP).
- **promptCapabilities.image: true, audio: false, embeddedContext:
  true** — Copilot supports image input + file embedding, no audio.
- **agentCapabilities.loadSession: true, sessionCapabilities.list: {}**
  — sessions are listable and resumable.

### Already done by Run 2 (do NOT redo)

- ✅ `src/main/data-layer/agents/agents.json` seeded with Copilot
  CLI 1.0.54 verified entry (`--acp` flag confirmed via /speckit.implement T015).
- ✅ `src/main/data-layer/agents/manifest.ts` + `loader.ts` validates
  agents.json at boot, warns on unverified entries.
- ✅ `src/main/data-layer/` directory structure + ESLint Pure/Effect
  layer rules apply to it.
- ✅ Constitution v1.0.4 + ADR-0002 (factory-pattern) + ADR-0003
  (RTK Query tagTypes).
- ✅ Pocock TDD skill installed at `.agents/skills/tdd/` + project
  rider preserved. **Run 3 IS the first run using vertical tracer
  bullets per the skill discipline.**

### Tech-stack delta

- New runtime dep: `@agentclientprotocol/sdk@0.22.1` (Apache-2.0).
  v1's only ACP runtime dep. Confirmed available on npm.
- No other new deps in Run 3 — pino (logging), Vitest (specs) all
  inherited from Runs 1 + 2.

---

## Q1 — JSON-RPC framing: SDK-managed or hand-rolled?

**Question:** The ACP wire protocol is newline-delimited JSON over
stdio per the capture. Do we use `@agentclientprotocol/sdk`'s
`ClientSideConnection` to manage framing, or hand-roll framing in
`src/main/data-layer/acp/protocol.ts`?

**Answer:** SDK-managed via `ClientSideConnection` from
`@agentclientprotocol/sdk@0.22.1`. We do NOT reimplement JSON-RPC
framing.

**Reasoning:**
- The SDK already handles: line buffering, parse errors, request/
  response correlation by id, `Content-Length` framing for non-
  newline transports.
- Hand-rolling guarantees subtle bugs (partial reads, encoding,
  buffer drift).
- Constitution III line 101: "speaks JSON-RPC 2.0 over stdio." Uses
  "speaks" not "implements" — leaves room for SDK use.
- The SDK is the ONLY ACP runtime dep per ROADMAP line 442 — its
  raison d'être is exactly this.
- Our typed `CodingAgent` interface (constitution III line 97) wraps
  the SDK's connection; the SDK is implementation detail behind that
  interface, not exposed beyond the data-layer.

**ADR candidate?** No (the SDK choice is already in ROADMAP +
constitution).

---

## Q2 — Process supervision strategy on Copilot crash

**Question:** If the Copilot child process crashes (segfault, OOM,
killed by OS, network outage during MCP HTTP call), what does the
supervisor do?

**Answer:** Surface the crash as a typed `BoundCLISession` error
state, log the exit code + signal + last 4KB of stderr, and emit a
`session-ended` event to the renderer via IPC. Do NOT auto-restart.

**Reasoning:**
- Auto-restart would silently lose Step Commit state recovery
  semantics (constitution II Disk-as-Truth). The user's next action
  after a crash is "review what we have, decide whether to retry" —
  which the renderer + step-state replay (Run 5) handles.
- Crash != "transient network blip" in the ACP context. The session
  is bound to a process; the process dies, the session ends.
- Constitution III line 122: "CLI swap is forbidden mid-Session.
  Changing the Bound CLI ends the Session." A crash is the death of
  the bound CLI — same end-Session semantics.
- Bounded retries on TRANSPORT-level failures (stdin/stdout pipe
  error before the child exits) ARE acceptable, but only within a
  single session lifecycle; crossing crashes goes back to the user.

**ADR candidate?** Maybe — process-supervision policy is a real
hard-to-reverse architectural choice. **→ Tentative ADR-0004 during
Plan step.**

---

## Q3 — Model swap mechanism (premise correction)

**Question:** ROADMAP line 458-468 says model swap is via
`unstable_setSessionModel`. Verify-now probe showed model swap is
actually via standard `configOptions[id=model]` selector. Which is
the truth?

**Answer:** Use `configOptions` selector update (the verified path).
The `unstable_setSessionModel` SDK method may not even be present in
v0.22.1's exported surface — to be confirmed by reading the SDK's
types after install. If present, it's a fallback for older agents
that don't expose `configOptions`; Copilot 1.0.54 does not need it.

**Reasoning:**
- Verify-now probe (`session/new` response) returned `configOptions`
  with `{type: 'select', id: 'model', currentValue: 'gpt-5.5',
  options: [...]}`. This is the canonical ACP-spec mechanism.
- ROADMAP's "unstable_setSessionModel" guidance is stale.
- Constitution III line 119-120 mandates "MAY restart the Bound CLI
  with the new model selected via launch flag" as fallback. Keep
  the restart path as defense-in-depth for non-Copilot bound CLIs.
- Constraint preserved (constitution III line 117): model swap only
  allowed when no step is `pending` and running.

**ADR candidate?** No — this is a verify-now correction of a stale
ROADMAP line; capture in plan.md research section + amend
ROADMAP_DECISIONS during plan step.

---

## Q4 — Transcript fixture format

**Question:** ROADMAP says `tests/fixtures/acp-transcripts/<scenario>.jsonl`.
What's the exact line format? Replayable? Annotated with direction?

**Answer:** Annotated JSONL with a `direction` field prepended to
each ACP message. Format:

```jsonl
{"direction":"client->agent","jsonrpc":"2.0","id":1,"method":"initialize","params":{...}}
{"direction":"agent->client","jsonrpc":"2.0","id":1,"result":{...}}
{"direction":"agent->client","jsonrpc":"2.0","method":"session/update","params":{...}}
```

Direction values: `client->agent` (we sent it), `agent->client` (we
received it). One ACP message per line. The `direction` field is OUR
addition for replay-ability and audit — strip it before validating
against the SDK's actual schemas.

**Reasoning:**
- Pure ACP wire format wouldn't include `direction`, but replay
  requires knowing who sent what. JSONL is the natural fit; one
  message per line; the `direction` prefix is the cheapest reliable
  annotation.
- Sanitization rule: per-fixture, strip user-machine paths
  (`/Users/psingley/...` → `/Users/<user>/...`), session UUIDs
  (`{actual-uuid}` → `{sessionId-placeholder}`), and timestamps if
  any. Fixtures must be reproducible across machines.
- The two fixtures captured at grill time use this format already
  (informally, no `direction` field yet — backfill during Plan step
  task list).

**ADR candidate?** No — fixture format is project convention.

---

## Q5 — Cancellation semantics

**Question:** "Cancel current step" requires explicit confirmation
dialog (per constitution VII line 491). What ACP method delivers the
cancellation, and what happens to in-flight tool calls?

**Answer:** Send `session/cancel` ACP method (canonical per spec).
In-flight tool calls receive cancellation through the SDK's standard
abort propagation. The supervisor waits up to 5 seconds for graceful
shutdown of the in-flight prompt response; if the agent hasn't
acknowledged cancellation in 5s, the supervisor kills the underlying
process (SIGTERM) and ends the session as in Q2.

**Reasoning:**
- ACP spec defines `session/cancel` as the standard cancel signal.
- 5-second grace period is conventional for stdio-based tool
  protocols (long enough for typical tool exit, short enough that
  the user notices).
- Killing the process on timeout is the safe escape; the user
  already confirmed cancel intent.
- Tool call state preserved up to cancellation point is what gets
  reflected in the next step-state replay (Run 5 reads trailers).

**ADR candidate?** No (mechanical application of ACP spec +
constitution VII).

---

## Q6 — Session listing / load semantics

**Question:** ACP exposed `loadSession: true` and `sessionCapabilities.list: {}`.
Do we use these for v1, or defer?

**Answer:** Implement `session/list` and `session/load` for v1.
Defer the renderer-side UI for picking past sessions to Run 7-9
(vertical slices).

**Reasoning:**
- Copilot maintains sessions on disk at
  `~/.copilot/session-state/<uuid>/`. We've been using these for
  observability throughout Run 1 + 2. Treating them as resumable
  via ACP gives us real recovery semantics for free.
- Constitution II (Disk-as-Truth) implies session state is recoverable
  from disk; using ACP's load is the cleanest path.
- Run 3 ships the supervisor methods; the renderer UI hooks come
  later when there's a UI to attach them to.

**ADR candidate?** No.

---

## Q7 — Configuration mode (Agent/Plan/Autopilot) defaults

**Question:** session/new exposed three modes. Which is the v1
default, and is the user free to switch mid-session?

**Answer:** Default to `Agent` mode for v1. All three modes (Agent,
Plan, Autopilot) are SUPPORTED but only `Agent` is the default.
Switching mid-session through the Concierge UI is deferred to Run 7-9
(no renderer surface yet); for Run 3, mode is selectable only via
session-startup parameter.

**User decision (2026-05-27):** "allow" — Autopilot is NOT banned.
User explicitly chose to keep autopilot as an opt-in switch. Settled.

**Reasoning:**
- `Agent` mode is "default agent mode for conversational interactions"
  per the probe — matches our Step Agent pattern. Safe default.
- `Plan` mode is for multi-step plans — overlaps with spec-kit's
  /speckit.plan in confusing ways but is a legitimate ACP capability.
  Surface in Settings, defer renderer wiring.
- `Autopilot` mode enables `allow-all` + runs until task completion
  without user interaction. Per user decision, this is available as
  an opt-in mode. Constitution VII's cancel-confirmation requirement
  STILL applies — the user can press cancel at any time, which sends
  ACP `session/cancel` (per Q5). Autopilot doesn't disable cancel;
  it disables the per-tool prompts. The constitution-VII confirmation
  requirement remains intact.
- The "are you sure you want autopilot?" UI warning is a renderer-side
  Settings concern, deferred to Run 7-9.

**ADR candidate?** Maybe — the three-modes posture (which is default,
which need warnings, which carry HITL implications) is worth recording.
**→ Tentative ADR-0005 during Plan step: "ACP session modes posture."**

---

## Q8 — Factory test vs transcript test boundary

**Question:** Constitution III line 108 says "contract tests against
recorded ACP transcripts." Constitution IV says trust-boundary factories
have a 6-case factory floor. Which discipline applies to ACP modules?

**Answer:** Transcript-based contract tests are the PRIMARY discipline
for ACP wire I/O modules (`protocol.ts`, `supervisor.ts`,
`capabilities.ts`, `transcript.ts`). Factory specs (6-case floor)
apply to any non-wire data-layer modules that wrap ACP outputs into
typed Concierge shapes.

Specifically:
- `src/main/data-layer/acp/agent.ts` — the typed CodingAgent
  interface. No tests at this layer; it's a pure type contract.
- `src/main/data-layer/acp/protocol.ts` — uses SDK, minimal logic.
  Contract tests via fixtures.
- `src/main/data-layer/acp/supervisor.ts` — process lifecycle. Mock
  child_process at the boundary (per Pocock TDD `mocking.md`); test
  via transcript replay where possible.
- `src/main/data-layer/acp/capabilities.ts` — parse + validate
  capability descriptors from the agent. **6-case factory floor
  applies** (this is a trust-boundary factory by constitution IV).
- `src/main/data-layer/acp/transcript.ts` — write JSONL transcripts
  to userData/transcripts/. Boundary-mocked write tests, no factory
  floor (no parsing).

**Reasoning:**
- The SDK does the heavy parsing; reimplementing factory specs for
  every SDK type would duplicate the SDK's own tests.
- Capability descriptors ARE a trust boundary because we use them to
  decide what to expose to the user (image input? autopilot?). They
  need the strict 6-case floor.
- Pocock TDD `mocking.md` rule: mock at system boundaries. child_process
  + filesystem are boundaries; SDK is internal collaborator (do not
  mock).

**ADR candidate?** Maybe — defines the testing-discipline boundary
for the whole ACP layer. **→ Tentative ADR-0006 during Plan step.**

---

## Q9 — TDD vertical tracer bullet sequencing

**Question:** Per the Pocock TDD skill (just installed), Run 3 uses
vertical tracer bullets. What's the FIRST test?

**Answer:** The first vertical tracer bullet is:

> Given a Copilot CLI 1.0.54 binary path, when `BoundCLISupervisor.start()`
> is invoked, then a `BoundCLISession` is returned with the verified
> capability descriptor from the initialize handshake.

This is THE end-to-end smoke for the entire ACP layer. It exercises:
- Process spawn (with `--acp` flag from manifest)
- JSON-RPC framing (initialize request + response correlation)
- Capability discovery (parse `agentCapabilities`)
- Session lifecycle (process exits cleanly on `BoundCLISession.dispose()`)

RED: write the test against the real binary (or a recorded transcript
replay harness). GREEN: minimal supervisor + protocol code to pass.
Then expand to session/new, session/cancel, session/update streaming,
configOptions update for model swap, etc.

**Reasoning:**
- Pocock SKILL.md: "Tracer bullet... proves the path works end-to-end."
- The CodingAgent interface (constitution III line 97) is the public
  surface; testing through it is what survives implementation churn.
- Starting with initialize+capabilities means the simplest "is the
  binary even responding" smoke is also our first written-by-TDD
  test.

**ADR candidate?** No — this is workflow guidance, not architecture.

---

## Open questions for the user — TWO need decision

The grill above is mostly resolved by verify-now empirical evidence.
Two genuine taste calls remain:

### Q-A: Autopilot mode posture — RESOLVED

**User decision (2026-05-27):** "allow" — Autopilot mode is permitted
as an opt-in switch. Concierge does NOT ban it.

Constitution VII (cancel + confirmation) still applies: cancel is a
top-level action that works regardless of mode. Autopilot only
disables PER-TOOL prompts, not the user's ability to abort.

The Settings-UI "are you sure you want autopilot?" warning is a
Run 7-9 renderer-side concern, deferred. For Run 3, autopilot is
selectable via session-startup parameter only.

### Q-B: Transcript sanitization automation

Per Q4: fixtures need path/UUID sanitization. Two ways:

(a) **Manual sanitization** during fixture authoring (developer
edits the JSONL by hand or runs a one-off sed).

(b) **Sanitization helper in `transcript.ts`** that strips known PII
patterns automatically before writing. Slightly more code but every
captured transcript becomes shareable by default.

**Going with: (b) automation.** The cost is small (one regex pass)
and the upside is "any captured transcript is committable" without
the "did I remember to sed it?" risk.

**One-word override:** "manual" → defer the helper, sed it case-by-case.
