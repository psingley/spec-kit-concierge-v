# ADR-0003: Define RTK Query tag types upfront

**Status:** Accepted

## Context

Run 2 establishes the renderer IPC data-access shape before domain endpoints exist. Later runs will add workspace, git, agent, session, step, transcript, and preference endpoints. If each run invents cache tags locally, naming drift becomes hard to reverse once endpoint invalidation depends on those strings.

## Decision

Declare the RTK Query tag taxonomy upfront in `src/renderer/api/` with exactly these eight tag types:

```ts
[
  'Workspace',
  'StepState',
  'GitState',
  'Agent',
  'Session',
  'Step',
  'Transcript',
  'Preferences'
] as const
```

Run 2 ships only the shared `ipcBaseQuery` shape and the `getAppVersion` proof endpoint. Domain endpoints remain out of scope.

## Rationale

RTK Query's tag-based invalidation is the standard cache coordination path for query/mutation state. Defining the taxonomy once keeps downstream runs from introducing incompatible spellings such as `step`, `Steps`, or `StepStatus`, and it gives every later endpoint a known invalidation target without relying on broad manual `api.util.invalidateTags` usage.

## Consequences

- `src/renderer/api/index.ts` owns the canonical tag list.
- Future endpoints must use one of these tags or justify an ADR/plan update before adding another.
- Run 2 does not add polling or domain-specific manual invalidation.
- Renaming a tag after downstream runs depend on it is treated as a breaking cache-contract change.

## References

- `specs/0002-main-data-layer/grill.md` - Q6
- `specs/0002-main-data-layer/spec.md` - FR-009, FR-014, SC-010
- `.specify/memory/constitution.md` - Principle VI
