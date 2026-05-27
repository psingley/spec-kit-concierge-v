# ADR-0008: Define the Step state machine and trailer mapping

**Status:** Accepted

## Context

Run 5 begins wiring actual Spec Kit step lifecycle behavior into the Run 4 Redux skeleton. Step completion is durable in git history through `Concierge-Step` trailers, while renderer state is cache. The grill corrected an earlier six-state proposal and locked the renderer vocabulary to three states.

Clarification R5-C03 resolves a wording conflict: Step Escape Hatch resets to `not_available`, not `pending`. Retry is manual and re-enters `pending` only after the next `before_<step>` hook succeeds.

## Decision

The renderer `steps` slice uses exactly three states:

| State | Meaning |
|---|---|
| `not_available` | Step prerequisites are not satisfied or the step was reset for manual retry. |
| `pending` | The step is active or recoverable in-flight work exists. |
| `complete` | A Step Commit proves the step completed on the branch. |

Ordinary in-session progression is monotonic:

```text
not_available -> pending -> complete
```

`complete` is terminal during a session except through Step Escape Hatch. Step Escape Hatch may reset any state to `not_available` after cancelling the active turn and reverting expected artifacts to the last Step Commit.

Git trailer statuses are not renderer states. Trailer restoration maps them as follows:

| `Concierge-Step` trailer status | Restored renderer state |
|---|---|
| `pass` | `complete` |
| `pending` | `pending` |
| `fail` | `not_available` |
| `skipped` | `not_available` |

Restoration uses last-trailer-wins semantics per step. Run 5 writes only `pass` trailers from successful after-hooks. It may restore historical `pending`, `fail`, and `skipped` trailers.

## Rationale

Three renderer states keep UI and listener logic aligned with the product glossary and avoid leaking git recovery vocabulary into components. `fail` and `skipped` do not need separate UI states because the canonical failure path is Step Escape Hatch followed by manual retry.

Mapping `fail` and `skipped` to `not_available` makes failed or intentionally skipped history re-runnable without inventing a fourth "failed" state. Mapping `pass` to `complete` preserves git history as durable truth.

Resetting Escape Hatch to `not_available` matches FR-017, FR-022, R5-C03, and manual retry semantics. Resetting to `pending` would imply the app silently restarted work, which the constitution forbids.

## Consequences

- `src/renderer/slices/steps.ts` owns only `not_available`, `pending`, and `complete`.
- Reducers reject reverse or skipping transitions by preserving existing state; listeners/hooks log attempted invalid lifecycle transitions at the effect boundary.
- `src/main/data-layer/git/trailers.ts` remains the parser for git trailer text.
- Restoration code maps trailer statuses before they reach renderer state.
- Step Escape Hatch reset is the only legal non-monotonic transition.

## References

- `specs/0005-step-lifecycle-hooks/grill.md` - Q5, Q6, Q11
- `specs/0005-step-lifecycle-hooks/clarifications.md` - R5-C03, R5-C05
- `specs/0005-step-lifecycle-hooks/spec.md` - FR-015 through FR-020, FR-022
- `ROADMAP_DECISIONS.md` - lines 70-78, 478-495
- `.specify/memory/constitution.md` - Principle VII
