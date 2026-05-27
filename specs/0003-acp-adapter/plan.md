# Run 3 Implementation Plan - ACP Adapter & Bound CLI Supervisor

**Branch**: `spec/0003-acp-adapter` | **Date**: 2026-05-27 | **Spec**: `specs/0003-acp-adapter/spec.md`

**Input**: Feature specification from `specs/0003-acp-adapter/spec.md`; locked grill decisions from `specs/0003-acp-adapter/grill.md`; clarification completed with no open questions; authoritative verify-now ACP transcripts in `tests/fixtures/acp-transcripts/`.

## Summary

Run 3 builds the ACP-only bound CLI seam for Concierge. It adds the `src/main/data-layer/acp/` layer that owns all coding-agent process creation and ACP communication, wraps `@agentclientprotocol/sdk@0.22.1` behind a Concierge-owned `CodingAgent` contract, records sanitized annotated JSONL transcripts, supervises Copilot CLI crash/cancel/dispose behavior, and exposes exactly one proof IPC path: `acp:probeBoundCLI`.

The two captured Copilot CLI 1.0.54 transcripts are empirical source of truth for protocol shape. They correct the stale roadmap assumption about model switching: Copilot model selection uses the standard ACP `configOptions` selector with `id: "model"`, not `unstable_setSessionModel`.

## Technical Context

**Language/Version**: TypeScript 5.7.2, `strict` and `noUncheckedIndexedAccess`.

**Primary Dependencies**: Electron 33.2.1, React 18.3.1, pino 9.x, Vitest 2.1.8, Playwright 1.49.1, RTK Query from `@reduxjs/toolkit@2.12.0`, and the new exact runtime pin `@agentclientprotocol/sdk@0.22.1`.

**Storage**: Local filesystem under `app.getPath('userData')/transcripts/<sessionId>/<step>-<timestamp>.jsonl` for ACP transcript evidence; pino logs under `app.getPath('userData')/logs/`.

**Testing**: Vitest co-located specs using vertical tracer bullets, transcript contract tests from `tests/fixtures/acp-transcripts/`, one six-case trust-boundary factory spec for `capabilities.ts`, boundary mocks for `child_process` and filesystem writes, Playwright Electron smoke for the proof endpoint.

**Target Platform**: Electron desktop app. CI remains Windows-only from Run 1, but ACP process supervision must avoid platform-specific shell behavior and keep spawn options cross-platform.

**Project Type**: Desktop app with main/preload/renderer split.

**Performance Goals**: `acp:probeBoundCLI` returns verified capabilities within 10 seconds in a correctly configured local environment; cancellation and disposal each allow at most 5 seconds for graceful completion before terminating the child process.

**Constraints**: Do not redo Run 2. Do not add dependencies other than `@agentclientprotocol/sdk@0.22.1`. Do not hand-roll JSON-RPC framing. Do not mock the SDK. Do not auto-restart a crashed bound CLI. Do not add domain IPC, store mounting, Step Commit writers, hook execution, Concierge MCP integration, Jira submission, Windows packaging changes, or product ACP UI beyond the capability proof surface.

**Scale/Scope**: One v1 bound CLI implementation, GitHub Copilot CLI 1.0.54 via the existing verified manifest entry. Interfaces admit future ACP agents, but Run 3 tests and proof behavior are grounded in Copilot verify-now evidence.

## Tech-Stack Delta from Run 2

| Area | Run 2 baseline | Run 3 delta |
|---|---|---|
| ACP runtime | No ACP supervisor/client implementation | Add exact runtime dependency `@agentclientprotocol/sdk@0.22.1` |
| Main data layer | `fs/`, `git/`, `agents/` | Add `src/main/data-layer/acp/` |
| IPC | `app:getVersion` proof channel only | Add exactly one proof channel: `acp:probeBoundCLI` |
| Renderer API | RTK Query base query and app-version proof | Add one Agent-tagged query for bound CLI capabilities |
| Test discipline | Run 2 factory specs used horizontal delivery for speed | Run 3 uses vertical tracer bullets: one RED test, one minimal GREEN implementation, repeat |
| Transcripts | Fixtures exist as verify-now evidence | Normalize and contract-test annotated sanitized JSONL with `direction` |

No other runtime or dev dependency is planned for Run 3.

## Constitution Check

**Gate status**: Pass.

- Principle III: all coding-agent process creation and ACP wire communication is isolated under `src/main/data-layer/acp/`; no other layer may spawn or speak to a coding-agent binary.
- Principle IV: ACP initialize capability data crosses a trust boundary, so `src/main/data-layer/acp/capabilities.ts` is a hand-written factory with the required six-case floor. No runtime schema library is introduced.
- Principle V: side effects stay in Effect-layer modules (`supervisor.ts`, `protocol.ts`, `transcript.ts`, IPC registration). Pure transforms and types remain side-effect-free.
- Principle VI: renderer access uses the preload bridge and RTK Query under `src/renderer/api/`; renderer code does not import Electron APIs or Node built-ins.
- Principle XV: structured pino logging records proof invocations and supervisor outcomes, including crash exit code, signal, and last 4KB stderr.
- TDD discipline: `.agents/skills/tdd/SKILL.md` was read before sequencing. Implementation must use vertical tracer bullets, not horizontal slicing.

No complexity-tracking violations are introduced.

## Project Structure

### Documentation (this feature)

```text
specs/0003-acp-adapter/
|-- spec.md
|-- grill.md
|-- clarifications.md
|-- plan.md
|-- research.md
|-- checklists/
|   `-- requirements.md
`-- tasks.md                  # created by /speckit.tasks, not this plan

docs/adr/
|-- 0004-acp-process-supervision-policy.md
|-- 0005-acp-session-modes-posture.md
`-- 0006-acp-testing-discipline.md

.github/
`-- copilot-instructions.md   # Run 3 conventions

ROADMAP_DECISIONS.md          # model-swap correction
```

### Source Code (repository root)

```text
src/
|-- main/
|   |-- index.ts                         # registers Run 2 boot work plus ACP proof IPC
|   |-- ipc/
|   |   |-- appVersion.ts                # existing Run 2 proof channel
|   |   |-- acpProbe.ts                  # registers acp:probeBoundCLI only
|   |   `-- acpProbe.test.ts
|   `-- data-layer/
|       |-- agents/                      # existing Run 2 manifest and loader; do not reseed
|       |-- fs/
|       |-- git/
|       `-- acp/
|           |-- agent.ts                 # public CodingAgent contract and session interface
|           |-- types.ts                 # Concierge-owned ACP types
|           |-- capabilities.ts          # trust-boundary factory
|           |-- capabilities.factory.spec.ts
|           |-- protocol.ts              # SDK ClientSideConnection wrapper
|           |-- protocol.test.ts         # transcript contract tests
|           |-- transcript.ts            # annotated JSONL writer + sanitizer
|           |-- transcript.test.ts
|           |-- supervisor.ts            # child_process lifecycle and crash policy
|           `-- supervisor.test.ts
|-- preload/
|   `-- index.ts                         # exposes acp:probeBoundCLI bridge addition
|-- renderer/
|   |-- index.tsx                        # existing proof surface may render capability shape
|   `-- api/
|       |-- baseQuery.ts
|       |-- index.ts                     # adds getBoundCLICapabilities tagged Agent
|       `-- index.test.ts
`-- test/
    |-- setup.ts
    |-- rtkQueryStore.ts                 # existing test helper if already present/needed
    `-- acpTranscript.ts                 # test-only fixture helpers, if first tracer proves useful

tests/
`-- fixtures/
    `-- acp-transcripts/
        |-- copilot-1.0.54-initialize.jsonl
        `-- copilot-1.0.54-session-new-full.jsonl
```

**Structure Decision**: Keep the Run 2 post-refactor layout. Main-process ACP modules live only under `src/main/data-layer/acp/`. IPC registration remains under `src/main/ipc/`. Renderer data access remains under `src/renderer/api/` and must go through the preload bridge.

## Public Interfaces

### Main data-layer contract

`src/main/data-layer/acp/agent.ts` owns the public contract for downstream Concierge code:

- `CodingAgent` exposes `start()`, `listSessions()`, `loadSession()`, and supported configuration operations through Concierge-owned types.
- `BoundCLISession` exposes lifecycle state `initializing`, `ready`, `prompting`, `cancelling`, `closed`, and `errored`.
- `BoundCLISupervisor.start()` launches the manifest-selected bound CLI with ACP enabled, initializes the SDK connection, parses capabilities, and returns a session object.
- `BoundCLISession` supports `newSession`, `prompt`, `cancel`, `dispose`, `setModel`, `setMode`, `listSessions`, and `loadSession`.

The SDK remains behind this contract. No SDK types should leak into renderer/preload surfaces unless wrapped in a stable Concierge-owned type.

### Proof IPC contract

`acp:probeBoundCLI`:

- Takes no parameters.
- Launches the configured Copilot bound CLI through `BoundCLISupervisor`.
- Performs initialize capability discovery.
- Writes/sanitizes transcript evidence.
- Disposes the child process.
- Returns `BoundCLICapabilities`.
- Logs invocation and outcome.

No additional domain IPC is in scope.

## Factory-Spec Convention

Run 3 has exactly one new six-case trust-boundary factory floor: `src/main/data-layer/acp/capabilities.ts`.

`capabilities.factory.spec.ts` must include:

1. Happy path: full Copilot CLI 1.0.54 initialize descriptor returns `BoundCLICapabilities`.
2. Empty object: `{}` returns a named `InvalidBoundCLICapabilities` error.
3. Null: `null` returns a named `InvalidBoundCLICapabilities` error.
4. Undefined: `undefined` returns a named `InvalidBoundCLICapabilities` error.
5. Hostile malformed nested types: e.g. `agentCapabilities.loadSession` or `promptCapabilities.image` has the wrong type.
6. Partial structurally-plausible input: e.g. missing `agentCapabilities.loadSession`.

Trailer-style lenient parser conventions do not apply to ACP capability parsing. Transcript parsing/replay helpers are contract-test infrastructure, not trust-boundary factories, and must not invent a second factory-floor requirement.

## Transcript Fixture Convention

ACP fixtures and runtime transcripts are annotated JSONL:

```jsonl
{"direction":"client->agent","jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":1,"clientCapabilities":{}}}
{"direction":"agent->client","jsonrpc":"2.0","id":1,"result":{"protocolVersion":1,"agentCapabilities":{}}}
```

Rules:

- One JSON object per line.
- `direction` is a Concierge annotation, not ACP wire data.
- Valid values are `client->agent` and `agent->client`.
- Contract tests strip `direction` before passing messages into SDK/schema validation.
- Sanitization replaces local home paths, session UUIDs, and timestamp values before fixtures are committed.
- Runtime transcript path is `userData/transcripts/<sessionId>/<step>-<timestamp>.jsonl`.

The captured `copilot-1.0.54-initialize.jsonl` and `copilot-1.0.54-session-new-full.jsonl` fixtures are authoritative evidence. If their current formatting differs, implementation tasks normalize them to this convention without changing the observed ACP facts.

## ACP Session Mode Posture

Use these verified session-mode URIs:

| Mode | URI | Run 3 posture |
|---|---|---|
| Agent | `https://agentclientprotocol.com/protocol/session-modes#agent` | Default |
| Plan | `https://agentclientprotocol.com/protocol/session-modes#plan` | Supported, opt-in at session startup |
| Autopilot | `https://agentclientprotocol.com/protocol/session-modes#autopilot` | Supported, opt-in only |

The settled Q7 user decision is `allow`: Autopilot is not banned. It is never the default, and choosing it requires recording the user's `allow` decision. Autopilot does not bypass top-level cancellation; future renderer confirmation UI remains deferred.

## TDD Vertical Tracer-Bullet Sequence

Per `.agents/skills/tdd/SKILL.md`, Run 3 must proceed one behavior at a time: one RED test, one minimal GREEN implementation, then repeat. Do not write all tests first.

1. **Tracer bullet: supervisor start returns verified capabilities**
   - RED: Through the public `BoundCLISupervisor.start()` interface, use the Copilot 1.0.54 initialize transcript or a boundary-controlled child process stream to prove start returns the verified capability descriptor and dispose closes cleanly.
   - GREEN: Add the minimal `agent.ts`, `protocol.ts`, `capabilities.ts`, and `supervisor.ts` needed to spawn/connect/initialize/parse/dispose.

2. **Capability factory floor**
   - RED: Add exactly one missing floor case at a time in `capabilities.factory.spec.ts`.
   - GREEN: Extend `capabilities.ts` only enough to return stable named errors and typed output for that case.

3. **Transcript contract normalization**
   - RED: One fixture contract test proves every line has `direction`, strips it back to ACP wire shape, and validates initialize/session-new facts.
   - GREEN: Add minimal fixture helper and normalize fixtures as needed.

4. **Transcript write and sanitization**
   - RED: One public transcript-writer behavior proves home path, UUID, and timestamp sanitization in the written JSONL.
   - GREEN: Add `transcript.ts` sanitizer and writer with filesystem mocked only at the boundary.

5. **Session creation and streaming updates**
   - RED: A transcript-backed test proves `newSession(cwd, mcpServers)` returns session ID and `session/update` notifications surface through `params.update.sessionUpdate`.
   - GREEN: Add minimal session creation and notification routing.

6. **Model selection by config option**
   - RED: A test proves `setModel(modelId)` selects `configOptions[id=model]` only when no step is both pending and running.
   - GREEN: Add minimal config-option update path; leave `unstable_setSessionModel` only as documented non-Copilot fallback if needed.

7. **Mode selection with Agent default and Autopilot opt-in**
   - RED: A test proves Agent is default and Autopilot requires an explicit recorded `allow` decision.
   - GREEN: Add mode parameter handling and mode URI constants.

8. **Session list/load**
   - RED: A test proves `listSessions` and `loadSession` use ACP APIs rather than reading Copilot private state.
   - GREEN: Add minimal SDK calls and typed return mapping.

9. **Cancellation and disposal timeouts**
   - RED: A test proves `cancel()` sends ACP `session/cancel`, waits up to 5 seconds, then terminates the process if not acknowledged.
   - GREEN: Add cancel timeout handling; repeat for dispose graceful-close timeout.

10. **Crash supervision**
    - RED: A child-process boundary test proves unexpected exit enters `errored`, logs exit code/signal/last-4KB stderr, emits `session-ended`, and does not restart.
    - GREEN: Add crash state transition and event emission.

11. **Proof IPC and preload bridge**
    - RED: A handler test proves `acp:probeBoundCLI` takes no parameters, calls the supervisor, returns capabilities, logs outcome, and disposes.
    - GREEN: Add `src/main/ipc/acpProbe.ts` and one preload bridge addition.

12. **Renderer API proof surface**
    - RED: An RTK Query test proves `getBoundCLICapabilities` uses the preload bridge and provides the `Agent` tag.
    - GREEN: Add the endpoint and render the returned capability shape only in the existing proof surface.

13. **Real bound CLI smoke**
    - RED: E2E proof fails until the app can invoke the real configured Copilot CLI through `acp:probeBoundCLI`.
    - GREEN: Wire boot registration and fix process cleanup until the proof path completes without leaks.

Each cycle must keep tests behavior-focused and public-interface-oriented. Mock only system boundaries: `child_process`, filesystem, time, and Electron IPC where appropriate. The SDK is an internal collaborator and should be exercised, not mocked.

## Implementation Sequence for `tasks.md`

1. Add exact dependency pin `@agentclientprotocol/sdk@0.22.1` and refresh lockfile.
2. Normalize ACP fixture format only as needed for annotated sanitized JSONL.
3. Add `src/main/data-layer/acp/agent.ts` and minimal public types required by the first tracer bullet.
4. Add `capabilities.ts` and grow its six-case factory floor vertically.
5. Add `protocol.ts` using SDK `ClientSideConnection` and `ndJsonStream`; no hand-rolled request correlation.
6. Add `supervisor.ts` using `child_process.spawn` with `stdio: ['pipe', 'pipe', 'pipe']`, `shell: false`, existing manifest args, stderr ring buffer, typed lifecycle states, and no auto-restart.
7. Add `transcript.ts` for annotated JSONL writing and sanitization.
8. Add session operations: `newSession`, prompt/update streaming, `setModel`, `setMode`, `listSessions`, `loadSession`, `cancel`, and `dispose`.
9. Add `src/main/ipc/acpProbe.ts`, register it in `src/main/index.ts`, and log every invocation.
10. Extend `src/preload/index.ts` with exactly one proof bridge addition.
11. Extend `src/renderer/api/index.ts` with `getBoundCLICapabilities`, tagged `Agent`.
12. Render the proof result only in the existing proof surface.
13. Add/complete ADR-0004, ADR-0005, ADR-0006 and project guidance updates.
14. Run lint, typecheck, coverage, and e2e verification; fix only issues caused by Run 3 work.

## Functional Requirements Coverage

| Requirement | Plan coverage |
|---|---|
| FR-001, FR-032 | ACP-only source layout and grep/ESLint verification for no out-of-layer coding-agent spawn/wire paths |
| FR-002 | Exact `@agentclientprotocol/sdk@0.22.1` dependency pin |
| FR-003, FR-013, FR-014 | `agent.ts`, `types.ts`, `BoundCLISession` lifecycle and operations |
| FR-004, FR-008 | SDK `ClientSideConnection`, `ndJsonStream`, and `session/update` notification routing |
| FR-005, FR-006, FR-007 | `capabilities.ts` six-case factory floor and Copilot 1.0.54 initialize facts |
| FR-009, FR-010 | `newSession`, `listSessions`, `loadSession` |
| FR-011 | Agent default plus Plan/Autopilot URI constants and opt-in posture |
| FR-012, FR-029 | `configOptions[id=model]` selector path and roadmap correction |
| FR-015 through FR-018 | Annotated sanitized JSONL transcript writer and fixture normalization |
| FR-019 through FR-022 | Cancel/dispose timeout handling and no-auto-restart crash policy |
| FR-023 through FR-026 | `acp:probeBoundCLI`, preload bridge, RTK Query endpoint, proof rendering |
| FR-027, FR-028 | ADR-0004 through ADR-0006 and `.github/copilot-instructions.md` Run 3 conventions |
| FR-030 | First vertical tracer bullet sequence |
| FR-031 | Out-of-scope exclusions below |

## Success Criteria Mapping

| Spec criterion | Plan coverage |
|---|---|
| SC-001 | `acp:probeBoundCLI` proof endpoint with real Copilot smoke target under 10 seconds |
| SC-002 | ACP-only process/wire boundary under `src/main/data-layer/acp/` |
| SC-003 | Annotated sanitized JSONL writer and fixture contract tests |
| SC-004 | Cancel/dispose 5-second graceful windows plus terminate fallback |
| SC-005 | Typed error state, structured crash log fields, `session-ended`, zero auto-restart |
| SC-006 | Test expansion across transcript contracts, capability factory floor, supervisor lifecycle, transcript writing, proof smoke |
| SC-007 | Lint, typecheck, coverage, and e2e verification |
| SC-008 | ADR-0004, ADR-0005, ADR-0006 |
| SC-009 | ROADMAP model-swap correction |
| SC-010 | First test/module slice proves supervisor start and initialize capability discovery |

## Out of Scope

- Redoing Run 2 data-layer foundation, layout refactor, manifest loader, or `app:getVersion` proof work.
- Constitution amendments; v1.0.4 is already current.
- ADR-0002 or ADR-0003 rewrites.
- Re-seeding `agents.json`; Run 3 consumes the existing verified Copilot `--acp` entry.
- Domain IPC beyond `acp:probeBoundCLI`.
- Redux Provider/store mounting in product UI.
- Step Commit writers, hook execution, domain step factories, Step Lifecycle UI hooks.
- Product ACP session UI beyond the existing capability proof surface.
- HTTP API, Concierge MCP integration, Jira submission, or Windows packaging changes.
- Re-litigating the nine settled grill decisions.

## Verification

Run and pass:

```bash
npm run lint
npm run typecheck
npm run test:coverage
npm run e2e
```

Additional Run 3 verification:

```bash
rg "spawn\\(|exec\\(|ClientSideConnection|ndJsonStream" src
```

Expected outcome: coding-agent process creation and ACP wire communication are confined to `src/main/data-layer/acp/`, except tests and imports that prove the boundary.
