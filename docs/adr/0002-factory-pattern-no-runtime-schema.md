# ADR-0002: Use factory pattern only at trust boundaries; no runtime schema library

**Status:** Accepted

## Context

Run 1 locks the project’s data-shaping philosophy before factories land in later runs. The question is whether trust-boundary validation uses a runtime schema library or hand-written factories.

## Decision

Use hand-written factories only at trust boundaries. Do not introduce Zod or any other runtime schema library.

## Rationale

Principle IV and constitution v1.0.3 already make factories the contract seam. Keeping a separate schema definition would create two sources of truth and continuous maintenance tax without a matching safety dividend for this app.

## Consequences

- Factory return types are the typed shapes.
- Trust-boundary validation stays co-located with the transform.
- Later runs must not reintroduce a schema library by habit.
- Run 1 remains a foundation-only shell: no factories, runtime schemas, Redux slices, IPC handlers, product UI, business logic, HTTP API, MCP detection, ACP client, or spec-kit hook implementations are introduced.

## References

- `.specify/memory/constitution.md` — Principle IV, v1.0.3 amendment history
- `specs/0001-foundation-shell/grill.md` — Q-extra
