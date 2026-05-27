# ADR-0004: Do not auto-restart crashed ACP bound CLI sessions

**Status:** Accepted

## Context

Run 3 introduces the ACP-only supervisor for the bound Copilot CLI. A child process can exit normally, crash, receive a signal, or die while a prompt/tool call is in flight. Restart behavior would define recovery semantics for every later Step workflow, so this policy must be explicit before implementation.

## Decision

Do not auto-restart a crashed ACP bound CLI process.

When the child process exits unexpectedly, the supervisor records a typed `BoundCLISession` error state, logs the exit code, signal, and last 4KB of stderr, emits a `session-ended` event, and leaves the next action to the caller/user.

Bounded retries are allowed only for transport-level failures that do not cross a process crash boundary within the same session lifecycle.

## Rationale

A bound CLI process is the session's execution identity. If it dies, the session has ended. Auto-restart would hide the failure, blur disk-as-truth recovery, and risk continuing work after a state transition the user did not approve.

The logged stderr tail gives enough immediate diagnostic context without writing unbounded process output to logs. The event lets renderer or future step-state code respond consistently.

## Consequences

- Crashes are visible and typed instead of success-shaped.
- Later recovery flows can decide whether to retry from disk evidence.
- The supervisor must retain a bounded stderr ring buffer.
- Tests must prove no restart occurs after exit, signal, kill, or simulated crash.

## References

- `specs/0003-acp-adapter/grill.md` - Q2
- `specs/0003-acp-adapter/spec.md` - FR-021, SC-005
- `.specify/memory/constitution.md` - Principle II and Principle III
