# ADR-0007: Define the listener middleware catalog

**Status:** Accepted

## Context

Run 4 creates the renderer state architecture spine before domain behavior exists. The constitution requires listener middleware to be the only legal place for cross-domain renderer effects, but the exact topic catalog must be fixed before later runs start wiring step lifecycle, sessions, workspace changes, preferences persistence, transcript capture, and ACP streams.

Listener names are hard to rename once slices, endpoint invalidation, smart components, and tests depend on them. The Run 4 grill locked six listener topics and required deterministic setup order.

## Decision

Run 4 defines exactly six listener middleware topic files under `src/renderer/listeners/`:

| File | Topic ownership |
|---|---|
| `acpStreamSubscription.listener.ts` | The single ACP stream subscription path |
| `preferencesPersistence.listener.ts` | Preferences debounce and persistence writes through `preferences:write` |
| `sessionLifecycle.listener.ts` | Session creation, model swap, and mode swap coordination across `session` and `copilot` |
| `stepLifecycle.listener.ts` | Step state transitions across `steps`, `session`, and `activity` |
| `transcriptCapture.listener.ts` | ACP wire I/O capture into activity logs |
| `workspaceChange.listener.ts` | Workspace path changes affecting workspace, agent manifest, and preferences state |

Store assembly initializes these setup functions alphabetically by filename:

1. `setupAcpStreamSubscriptionListener`
2. `setupPreferencesPersistenceListener`
3. `setupSessionLifecycleListener`
4. `setupStepLifecycleListener`
5. `setupTranscriptCaptureListener`
6. `setupWorkspaceChangeListener`

Run 4 listener setup functions accept the RTK `startListening` API and expose topic descriptors, but they do not register domain effect bodies yet.

The single ACP stream subscription rule is strict: future ACP stream subscription behavior must live in `acpStreamSubscription.listener.ts`. No component, hook, RTK Query endpoint outside its lifecycle hook, or other listener topic may create a second ACP stream subscription path.

## Rationale

The six-topic catalog maps to the known cross-domain coordination concerns without adding domain behavior early. Empty listener files prove the architecture and reserve names for future runs while keeping Run 4 free of business logic.

Alphabetical initialization is deterministic, easy to review, and avoids implied priority. In Run 4 order has no behavioral effect because listener bodies are empty; preserving the convention now prevents future order-dependent drift.

The single ACP stream subscription rule prevents duplicate stream consumers, double transcript capture, competing cancellation behavior, and hard-to-reproduce race conditions.

## Consequences

- `src/renderer/store.ts` owns listener middleware creation and setup ordering.
- New cross-domain renderer effects must use one of the six listener files or propose a new ADR/plan update before adding another topic.
- Listener presence tests assert each setup function exports and accepts the `startListening` API.
- Run 4 implementation must not add non-empty listener effect bodies.
- Future ACP streaming work has one owner: `acpStreamSubscription.listener.ts`.

## References

- `specs/0004-ipc-bridge-redux-skeleton/grill.md` - Q2, Q6
- `specs/0004-ipc-bridge-redux-skeleton/spec.md` - FR-012 through FR-014, SC-002
- `.specify/memory/constitution.md` - Principle VI
- `.agents/skills/tdd/SKILL.md`
