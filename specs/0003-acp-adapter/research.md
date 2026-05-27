# Run 3 Research - ACP Adapter & Bound CLI Supervisor

**Date**: 2026-05-27

## Decisions

### 1. ACP SDK API surface

**Decision**: Use `ClientSideConnection` from `@agentclientprotocol/sdk@0.22.1` as the ACP client implementation behind Concierge's `CodingAgent` interface.

Relevant exported surface from package `@agentclientprotocol/sdk@0.22.1`:

```ts
import {
  ClientSideConnection,
  ndJsonStream
} from '@agentclientprotocol/sdk';
```

Observed type surface from the package:

- `new ClientSideConnection(toClient, stream)` creates the client-side connection to an agent.
- `ndJsonStream(output, input)` converts writable/readable byte streams into an ACP object stream.
- `initialize(params)` performs protocol negotiation and returns `InitializeResponse`.
- `newSession(params)` creates a session and returns `NewSessionResponse`.
- `loadSession(params)` resumes an existing session when `agentCapabilities.loadSession` is true.
- `listSessions(params)` lists sessions when session list capability is advertised.
- `setSessionMode(params)` sets a session mode.
- `setSessionConfigOption(params)` sets a standard ACP configuration option and returns the refreshed option set.
- `unstable_setSessionModel(params)` exists in the SDK, but is marked unstable and is not the verified Copilot 1.0.54 path.
- `prompt(params)` sends a prompt turn.
- `cancel(params)` sends ACP cancellation notification.
- `signal` and `closed` expose connection closure state.

**Rationale**: The SDK owns JSON-RPC request/response correlation, notifications, stream lifecycle, and schema typing. Concierge owns process supervision, capability normalization, transcript recording, and UI-facing contracts.

**Alternatives considered**:

- Hand-roll JSON-RPC framing: rejected because the SDK is the only planned ACP runtime dependency and directly exists to handle this protocol surface.
- Expose SDK types through preload/renderer: rejected because the SDK is an internal collaborator and the public contract must be Concierge-owned.

### 2. JSON-RPC framing approach

**Decision**: Use SDK-managed newline-delimited JSON framing over the Copilot child process stdio pipes.

Implementation shape:

```ts
const child = spawn(binary, args, {
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: false,
  windowsHide: true
});

const stream = ndJsonStream(
  Writable.toWeb(child.stdin),
  Readable.toWeb(child.stdout)
);

const connection = new ClientSideConnection(toClient, stream);
```

Notes:

- Copilot `--acp` verify-now transcripts show one JSON-RPC message per line over stdio.
- `ClientSideConnection` remains behind `protocol.ts`; request IDs and response matching are not reimplemented.
- Transcript recording should wrap or tee the byte/object streams so every outbound and inbound ACP message gets one annotated JSONL line.
- Contract tests strip the Concierge-only `direction` field before validating/replaying ACP wire data.

**Rationale**: This preserves constitution III's "ACP over stdio" boundary while avoiding a bespoke JSON-RPC implementation.

**Alternatives considered**:

- Manual line buffer around `child.stdout`: rejected due partial-read, encoding, and response-correlation risk.
- Mocking the SDK in tests: rejected by the TDD skill boundary rule; the SDK is an internal collaborator, not a system boundary.

### 3. Child process spawn policy for Copilot `--acp`

**Decision**: `BoundCLISupervisor` uses `child_process.spawn` with the existing Run 2 manifest entry and appends the ACP mode flag from the manifest.

Recommended options:

```ts
spawn(binary, [...launchArgs, acpModeFlag].filter(Boolean), {
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: false,
  windowsHide: true,
  env: process.env
});
```

Policy:

- Do not use `exec`, a shell string, or `shell: true`.
- Do not detach the process.
- Capture stderr in a fixed-size ring buffer capped to the last 4KB.
- On unexpected exit, record exit code, signal, and stderr tail, then transition the session to typed `errored` state.
- Emit `session-ended`.
- Do not auto-restart.
- Use a 5-second graceful window for cancel and dispose before terminating the child process.

**Rationale**: Direct spawn with piped stdio gives the SDK the byte streams it needs and avoids shell quoting/platform risk. The no-restart behavior is locked by ADR-0004.

**Alternatives considered**:

- Restart Copilot automatically after crash: rejected because process death ends the bound CLI session and user recovery must decide whether to retry.
- Read Copilot private session state directly: rejected because session list/load must go through ACP.

### 4. Transcript sanitization regex patterns

**Decision**: Apply deterministic sanitization before committing fixtures and before writing shareable runtime transcript material.

Recommended patterns:

| Sensitive/volatile value | Pattern | Replacement |
|---|---|---|
| macOS home path | `/(\/Users\/)[^\/\s"]+/g` | `$1<user>` |
| Windows home path | `/([A-Za-z]:\\\\Users\\\\)[^\\\\\s"]+/g` | `$1<user>` |
| POSIX home path | `/(\/home\/)[^\/\s"]+/g` | `$1<user>` |
| UUID/session IDs | `/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi` | `<sessionId-placeholder>` |
| ISO-8601 timestamps | `/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})\b/g` | `<timestamp>` |
| Epoch millisecond timestamp fields | `/"(timestamp|createdAt|updatedAt|lastActiveAt)"\s*:\s*\d{12,}/g` | `"$1":"<timestamp>"` |

For schema-sensitive fixture replay, prefer replacing timestamp values with `<timestamp>` rather than deleting entire fields unless a fixture-specific contract says that field is not part of ACP wire behavior.

**Rationale**: The captured transcripts contain local paths and session UUIDs. Automatic sanitization makes replayable evidence safe to commit and compare across machines.

**Alternatives considered**:

- Manual `sed` during fixture authoring: rejected by the grill because it is easy to forget and makes future captures unsafe by default.

### 5. ACP session-mode URIs

**Decision**: Treat the verified Copilot mode URIs as constants in the ACP data layer.

| Mode | URI | Posture |
|---|---|---|
| Agent | `https://agentclientprotocol.com/protocol/session-modes#agent` | Default |
| Plan | `https://agentclientprotocol.com/protocol/session-modes#plan` | Supported |
| Autopilot | `https://agentclientprotocol.com/protocol/session-modes#autopilot` | Supported, opt-in only |

Autopilot posture is locked by the user decision `allow`: it is not banned, but it is never default and must record the user's opt-in decision.

**Rationale**: The URIs are empirically verified in `copilot-1.0.54-session-new-full.jsonl` and match the ACP namespace. Storing full URIs avoids ambiguous local strings such as `agent` or `autopilot`.

**Alternatives considered**:

- Ban Autopilot: rejected by settled Q7 user decision.
- Store short mode names only: rejected because ACP wire values are full URIs.

### 6. Model selection correction

**Decision**: For Copilot CLI 1.0.54, model selection uses `setSessionConfigOption` for the standard ACP config option with `id: "model"`.

The verify-now `session/new` response returns:

- `models.availableModels`
- `models.currentModelId`
- `configOptions[]` containing a select option with `id: "model"`

`unstable_setSessionModel` exists in SDK 0.22.1, but it is explicitly unstable and is not the Copilot 1.0.54 source of truth. Keep it only as a bounded fallback for future/non-Copilot ACP agents that do not expose `configOptions[id=model]`.

**Rationale**: Empirical transcript evidence outranks stale roadmap notes. This correction is recorded in `ROADMAP_DECISIONS.md`.

**Alternatives considered**:

- Continue with `unstable_setSessionModel`: rejected as stale and not needed for Copilot 1.0.54.
- Restart Copilot for every model change: rejected for Copilot because standard ACP config can update the model in-session when no step is pending/running.

### 7. Testing boundary

**Decision**: Transcript contract tests are primary for ACP wire behavior. `capabilities.ts` is the only Run 3 trust-boundary factory with the six-case floor. Mock `child_process`, filesystem writes, time, and Electron IPC at system boundaries. Do not mock `ClientSideConnection` or other SDK internals.

**Rationale**: The TDD skill requires public-interface behavior tests and boundary-only mocks. The SDK is inside the module under test; mocking it would test Concierge's assumptions rather than ACP behavior.

**Alternatives considered**:

- Add six-case factory specs to every ACP module: rejected because transcript replay is the contract discipline for wire modules and only capability normalization is a trust-boundary factory.
- Mock protocol methods directly in supervisor tests: rejected unless the test is specifically at a higher IPC/renderer layer; supervisor tests should own the child process boundary.
