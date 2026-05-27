---
feature: ACP Adapter & Bound CLI Supervisor
branch: spec/0003-acp-adapter
created: 2026-05-27
source_plan: specs/0003-acp-adapter/plan.md
---

# Tasks: Run 3 ACP Adapter & Bound CLI Supervisor

**Input**: `specs/0003-acp-adapter/plan.md`, especially the implementation sequence and TDD vertical tracer-bullet sequence.

**TDD discipline**: Run 3 must proceed vertically: one RED behavior test, then one minimal GREEN implementation, then repeat. Do not batch all tests ahead of implementation. Tests must exercise public interfaces and may mock only system boundaries: `child_process`, filesystem writes, time, and Electron IPC. Do not mock `@agentclientprotocol/sdk`.

**Scope guard**: These tasks intentionally exclude ADR-0004, ADR-0005, ADR-0006, constitution v1.0.4, `ROADMAP_DECISIONS.md`, `.github/copilot-instructions.md` Run 3 guidance, and verify-now transcript capture because those were completed during planning. These tasks also exclude domain IPC beyond `acp:probeBoundCLI`, Step Commit writers, hook execution, Concierge MCP integration, Jira submission, Redux Provider/product store mounting, and product ACP UI beyond the proof surface.

**Task format**: Each task names concrete paths, explicit dependencies, and the acceptance condition that must be true before the task is marked complete.

**Factory-spec floor for `src/main/data-layer/acp/capabilities.ts`**:
1. Happy path: full Copilot CLI 1.0.54 initialize descriptor returns `BoundCLICapabilities`.
2. Empty object: `{}` returns a named `InvalidBoundCLICapabilities` error.
3. Null: `null` returns a named `InvalidBoundCLICapabilities` error.
4. Undefined: `undefined` returns a named `InvalidBoundCLICapabilities` error.
5. Hostile malformed nested types: e.g. `agentCapabilities.loadSession` or `promptCapabilities.image` has the wrong type.
6. Partial structurally-plausible input: e.g. missing `agentCapabilities.loadSession`.

## Phase 1 - First ACP vertical tracer bullet

- [ ] T001 Write the FIRST test asserting that `BoundCLISupervisor.start()` returns verified initialize capabilities for Copilot CLI 1.0.54 (RED).
  - Paths: `src/main/data-layer/acp/supervisor.test.ts`.
  - Dependencies: none.
  - Acceptance: A behavior-focused test through the public `BoundCLISupervisor.start()` interface fails before implementation and asserts that the Copilot 1.0.54 initialize descriptor is returned as `BoundCLICapabilities` and `BoundCLISession.dispose()` closes cleanly.

- [ ] T002 Implement minimal supervisor + protocol code to pass T001 (GREEN).
  - Paths: `package.json`, `package-lock.json`, `src/main/data-layer/acp/agent.ts`, `src/main/data-layer/acp/types.ts`, `src/main/data-layer/acp/capabilities.ts`, `src/main/data-layer/acp/protocol.ts`, `src/main/data-layer/acp/supervisor.ts`.
  - Dependencies: T001.
  - Acceptance: `@agentclientprotocol/sdk` is pinned exactly to `0.22.1`, `BoundCLISupervisor.start()` launches the manifest-selected Copilot CLI with ACP enabled using `child_process.spawn` with `stdio: ['pipe', 'pipe', 'pipe']` and `shell: false`, `protocol.ts` uses SDK `ClientSideConnection` and `ndJsonStream` for initialize framing, SDK types do not leak through `agent.ts`, the verified capabilities are parsed into Concierge-owned types, and `supervisor.test.ts` passes.

## Phase 2 - Capability factory floor, grown one case at a time

- [ ] T003 Add the co-located capability factory happy-path test (RED).
  - Paths: `src/main/data-layer/acp/capabilities.factory.spec.ts`.
  - Dependencies: T002.
  - Acceptance: The spec asserts that the full Copilot CLI 1.0.54 initialize descriptor maps to the Concierge-owned `BoundCLICapabilities` shape, including numeric `protocolVersion`, load/list session support, MCP transport metadata, prompt capabilities, model cost metadata, and supported mode URIs.

- [ ] T004 Implement or refine the capability happy-path mapping (GREEN).
  - Paths: `src/main/data-layer/acp/capabilities.ts`, `src/main/data-layer/acp/types.ts`.
  - Dependencies: T003.
  - Acceptance: The public capability factory returns typed output for the verified Copilot descriptor and `capabilities.factory.spec.ts` passes without weakening the T001 supervisor behavior.

- [ ] T005 Add the empty-object capability factory test (RED).
  - Paths: `src/main/data-layer/acp/capabilities.factory.spec.ts`.
  - Dependencies: T004.
  - Acceptance: The spec asserts `{}` returns a stable named `InvalidBoundCLICapabilities` error rather than a success-shaped default or an uncaught exception.

- [ ] T006 Implement empty-object rejection (GREEN).
  - Paths: `src/main/data-layer/acp/capabilities.ts`.
  - Dependencies: T005.
  - Acceptance: `{}` is rejected with `InvalidBoundCLICapabilities`, valid Copilot capabilities still parse, and all capability specs pass.

- [ ] T007 Add the null capability factory test (RED).
  - Paths: `src/main/data-layer/acp/capabilities.factory.spec.ts`.
  - Dependencies: T006.
  - Acceptance: The spec asserts `null` returns a stable named `InvalidBoundCLICapabilities` error.

- [ ] T008 Implement null rejection (GREEN).
  - Paths: `src/main/data-layer/acp/capabilities.ts`.
  - Dependencies: T007.
  - Acceptance: `null` is rejected with `InvalidBoundCLICapabilities`, previously passing cases remain green, and all capability specs pass.

- [ ] T009 Add the undefined capability factory test (RED).
  - Paths: `src/main/data-layer/acp/capabilities.factory.spec.ts`.
  - Dependencies: T008.
  - Acceptance: The spec asserts `undefined` returns a stable named `InvalidBoundCLICapabilities` error.

- [ ] T010 Implement undefined rejection (GREEN).
  - Paths: `src/main/data-layer/acp/capabilities.ts`.
  - Dependencies: T009.
  - Acceptance: `undefined` is rejected with `InvalidBoundCLICapabilities`, previously passing cases remain green, and all capability specs pass.

- [ ] T011 Add the hostile nested capability factory test (RED).
  - Paths: `src/main/data-layer/acp/capabilities.factory.spec.ts`.
  - Dependencies: T010.
  - Acceptance: The spec asserts malformed nested fields, such as non-boolean `agentCapabilities.loadSession` or non-boolean `promptCapabilities.image`, return `InvalidBoundCLICapabilities`.

- [ ] T012 Implement hostile nested rejection (GREEN).
  - Paths: `src/main/data-layer/acp/capabilities.ts`.
  - Dependencies: T011.
  - Acceptance: Malformed nested capability values are rejected with `InvalidBoundCLICapabilities` and all earlier capability cases still pass.

- [ ] T013 Add the partial structurally-plausible capability factory test (RED).
  - Paths: `src/main/data-layer/acp/capabilities.factory.spec.ts`.
  - Dependencies: T012.
  - Acceptance: The spec asserts an initialize descriptor missing a required field such as `agentCapabilities.loadSession` returns `InvalidBoundCLICapabilities`.

- [ ] T014 Implement partial capability rejection (GREEN).
  - Paths: `src/main/data-layer/acp/capabilities.ts`.
  - Dependencies: T013.
  - Acceptance: Partial structurally-plausible capability input is rejected with `InvalidBoundCLICapabilities`; the co-located factory spec contains all six required cases and passes.

## Phase 3 - Transcript fixture contract normalization

- [ ] T015 Add the transcript fixture contract test (RED).
  - Paths: `src/main/data-layer/acp/protocol.test.ts`, `src/test/acpTranscript.ts`, `tests/fixtures/acp-transcripts/copilot-1.0.54-initialize.jsonl`, `tests/fixtures/acp-transcripts/copilot-1.0.54-session-new-full.jsonl`.
  - Dependencies: T014.
  - Acceptance: The test reads both captured Copilot fixtures, proves every JSONL line has `direction: 'client->agent' | 'agent->client'`, strips `direction` back to ACP wire shape, and validates the initialize/session-new facts without treating `direction` as wire data.

- [ ] T016 Normalize transcript fixture helpers and fixture format (GREEN).
  - Paths: `src/test/acpTranscript.ts`, `tests/fixtures/acp-transcripts/copilot-1.0.54-initialize.jsonl`, `tests/fixtures/acp-transcripts/copilot-1.0.54-session-new-full.jsonl`, `src/main/data-layer/acp/protocol.test.ts`.
  - Dependencies: T015.
  - Acceptance: The helper parses annotated sanitized JSONL, strips `direction` for ACP validation, fixture lines contain exactly one ACP message plus Concierge annotation, observed Copilot facts are unchanged, and `protocol.test.ts` passes.

## Phase 4 - Transcript writer and sanitizer

- [ ] T017 Add transcript writer sanitization behavior test (RED).
  - Paths: `src/main/data-layer/acp/transcript.test.ts`.
  - Dependencies: T016.
  - Acceptance: The test uses filesystem/time boundary controls and asserts a transcript write stores annotated JSONL under `userData/transcripts/<sessionId>/<step>-<timestamp>.jsonl` while replacing local home paths, replacing session UUIDs with a stable placeholder, and stripping timestamp values from replayable records.

- [ ] T018 Implement transcript writer and sanitizer (GREEN).
  - Paths: `src/main/data-layer/acp/transcript.ts`.
  - Dependencies: T017.
  - Acceptance: `transcript.ts` writes one sanitized annotated JSON object per line, preserves `client->agent` and `agent->client` directions, uses the planned transcript path, surfaces filesystem errors explicitly, and `transcript.test.ts` passes.

## Phase 5 - Session creation and streaming updates

- [ ] T019 Add `newSession` behavior test (RED).
  - Paths: `src/main/data-layer/acp/supervisor.test.ts`.
  - Dependencies: T018.
  - Acceptance: Through a started `BoundCLISession`, the test asserts `newSession(cwd, mcpServers)` sends ACP `session/new`, includes working-directory and MCP-server parameters, returns the session identifier, and writes transcript evidence.

- [ ] T020 Implement `newSession` support (GREEN).
  - Paths: `src/main/data-layer/acp/agent.ts`, `src/main/data-layer/acp/types.ts`, `src/main/data-layer/acp/protocol.ts`, `src/main/data-layer/acp/supervisor.ts`.
  - Dependencies: T019.
  - Acceptance: `BoundCLISession.newSession()` returns a typed session ID, routes through SDK-managed ACP calls, records transcript entries, defers Concierge MCP integration behavior, and the new session test passes.

- [ ] T021 Add prompt streaming update behavior test (RED).
  - Paths: `src/main/data-layer/acp/supervisor.test.ts`, `src/main/data-layer/acp/protocol.test.ts`.
  - Dependencies: T020.
  - Acceptance: The test proves `prompt()` surfaces ACP `session/update` notifications through the `params.update.sessionUpdate` discriminator and handles unknown future update kinds without crashing.

- [ ] T022 Implement prompt and `session/update` routing (GREEN).
  - Paths: `src/main/data-layer/acp/agent.ts`, `src/main/data-layer/acp/types.ts`, `src/main/data-layer/acp/protocol.ts`, `src/main/data-layer/acp/supervisor.ts`.
  - Dependencies: T021.
  - Acceptance: `BoundCLISession.prompt()` transitions lifecycle state to `prompting`, forwards typed streaming updates to callers, records transcript evidence, returns to `ready` on completion, and the streaming update tests pass.

## Phase 6 - Model and mode configuration

- [ ] T023 Add standard model selector behavior test (RED).
  - Paths: `src/main/data-layer/acp/supervisor.test.ts`.
  - Dependencies: T022.
  - Acceptance: The test asserts `setModel(modelId)` uses standard `configOptions[id=model]` via `setSessionConfigOption` and rejects model changes while a step is both pending and running.

- [ ] T024 Implement standard model selection (GREEN).
  - Paths: `src/main/data-layer/acp/agent.ts`, `src/main/data-layer/acp/types.ts`, `src/main/data-layer/acp/protocol.ts`, `src/main/data-layer/acp/supervisor.ts`.
  - Dependencies: T023.
  - Acceptance: `setModel()` selects the verified Copilot model configuration option, preserves an explicit bounded non-Copilot fallback posture without using `unstable_setSessionModel` as Copilot source of truth, records the result, and the model selector test passes.

- [ ] T025 Add Agent default mode behavior test (RED).
  - Paths: `src/main/data-layer/acp/supervisor.test.ts`.
  - Dependencies: T024.
  - Acceptance: The test asserts new sessions default to `https://agentclientprotocol.com/protocol/session-modes#agent` when no mode is explicitly selected.

- [ ] T026 Implement Agent default mode handling (GREEN).
  - Paths: `src/main/data-layer/acp/agent.ts`, `src/main/data-layer/acp/types.ts`, `src/main/data-layer/acp/supervisor.ts`.
  - Dependencies: T025.
  - Acceptance: Mode constants use full ACP URIs, Agent mode is the default, Plan mode is represented as supported, and the Agent default test passes.

- [ ] T027 Add Autopilot opt-in behavior test (RED).
  - Paths: `src/main/data-layer/acp/supervisor.test.ts`.
  - Dependencies: T026.
  - Acceptance: The test asserts Autopilot mode requires an explicit recorded user decision of `allow` and is never selected implicitly.

- [ ] T028 Implement Autopilot opt-in recording (GREEN).
  - Paths: `src/main/data-layer/acp/agent.ts`, `src/main/data-layer/acp/types.ts`, `src/main/data-layer/acp/supervisor.ts`.
  - Dependencies: T027.
  - Acceptance: Session startup accepts Autopilot only with recorded `allow`, rejects implicit Autopilot selection, does not bypass top-level cancellation, and the Autopilot test passes. **Mid-session mode changes via `setMode()` are NOT in Run 3 scope per grill Q7** — `setMode()` is exposed as a public method but its Run 3 acceptance is "throws `ModeChangeDeferredError` for any non-startup invocation." Mid-session mode-change behavior is deferred to Run 7-9.

## Phase 7 - Session listing and loading

- [ ] T029 Add session listing behavior test (RED).
  - Paths: `src/main/data-layer/acp/supervisor.test.ts`.
  - Dependencies: T028.
  - Acceptance: The test asserts `listSessions()` uses ACP `session/list`, returns typed session summaries, and does not read Copilot private state.

- [ ] T030 Implement session listing (GREEN).
  - Paths: `src/main/data-layer/acp/agent.ts`, `src/main/data-layer/acp/types.ts`, `src/main/data-layer/acp/protocol.ts`, `src/main/data-layer/acp/supervisor.ts`.
  - Dependencies: T029.
  - Acceptance: `listSessions()` routes through SDK-managed ACP calls, maps results into Concierge-owned types, records transcript evidence where applicable, and the listing test passes.

- [ ] T031 Add session loading behavior test (RED).
  - Paths: `src/main/data-layer/acp/supervisor.test.ts`.
  - Dependencies: T030.
  - Acceptance: The test asserts `loadSession(sessionId)` uses ACP `session/load`, returns a typed loaded session result, and does not inspect Copilot private state.

- [ ] T032 Implement session loading (GREEN).
  - Paths: `src/main/data-layer/acp/agent.ts`, `src/main/data-layer/acp/types.ts`, `src/main/data-layer/acp/protocol.ts`, `src/main/data-layer/acp/supervisor.ts`.
  - Dependencies: T031.
  - Acceptance: `loadSession()` routes through SDK-managed ACP calls, maps results into Concierge-owned types, preserves lifecycle state correctly, and the loading test passes.

## Phase 8 - Cancellation, disposal, and crash supervision

- [ ] T033 Add acknowledged cancellation behavior test (RED).
  - Paths: `src/main/data-layer/acp/supervisor.test.ts`.
  - Dependencies: T032.
  - Acceptance: The test asserts `cancel()` sends ACP `session/cancel`, transitions through `cancelling`, returns to a terminal/ready state on acknowledgement, and records transcript evidence.

- [ ] T034 Implement acknowledged cancellation (GREEN).
  - Paths: `src/main/data-layer/acp/agent.ts`, `src/main/data-layer/acp/types.ts`, `src/main/data-layer/acp/protocol.ts`, `src/main/data-layer/acp/supervisor.ts`.
  - Dependencies: T033.
  - Acceptance: `cancel()` sends the ACP cancellation request, handles acknowledgement without killing the child process, updates lifecycle state, and the acknowledged cancellation test passes.

- [ ] T035 Add cancellation timeout behavior test (RED).
  - Paths: `src/main/data-layer/acp/supervisor.test.ts`.
  - Dependencies: T034.
  - Acceptance: The test asserts an unacknowledged `cancel()` waits at most 5 seconds before terminating the child process and records the timeout outcome.

- [ ] T036 Implement cancellation timeout termination (GREEN).
  - Paths: `src/main/data-layer/acp/supervisor.ts`, `src/main/data-layer/acp/types.ts`.
  - Dependencies: T035.
  - Acceptance: Cancellation uses a 5-second graceful window, terminates the child process only after timeout, surfaces the outcome explicitly, and the timeout test passes.

- [ ] T037 Add graceful disposal behavior test (RED).
  - Paths: `src/main/data-layer/acp/supervisor.test.ts`.
  - Dependencies: T036.
  - Acceptance: The test asserts `dispose()` requests graceful close, closes streams/process resources, removes listeners, transitions to `closed`, and does not leak the child process.

- [ ] T038 Implement graceful disposal (GREEN).
  - Paths: `src/main/data-layer/acp/supervisor.ts`, `src/main/data-layer/acp/protocol.ts`, `src/main/data-layer/acp/types.ts`.
  - Dependencies: T037.
  - Acceptance: `dispose()` gracefully closes the ACP connection and process resources, is safe to call once per session lifecycle, leaves no duplicate listeners, and the graceful disposal test passes.

- [ ] T039 Add disposal timeout behavior test (RED).
  - Paths: `src/main/data-layer/acp/supervisor.test.ts`.
  - Dependencies: T038.
  - Acceptance: The test asserts disposal waits at most 5 seconds for graceful close before terminating the child process and records the fallback outcome.

- [ ] T040 Implement disposal timeout termination (GREEN).
  - Paths: `src/main/data-layer/acp/supervisor.ts`, `src/main/data-layer/acp/types.ts`.
  - Dependencies: T039.
  - Acceptance: Disposal uses the bounded 5-second graceful window, terminates the child process on timeout, surfaces closure outcome explicitly, and the disposal timeout test passes.

- [ ] T041 Add crash supervision behavior test (RED).
  - Paths: `src/main/data-layer/acp/supervisor.test.ts`.
  - Dependencies: T040.
  - Acceptance: The test covers the full ADR-0004 crash matrix — FOUR separate cases: (1) clean unexpected exit (code != 0), (2) signal-induced termination (SIGSEGV), (3) explicit kill (SIGKILL), (4) simulated crash via stderr-then-exit. EACH case asserts lifecycle state becomes `errored`, exit code/signal/last 4KB stderr are logged, a `session-ended` event is emitted, and **NO automatic restart occurs**. Per ADR-0004 line 28.

- [ ] T042 Implement crash supervision policy (GREEN).
  - Paths: `src/main/data-layer/acp/supervisor.ts`, `src/main/data-layer/acp/types.ts`.
  - Dependencies: T041.
  - Acceptance: Unexpected exits become typed errors, structured pino logs include exit code, signal, and stderr tail, a session-ended event is emitted, no restart is attempted, and the crash test passes.

## Phase 9 - Proof IPC and preload bridge

- [ ] T043 Add `acp:probeBoundCLI` IPC handler behavior test (RED).
  - Paths: `src/main/ipc/acpProbe.test.ts`.
  - Dependencies: T042.
  - Acceptance: The test asserts the handler takes no parameters, calls `BoundCLISupervisor.start()`, returns `BoundCLICapabilities`, logs invocation/outcome/latency, disposes the session on success and failure, and registers no extra domain IPC channels.

- [ ] T044 Implement `acp:probeBoundCLI` IPC handler (GREEN).
  - Paths: `src/main/ipc/acpProbe.ts`.
  - Dependencies: T043.
  - Acceptance: The handler implements exactly the proof endpoint, launches the configured Copilot bound CLI through the supervisor, captures capabilities, disposes the session, logs structured outcome fields, propagates explicit errors, and `acpProbe.test.ts` passes.

- [ ] T045 Add boot registration behavior test for the ACP proof handler (RED).
  - Paths: `src/main/index.ts`, `src/main/ipc/acpProbe.test.ts`.
  - Dependencies: T044.
  - Acceptance: The test asserts app boot registers `acp:probeBoundCLI` exactly once after logger/manifest setup and before renderer proof calls can run.

- [ ] T046 Register ACP proof IPC at boot (GREEN).
  - Paths: `src/main/index.ts`.
  - Dependencies: T045.
  - Acceptance: Startup registers the ACP proof IPC handler exactly once alongside existing Run 2 boot work, introduces no additional IPC channels, and the boot registration test passes.

- [ ] T047 Add preload proof bridge behavior test (RED).
  - Paths: `src/preload/index.ts`, `src/main/ipc/acpProbe.test.ts`.
  - Dependencies: T046.
  - Acceptance: The test asserts preload exposes exactly one new renderer-callable proof bridge for `acp:probeBoundCLI` and does not expose raw Electron or Node APIs.

- [ ] T048 Implement preload proof bridge addition (GREEN).
  - Paths: `src/preload/index.ts`.
  - Dependencies: T047.
  - Acceptance: The preload bridge adds only the ACP proof call, preserves the existing app-version proof bridge, keeps the renderer surface narrow, and the preload bridge test passes.

## Phase 10 - Renderer proof API and proof surface

- [ ] T049a Add renderer-entry capabilities factory test (RED).
  - Paths: `src/renderer/api/capabilities.factory.spec.ts`.
  - Dependencies: T048.
  - Acceptance: Per constitution IV (every payload entering renderer from IPC/ACP/FS/HTTP MUST pass through a factory before any consumer sees it), the test asserts a renderer-side `parseRendererBoundCLICapabilities` factory covers the 6-case trust-boundary floor on whatever the preload bridge hands the renderer: happy path (Copilot 1.0.54 shape), `{}`, `null`, `undefined`, hostile (mismatched nested types from a malicious preload response), partial (missing `loadSession`). Constitution IV is non-negotiable; the main-side `capabilities.ts` factory does NOT cover the renderer trust boundary because the preload bridge is a distinct cross-process surface.

- [ ] T049b Implement renderer-entry capabilities factory (GREEN).
  - Paths: `src/renderer/api/capabilities.factory.ts`.
  - Dependencies: T049a.
  - Acceptance: Factory returns typed `BoundCLICapabilities` on valid input and stable named errors on invalid input; renderer-safe (no Electron/Node imports); used by the RTK Query endpoint (T050) before any consumer sees the value; passes its 6-case spec.

- [ ] T049 Add RTK Query bound CLI capabilities endpoint test (RED).
  - Paths: `src/renderer/api/index.test.ts`.
  - Dependencies: T049b.
  - Acceptance: The test asserts `getBoundCLICapabilities` calls the preload ACP proof bridge, passes the result through `parseRendererBoundCLICapabilities` (T049b) before returning it to consumers, returns the validated capability descriptor on happy path, preserves structured IPC errors, surfaces factory failures as typed errors, and provides the `Agent` tag without changing the fixed tag taxonomy.

- [ ] T050 Implement RTK Query bound CLI capabilities endpoint (GREEN).
  - Paths: `src/renderer/api/index.ts`.
  - Dependencies: T049.
  - Acceptance: The API slice adds only `getBoundCLICapabilities`, uses the existing preload-backed base query, runs the response through `parseRendererBoundCLICapabilities` per constitution IV, provides the `Agent` tag, imports no Electron APIs or Node built-ins, and `src/renderer/api/index.test.ts` passes.

- [ ] T051 Add renderer proof-surface behavior test (RED).
  - Paths: `src/renderer/index.tsx`, `src/renderer/api/index.test.ts`.
  - Dependencies: T050.
  - Acceptance: The test asserts the existing proof surface can render the returned bound CLI capability shape without mounting product ACP session UI or a product Redux Provider.

- [ ] T052 Render bound CLI proof result in the existing proof surface (GREEN).
  - Paths: `src/renderer/index.tsx`.
  - Dependencies: T051.
  - Acceptance: The renderer displays enough of the capability descriptor to prove the endpoint works, keeps the UI proof-only, surfaces no raw IPC errors, and the renderer proof test passes.

## Phase 11 - Real bound CLI smoke and verification

- [ ] T053 Add real bound CLI proof smoke test (RED).
  - Paths: `e2e/smoke.spec.ts`.
  - Dependencies: T052.
  - Acceptance: The Playwright Electron smoke test invokes the real configured Copilot CLI through `acp:probeBoundCLI`, expects verified capabilities within 10 seconds in a correctly configured local environment, and fails before the full proof path is wired.

- [ ] T054 Complete real proof wiring and cleanup (GREEN).
  - Paths: `src/main/data-layer/acp/supervisor.ts`, `src/main/ipc/acpProbe.ts`, `src/preload/index.ts`, `src/renderer/index.tsx`, `e2e/smoke.spec.ts`.
  - Dependencies: T053.
  - Acceptance: The app can invoke the real configured Copilot bound CLI through the proof path, returns capabilities within the target window, disposes without leaked processes/listeners, and the smoke test passes.

- [ ] T055 Verify Run 3 automated checks (expanded).
  - Paths: `package.json`, `src/main/data-layer/acp/agent.ts`, `src/main/data-layer/acp/types.ts`, `src/main/data-layer/acp/capabilities.ts`, `src/main/data-layer/acp/protocol.ts`, `src/main/data-layer/acp/transcript.ts`, `src/main/data-layer/acp/supervisor.ts`, `src/main/ipc/acpProbe.ts`, `src/preload/index.ts`, `src/renderer/api/index.ts`, `src/renderer/api/capabilities.factory.ts`, `src/renderer/index.tsx`, `e2e/smoke.spec.ts`, `docs/adr/0004-acp-process-supervision-policy.md`, `docs/adr/0005-acp-session-modes-posture.md`, `docs/adr/0006-acp-testing-discipline.md`, `.github/copilot-instructions.md`, `ROADMAP_DECISIONS.md`.
  - Dependencies: T054.
  - Acceptance: ALL must pass:
    - `npm run lint`, `npm run typecheck`, `npm run test:coverage`, `npm run e2e` exit 0.
    - **SC-006 test-count threshold:** `npm run test:coverage 2>&1 | grep -oE "Tests +[0-9]+ passed"` reports >= 75 passing tests.
    - **SC-008 ADR presence:** `ls docs/adr/0004*.md docs/adr/0005*.md docs/adr/0006*.md` all exist; each file has `Status: Accepted` (grep).
    - **SC-009 roadmap correction:** `grep -c "configOptions\[id=model\]\|configOptions selector" ROADMAP_DECISIONS.md` >= 1 AND `grep -c "unstable_setSessionModel" ROADMAP_DECISIONS.md` notes it as superseded (not the canonical mechanism).
    - **FR-028 copilot-instructions:** `grep -c "Run 3 conventions" .github/copilot-instructions.md` >= 1; contains ACP layer paths + Autopilot opt-in posture.

- [ ] T056 Verify ACP-only process and wire boundary (expanded grep).
  - Paths: `src/main/data-layer/acp/supervisor.ts`, `src/main/data-layer/acp/protocol.ts`, `src/main/index.ts`, `src/main/ipc/acpProbe.ts`, `src/preload/index.ts`, `src/renderer/api/index.ts`, `src/renderer/api/capabilities.factory.ts`, `src/renderer/index.tsx`.
  - Dependencies: T055.
  - Acceptance: Boundary verification via expanded grep — ALL coding-agent process/wire patterns must be confined to `src/main/data-layer/acp/` (and test files / imports that prove the boundary):
    - `rg "child_process|spawn\\(|spawnSync\\(|exec\\(|execFile\\(|fork\\(" src --type ts` — process spawn primitives
    - `rg "@agentclientprotocol/sdk" src --type ts` — SDK imports
    - `rg "ClientSideConnection|ndJsonStream|JsonRpcConnection" src --type ts` — wire-level types
    - `rg "(copilot|claude|codex|gemini).*--acp" src --type ts` — direct bound-CLI invocations with --acp flag
    - `rg "(exec|execFile|spawn|spawnSync|fork)\\([^)]*['\"](copilot|claude|codex|gemini)" src --type ts` — direct exec/spawn of any ACP-capable bound CLI binary regardless of flag
    - `rg "process\\.stdin|process\\.stdout.*write" src --type ts` — direct stdio JSON-RPC writes
    - `rg "stdin\\.write|\\.stdin\\.write" src --type ts` — aliased writable streams (e.g., `child.stdin.write(...)`, `agentProcess.stdin.write(...)`)
    - `rg "Writable\\.toWeb|Readable\\.toWeb" src --type ts` — stream-to-web-stream conversion paths that could route JSON-RPC out of the ACP layer
    - `rg "JSON\\.stringify\\(.*jsonrpc" src --type ts` — direct JSON-RPC envelope construction
    - Each grep result MUST be confined to `src/main/data-layer/acp/` OR be a test/import line that demonstrates the boundary. Out-of-layer matches FAIL the task.

## Parallel opportunities

No implementation tasks are marked parallel because Run 3 uses vertical tracer-bullet TDD. Execute each RED task, then its paired GREEN task, before moving to the next behavior. Only final verification commands in T055 may be run independently after T054 is complete.

## Implementation strategy

1. Start with T001/T002 exactly: supervisor start through the public interface, then minimal protocol/supervisor code.
2. Grow the capability factory floor one failing case at a time.
3. Normalize transcript contracts before adding runtime transcript writing.
4. Add session operations vertically: create, stream updates, configure model/mode, list/load, cancel/dispose, and crash behavior.
5. Add the single proof IPC path, then preload and renderer proof access.
6. Finish with real bound CLI smoke and boundary verification.
