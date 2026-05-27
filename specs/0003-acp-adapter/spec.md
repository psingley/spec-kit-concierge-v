# Feature Specification: ACP Adapter & Bound CLI Supervisor

**Feature Branch**: `spec/0003-acp-adapter`

**Created**: 2026-05-27

**Status**: Draft

**Input**: User description: "Run 3: ACP Adapter & Bound CLI Supervisor. Build the ACP-only bound CLI seam for the Concierge Electron desktop app using the locked Run 3 grill decisions from `specs/0003-acp-adapter/grill.md`; do not re-raise the nine settled decisions."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Verify Bound CLI Capabilities (Priority: P1)

As a Concierge operator or maintainer, I need the app to prove it can launch the configured Copilot bound CLI through the ACP-only seam and return the verified capability descriptor, so that later product flows can rely on a working, constitution-compliant agent connection.

**Why this priority**: This is the highest-risk seam in the roadmap and the first required proof that constitution III is enforceable in the running desktop app.

**Independent Test**: Can be tested by invoking the ACP probe path with no parameters and confirming it returns the same capability shape established by the Copilot CLI 1.0.54 verify-now fixture while shutting down the bound CLI cleanly.

**Acceptance Scenarios**:

1. **Given** the verified Copilot CLI manifest entry is available, **When** the ACP probe is invoked, **Then** Concierge launches the bound CLI only through the ACP layer, completes initialization, parses capabilities, disposes the session, and returns the typed capability descriptor.
2. **Given** the initialize response includes `agentCapabilities`, `authMethods`, `configOptions`, available models, and session modes, **When** capabilities are returned to the proof surface, **Then** the user can inspect load-session support, MCP transport support, prompt capabilities, list-session support, model cost metadata, and supported modes.
3. **Given** the proof endpoint is invoked, **When** it runs, **Then** a structured log entry records the invocation and outcome.

---

### User Story 2 - Maintain ACP Session Lifecycle (Priority: P1)

As a future Concierge workflow, I need a bound CLI session abstraction that can start, prompt, stream updates, cancel, dispose, list, load, and configure sessions according to the verified ACP behavior, so that downstream runs can build domain flows without spawning or speaking to agent binaries themselves.

**Why this priority**: The session lifecycle is the core reusable contract for all later Concierge agent interactions and must be complete before domain IPC, Step Commit writers, hook execution, and product UI are added.

**Independent Test**: Can be tested with transcript-based contract fixtures and boundary-supervised child-process tests that exercise initialization, session creation, streaming updates, model and mode configuration, session listing/loading, cancellation, disposal, and crash handling.

**Acceptance Scenarios**:

1. **Given** a bound CLI session is ready, **When** a new session is requested with a working directory and optional MCP server descriptors, **Then** the ACP session is created and its session identifier is available to callers.
2. **Given** a prompt is sent to a live session, **When** ACP `session/update` notifications arrive, **Then** callers receive typed streaming updates using the `params.update.sessionUpdate` discriminator.
3. **Given** no step is both pending and running, **When** a model change is requested, **Then** the session uses the standard model configuration selector and records the result without requiring a process restart for Copilot.
4. **Given** a session is live, **When** a mode is selected at startup or via the supported configuration path, **Then** Agent, Plan, and opt-in Autopilot modes are represented using the verified ACP mode identifiers.
5. **Given** past ACP sessions exist, **When** list or load is requested, **Then** Concierge uses ACP session listing/loading and does not inspect another tool's private state directly.

---

### User Story 3 - Preserve Transcript and Recovery Evidence (Priority: P2)

As a maintainer investigating agent behavior, cancellation, or crashes, I need every ACP message session written as sanitized annotated JSONL, so that behavior is reproducible without leaking local paths or volatile identifiers.

**Why this priority**: Disk-as-truth and recovery evidence are constitutional requirements, and transcript fixtures are the primary test discipline for this layer.

**Independent Test**: Can be tested by replaying the captured Copilot transcripts, verifying the annotated fixture format, and confirming runtime transcript writes create sanitized JSONL under the per-session transcript location.

**Acceptance Scenarios**:

1. **Given** ACP messages are exchanged, **When** transcript recording is enabled for a session step, **Then** each message is written as one JSON object per line with a Concierge-added `direction` field.
2. **Given** a transcript contains a local user home path, session UUID, or timestamp, **When** it is persisted as a fixture or runtime transcript, **Then** known PII and volatile values are sanitized according to the locked grill convention.
3. **Given** captured Run 3 fixtures exist, **When** contract tests read them, **Then** each line includes `direction` and can be stripped back to ACP wire shape before schema validation.

---

### User Story 4 - Surface Controlled Failure and Cancellation (Priority: P2)

As a user or downstream workflow, I need cancellation and process failures to end predictably and visibly, so that long-running or broken agent work does not silently continue or restart without consent.

**Why this priority**: Recovery and explicit cancel behavior are required by constitution VII and by the locked process-supervision decision.

**Independent Test**: Can be tested by simulating cancel acknowledgement, cancel timeout, graceful dispose, dispose timeout, and child-process crash cases while asserting session state, logs, emitted end events, and absence of auto-restart.

**Acceptance Scenarios**:

1. **Given** a prompt is in flight, **When** user-initiated cancellation is confirmed by an upstream consumer, **Then** the supervisor sends ACP `session/cancel` and allows up to 5 seconds for graceful cancellation before terminating the child process.
2. **Given** a bound CLI child process exits unexpectedly, **When** the supervisor observes the crash, **Then** the session enters an error state, exit code, signal, and recent stderr are logged, a session-ended event is emitted, and no automatic restart occurs.
3. **Given** disposal is requested, **When** the session does not close gracefully within the allowed period, **Then** the supervisor terminates the child process and records the closure outcome.

### Edge Cases

- The configured agent name is missing from the manifest or lacks an ACP entry.
- The configured binary path cannot be launched or exits before initialization completes.
- The initialize response is empty, partial, malformed, hostile, or missing `agentCapabilities.loadSession`.
- `protocolVersion` arrives as the verified numeric value rather than the stale string/package-version assumption.
- ACP notifications arrive before, during, or after request/response correlation for a prompt.
- `session/update` contains an unknown future update kind.
- Model or mode changes are requested while a step is pending and running.
- The bound CLI supports no model configuration selector; non-Copilot fallback behavior remains bounded and explicit.
- Cancellation is requested while tool calls are in flight; only state already written to disk is guaranteed.
- The child process crashes via exit, signal, kill, or out-of-memory condition.
- Runtime transcripts contain a local home path, UUID, or timestamp that must be sanitized in persisted/replayable material.
- The proof endpoint is invoked repeatedly and must not leak processes or duplicate listeners.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST establish `src/main/data-layer/acp/` as the only application layer allowed to spawn or communicate with a coding-agent CLI binary.
- **FR-002**: System MUST add exactly one new runtime dependency for ACP runtime behavior: `@agentclientprotocol/sdk@0.22.1`.
- **FR-003**: System MUST expose a typed `CodingAgent` contract as the single source of truth for bound CLI capabilities available to the rest of Concierge.
- **FR-004**: System MUST use SDK-managed ACP JSON-RPC framing, request/response correlation, notification handling, and on-wire schema validation behind the Concierge ACP contract.
- **FR-005**: System MUST parse ACP initialize capability data through a trust-boundary factory into a Concierge-owned `BoundCLICapabilities` shape.
- **FR-006**: The capabilities factory MUST satisfy the six-case trust-boundary floor: happy, empty object, null, undefined, hostile malformed nested types, and partial missing `agentCapabilities.loadSession`.
- **FR-007**: System MUST recognize the verified Copilot CLI 1.0.54 initialize facts: numeric `protocolVersion` value `1`, out-of-band auth methods, resumable sessions, listable sessions, MCP transport capability metadata, prompt capability metadata, supported models with premium multiplier metadata, and supported modes.
- **FR-008**: System MUST treat `session/update` as the streaming notification channel and use `params.update.sessionUpdate` as the session-update discriminator.
- **FR-009**: System MUST support ACP `session/new` with working-directory and MCP-server parameters while deferring Concierge MCP integration behavior to a later run.
- **FR-010**: System MUST support ACP session listing and loading through `session/list` and `session/load`.
- **FR-011**: System MUST default v1 sessions to Agent mode and represent Agent, Plan, and opt-in Autopilot modes using the verified ACP session-mode identifiers.
- **FR-012**: System MUST allow model changes only when no step is both pending and running, using the verified standard model configuration selector for Copilot and preserving a bounded fallback posture for non-Copilot bound CLIs that lack that selector.
- **FR-013**: System MUST provide a `BoundCLISession` lifecycle with states `initializing`, `ready`, `prompting`, `cancelling`, `closed`, and `errored`.
- **FR-014**: System MUST provide session operations for creating a session (with mode selected at startup), prompting with streamed updates, setting model (per Q3 standard configOptions selector), listing sessions, and loading a session. **Mode selection is startup-only in Run 3 per grill Q7** — `setMode()` exists as a public method but throws `ModeChangeDeferredError` for any non-startup invocation. Mid-session mode-change behavior is deferred to Run 7-9.
- **FR-015**: System MUST write every ACP message session to `userData/transcripts/<sessionId>/<step>-<timestamp>.jsonl` as disk-as-truth evidence.
- **FR-016**: Transcript entries MUST be annotated JSONL with Concierge-added `direction` values of `client->agent` or `agent->client`, one ACP message per line.
- **FR-017**: Transcript sanitization MUST replace local user home paths, replace session UUIDs with a stable placeholder, and strip timestamps where present in replayable fixtures.
- **FR-018**: System MUST backfill captured Copilot 1.0.54 initialize and session-new transcript fixtures to the locked annotated format before using them as contract seeds.
- **FR-019**: User-initiated cancellation MUST send ACP `session/cancel`, wait up to 5 seconds for graceful cancellation, and terminate the child process if the agent does not acknowledge in time.
- **FR-020**: Disposal MUST request graceful close, wait up to 5 seconds, and terminate the child process if graceful close does not complete.
- **FR-021**: On child-process crash, system MUST surface a typed session error state, log exit code, signal, and the last 4KB of stderr, emit a session-ended event, and avoid automatic restart.
- **FR-022**: System MAY perform bounded retries for transport-level failures within a single session lifecycle, but MUST return process crashes to the user or caller for the next decision.
- **FR-023**: System MUST provide one proof IPC endpoint, `acp:probeBoundCLI`, that takes no parameters, launches the configured Copilot bound CLI through the supervisor, initializes it, captures capabilities, disposes it, and returns the typed capability shape.
- **FR-024**: Every proof endpoint invocation MUST emit a structured log line.
- **FR-025**: System MUST expose exactly one preload bridge addition for the proof endpoint and keep the bridge surface narrow.
- **FR-026**: System MUST provide a renderer data endpoint that calls the proof IPC channel, is tagged as an Agent capability query, and renders the returned capability shape only in the existing proof surface.
- **FR-027**: System MUST add decision records for process supervision policy, ACP session modes posture, and ACP-layer testing discipline.
- **FR-028**: System MUST update project guidance with Run 3 ACP conventions, including ACP-layer paths, transcript fixture format, SDK-as-internal-collaborator testing posture, the capabilities factory floor, default Agent mode, and opt-in Autopilot posture.
- **FR-029**: System MUST amend roadmap guidance that previously referenced the stale model-swap mechanism so that the verify-now ACP selector behavior is the source of truth.
- **FR-030**: System MUST use vertical tracer-bullet TDD for this run: the first test and first module added must prove `BoundCLISupervisor.start()` returns verified initialize capabilities for Copilot CLI 1.0.54, followed by one test-to-implementation slice at a time.
- **FR-031**: System MUST NOT introduce domain IPC handlers beyond `acp:probeBoundCLI`, Redux store mounting, Step Commit writers, hook execution, domain step factories, product UI beyond the capability proof surface, HTTP API, Concierge MCP integration, Jira submission, Windows packaging changes, or Step Lifecycle UI hooks in this run.
- **FR-032**: System MUST verify constitution III by ensuring no code outside the ACP data-layer spawns or speaks to a coding-agent binary.

### Key Entities *(include if feature involves data)*

- **Bound CLI Agent**: A configured coding-agent CLI entry from the agent manifest; includes name, executable location, ACP launch flag, and capability metadata discovered at initialize time.
- **Bound CLI Session**: A supervised live ACP conversation with lifecycle state, child-process association, capability descriptor, active session identifier, transcript destination, and terminal outcome.
- **Bound CLI Capabilities**: Concierge-owned representation of initialize-time capabilities including session resumability, session listing, MCP transport metadata, prompt input support, auth posture, supported models, and supported modes.
- **Session Update**: A typed streaming event derived from ACP `session/update` notifications and discriminated by `params.update.sessionUpdate`.
- **Transcript Record**: One sanitized JSONL record containing a direction and an ACP message exchanged during a session step.
- **ACP Proof Result**: The returned capability descriptor from the no-parameter proof endpoint, suitable for display in the existing proof surface.
- **Decision Record**: A durable ADR documenting a locked Run 3 policy decision for process supervision, session modes, or testing discipline.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A maintainer can invoke the bound CLI proof path and receive a valid capability descriptor within 10 seconds in a correctly configured local environment.
- **SC-002**: 100% of coding-agent binary process creation and ACP wire communication occurs inside `src/main/data-layer/acp/`, with automated checks confirming no out-of-layer spawn or wire-talk paths.
- **SC-003**: Every ACP session exercised by the supervisor writes one sanitized annotated JSONL transcript per session step, with 100% of fixture lines containing a valid `direction` value.
- **SC-004**: Cancellation and disposal paths terminate gracefully when acknowledged within 5 seconds and otherwise end the child process within the bounded fallback window.
- **SC-005**: Crash scenarios always produce a typed error state, structured log evidence with exit code or signal when available, recent stderr context, and a session-ended event, with zero automatic restarts.
- **SC-006**: The test suite grows to at least 75 tests and includes fixture contract coverage, factory-floor coverage, supervisor lifecycle coverage, transcript write coverage, and an end-to-end proof that the real bound CLI can be launched through Concierge.
- **SC-007**: Required verification commands complete successfully: lint, typecheck, coverage tests, and end-to-end smoke including the new ACP proof scenario.
- **SC-008**: ADR-0004, ADR-0005, and ADR-0006 are present and describe the locked process supervision, session mode, and ACP testing policies without reopening grill decisions.
- **SC-009**: The stale roadmap model-swap guidance is corrected so that the verified configuration selector behavior is the documented source of truth.
- **SC-010**: The first implemented test/module slice is the vertical tracer bullet proving bound CLI start and verified capability discovery.

## Assumptions

- Run 2 main-process data-layer foundation is complete and available on main, including the manifest loader and IPC directory introduced in that run.
- The agent manifest already contains the verified Copilot CLI 1.0.54 ACP entry and the bound CLI is authenticated out-of-band through the user's existing shell setup.
- The captured initialize and session-new transcripts are authoritative seed evidence for Copilot CLI 1.0.54 and will be normalized to the locked annotated JSONL fixture format.
- Explicit cancel confirmation is a renderer/product concern deferred to later runs; Run 3 provides the confirmed cancellation operation for future callers.
- Renderer UI remains a proof-only surface for showing returned capabilities and does not become a product ACP session UI in this run.
- MCP capability metadata is captured because the agent reports it, but Concierge MCP integration behavior is outside Run 3.
- Autopilot is allowed only as an opt-in session mode; it does not bypass top-level cancel confirmation obligations.

## Deviations from grill

None. The grill decisions and Run 3 deliverables are preserved as the source of truth. Items listed as out of scope in the Run 3 input remain deferred because the grill explicitly excludes them from this run; they are not deviations.
