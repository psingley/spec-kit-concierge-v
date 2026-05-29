# ADR-0012: Register passive Plan/Tasks/Analyze IPC with a small shared helper

**Status:** Accepted

## Context

Run 8 adds three similar passive step IPC capabilities: `copilot:plan`, `copilot:tasks`, and `copilot:analyze`. Each must validate input, run the appropriate before/after lifecycle hooks, stream ACP progress, enforce exactly one terminal event, validate disk artifacts/remediation, write/read Step Commit proof, and emit structured observability.

Copying the full handler shape three times would make duplicate-terminal enforcement, hook ordering, logging, and failure handling easy to drift. Generalizing all step pipelines would be too broad because Specify and Clarify already have shipped behavior and Clarify has HITL re-ask semantics.

## Decision

Introduce a small `registerPassiveStepIpc` helper for the closed set:

```ts
type PassiveStepName = 'plan' | 'tasks' | 'analyze';
```

The helper owns shared orchestration:

1. IPC request validation.
2. Active feature resolution.
3. Before-hook invocation.
4. ACP prompt execution and progress forwarding.
5. Exactly-one-terminal guard.
6. After-hook invocation.
7. Step Contract validation.
8. Step Commit proof readback.
9. Compact terminal manifest/remediation summary.
10. Structured logging and fail terminal emission.

Each step supplies only step-specific prompt/config, contract validator, manifest summarizer, and recovery reason mapping.

## Non-goals

- Do not refactor `copilot:specify`.
- Do not refactor `copilot:clarify`.
- Do not register Review, JIRA, Constitution, Implement, or future HTTP endpoints through this helper.
- Do not move ACP process spawning outside `src/main/data-layer/acp/`.
- Do not let renderer code call the helper directly.

## Rationale

The helper creates one place for the safety invariants that must not vary across passive steps while still keeping Plan, Tasks, and Analyze contracts explicit. It reduces copy-paste risk without changing already-shipped interactive step behavior.

## Consequences

- Unit tests cover duplicate-terminal prevention and hook ordering once through a public registered passive handler.
- Step-specific tests still cover Plan artifacts, Tasks parsing, and Analyze remediation/no-diff behavior.
- Future changes to passive-step logging or terminal payload shape are centralized for the Run 8 steps.
- Any attempt to add another step to the helper requires an ADR update or a new ADR.

## References

- `specs/0008-ai-passive-steps/spec.md`
- `specs/0008-ai-passive-steps/grill.md`
- `specs/0008-ai-passive-steps/contracts/passive-step-streaming.md`
- `docs/adr/0010-streaming-mutation-pattern.md`
- `.specify/memory/constitution.md` Principles I, III, VI, VII, XV
