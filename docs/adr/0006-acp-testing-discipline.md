# ADR-0006: Use transcript contract tests as the primary ACP testing discipline

**Status:** Accepted

## Context

Run 3 crosses an external protocol boundary. The project constitution requires trust-boundary factories to use hand-written validation, while the ACP grill requires contract tests against recorded transcripts. The Pocock TDD skill also requires public-interface tests, vertical tracer bullets, and mocking only at system boundaries.

## Decision

Use transcript contract tests as the primary discipline for ACP wire behavior.

`src/main/data-layer/acp/capabilities.ts` is the Run 3 trust-boundary factory and must have the six-case factory floor: happy path, empty object, null, undefined, one hostile malformed nested input, and one partial structurally-plausible input.

Do not apply the factory-floor convention to trailer-style lenient parsers or to ACP transcript replay helpers. Trailer parsers keep their existing lenient-parser behavior; ACP wire modules use transcript contracts.

The ACP SDK is an internal collaborator and must not be mocked. Mock only true system boundaries such as `child_process`, filesystem writes, time, and Electron IPC.

## Rationale

The authoritative behavior is on the ACP wire. Transcript tests preserve that behavior without coupling to implementation details. The SDK already owns JSON-RPC framing and schema mechanics, so mocking it would test assumptions instead of integration.

Capability normalization is different: Concierge uses those values to decide what to expose, so it is a trust boundary and needs strict factory coverage.

## Consequences

- Implementation proceeds by vertical tracer bullets: one RED test, one minimal GREEN implementation, repeat.
- Fixtures under `tests/fixtures/acp-transcripts/` must be sanitized annotated JSONL.
- Tests should exercise public interfaces such as `BoundCLISupervisor.start()`, not private helpers.
- `child_process` and filesystem behavior may be boundary-mocked; SDK behavior should be exercised.

## References

- `.agents/skills/tdd/SKILL.md`
- `specs/0003-acp-adapter/grill.md` - Q8, Q9
- `specs/0003-acp-adapter/spec.md` - FR-006, FR-030
- `docs/adr/0002-factory-pattern-no-runtime-schema.md`
