# ADR-0009: Route Clarify re-ask through step lifecycle listener middleware

**Status:** Accepted

## Context

Clarify is the only Run 5 step with intra-step HITL repair behavior. The Clarify factory must enforce strict question formatting, but malformed questions must remain visible and prompt a targeted rewrite instead of being hidden or immediately forcing the full Step Escape Hatch.

The grill locked listener middleware as the re-ask route. Clarification R5-C01 resolves the factory result shape by allowing Clarify to return a malformed-question partial result before the Step Escape Hatch threshold is reached.

## Decision

Clarify re-ask is coordinated by `src/renderer/listeners/stepLifecycle.listener.ts`.

Flow:

1. The Clarify factory validates persisted `clarifications.md` question blocks.
2. If one or more questions are malformed, it returns a partial result containing well-formed questions, malformed questions, reasons, raw text, and stable question ids.
3. The malformed question remains visible to renderer state.
4. A `clarify/questionMalformed` action reaches `stepLifecycle.listener.ts`.
5. The listener prompts the Bound CLI to rewrite only the malformed question, preserving well-formed questions.
6. Rewritten output passes back through the Clarify factory.
7. Retry count is tracked per malformed question.
8. After three failed re-ask attempts for the same question, the listener triggers Step Escape Hatch with reason `clarify-rigor-exhausted`.

The factory does not call ACP and does not loop. ACP prompting is an effect and belongs in listener middleware.

## Rationale

Keeping the factory pure preserves trust-boundary clarity: it validates disk-derived artifact content and returns typed outcomes. Listener middleware is the constitutional place for cross-domain renderer effects, including coordination across Clarify state, session activity, ACP prompts, and Escape Hatch.

A per-question three-attempt bound prevents infinite repair loops while still giving the Step Agent a chance to fix localized formatting errors. The `clarify-rigor-exhausted` reason makes exhausted repair explicit and auditable.

## Consequences

- `clarify.factory.ts` is the only Step Contract factory with a three-way result.
- `stepLifecycle.listener.ts` owns re-ask attempt counters and `clarify-rigor-exhausted`.
- Tests dispatch public actions into the product store and observe activity/state; they do not mock internal reducers or supervisors.
- The malformed persisted question remains visible until rewritten or Escape Hatch resets the step.
- Full Step Escape Hatch remains the canonical recovery path after the bounded re-ask path is exhausted.

## References

- `specs/0005-step-lifecycle-hooks/grill.md` - Q9
- `specs/0005-step-lifecycle-hooks/clarifications.md` - R5-C01, R5-C04, R5-C08
- `specs/0005-step-lifecycle-hooks/spec.md` - FR-024 through FR-027
- `.specify/memory/constitution.md` - Principle VI, Principle VIII
- `.agents/skills/tdd/SKILL.md`
