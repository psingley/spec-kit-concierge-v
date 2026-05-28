# ADR-0010: Reuse a streaming mutation pattern for Spec Kit step pipelines

**Status:** Accepted

## Context

Run 6 introduces the first user-visible step pipeline: `copilot:specify`. Unlike previous read-style IPC handlers, Specify is long-running and emits progress while ACP, lifecycle hooks, Step Contract validation, Step Commit writing, and artifact readback complete.

Runs 7-9 will need the same shape for Clarify, Plan, Tasks, Analyze, and Review-adjacent pipelines. The grill and clarifications locked a reusable discriminated event contract with progress events and exactly one terminal completion event.

## Decision

All step pipeline streams use this event shape:

```ts
type StepStreamEvent =
  | {
      type: 'progress';
      step: 'specify' | 'clarify' | 'plan' | 'tasks' | 'analyze' | 'review';
      sessionId: string;
      level: 'info' | 'ok' | 'warn' | 'error';
      message: string;
      timestamp: string;
    }
  | {
      type: 'done';
      step: 'specify' | 'clarify' | 'plan' | 'tasks' | 'analyze' | 'review';
      sessionId: string;
      status: 'pass' | 'fail';
      specMarkdown?: string;
      artifactPath?: string;
      commitSha?: string;
      reason?: string;
    };
```

Each started run emits zero or more `progress` events and exactly one terminal `done` event. The main-process pipeline owner enforces the exactly-one-terminal invariant. Renderer-side guards may ignore duplicates, but duplicate terminal attempts are bugs and must be covered by tests.

For Run 6, `done/pass` on `specify` carries `specMarkdown`, `artifactPath`, and `commitSha` only after:

1. `before_specify` succeeds.
2. ACP prompt completes successfully.
3. `after_specify` validates the Specify Step Contract.
4. Step Commit writes a `Concierge-Step: specify:pass` trailer.
5. `spec.md` is read from the validated Step Contract artifact path.

`done/fail` carries a `reason` and never marks the step complete.

Renderer endpoints use RTK Query `onCacheEntryAdded` to attach and detach stream subscriptions. The query/mutation starts the run through preload, while `onCacheEntryAdded` routes stream events into public Redux actions for activity, step state, session artifacts, and failure state.

Preload exposes a typed subscribe helper and hides raw Electron event handling from the renderer. Transport event names derive from the business capability name, for example `copilot:specify:event`, but the product capability remains `copilot:specify`.

## Rationale

The discriminated shape keeps progress and terminal semantics explicit. A single `done` event prevents the renderer from racing between ACP completion, hook failure, artifact readback, and commit success.

RTK Query owns remote lifecycle and cache teardown, so `onCacheEntryAdded` is the right place to subscribe, dispatch incremental events, and unsubscribe. Components stay declarative: they read slice state and call endpoint hooks rather than attaching IPC listeners.

The preload subscribe helper preserves the process boundary. Renderer code never imports Electron or handles raw `ipcRenderer` channels, and later steps can reuse the same pattern without inventing new stream semantics.

## Consequences

- Run 6 `copilot:specify` tests must cover progress, pass, fail, and duplicate-terminal prevention.
- Runs 7-9 must reuse `StepStreamEvent` instead of creating step-specific event unions.
- Main handlers own terminal enforcement because they have complete knowledge of lifecycle/ACP/artifact outcomes.
- Renderer endpoints translate stream events to existing slice actions; they do not create a ninth slice or ad hoc event bus.
- Preload subscription cleanup is required in `cacheEntryRemoved` paths to avoid leaking Electron listeners.

## References

- `specs/0006-specify-vertical/spec.md` - FR-019, FR-034 through FR-038, FR-042
- `specs/0006-specify-vertical/grill.md` - Q3
- `specs/0006-specify-vertical/clarifications.md` - R6-C04
- `specs/0006-specify-vertical/plan.md`
- `.specify/memory/constitution.md` - Principles I, IV, VI, VII, XV
