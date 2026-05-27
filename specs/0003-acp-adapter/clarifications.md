# Clarifications: ACP Adapter & Bound CLI Supervisor

**Session Date**: 2026-05-27
**Spec**: `specs/0003-acp-adapter/spec.md`
**Grill Resolutions**: `specs/0003-acp-adapter/grill.md`
**Transcript Evidence**: `tests/fixtures/acp-transcripts/`

## Result

No critical ambiguities detected worth formal clarification.

The feature spec already incorporates the nine settled grill decisions and the verify-now ACP transcript grounding. It does not leave `/speckit.plan` with residual user-decision points. No clarification questions were generated.

## Coverage Summary

| Taxonomy Category | Status | Notes |
|---|---|---|
| Functional Scope & Behavior | Clear | Run 3 deliverables and exclusions are explicit in FR-001 through FR-032, with the ACP-only boundary and proof endpoint constrained. |
| Domain & Data Model | Clear | Bound CLI Agent, Bound CLI Session, capabilities, updates, transcripts, proof result, and ADR entities are identified. |
| Interaction & UX Flow | Clear | Renderer exposure is proof-only; broader product UI, domain IPC, step lifecycle hooks, and confirmation UI are deferred. |
| Non-Functional Quality Attributes | Clear | Process supervision, transcript durability, logging, crash handling, cancellation/disposal timeouts, and verification gates are measurable. |
| Integration & External Dependencies | Clear | The single ACP runtime dependency, SDK-managed framing, Copilot CLI manifest assumption, ACP transcript fixtures, and model/mode selectors are locked. |
| Edge Cases & Failure Handling | Clear | Missing manifest entries, launch failures, malformed initialize responses, unknown update kinds, concurrent model changes, cancel/dispose timeouts, crashes, and repeated proof invocations are covered. |
| Constraints & Tradeoffs | Clear | Grill decisions lock SDK framing, no auto-restart, configOptions model selection, automated transcript sanitization, session list/load, mode posture, and vertical TDD sequencing. |
| Terminology & Consistency | Clear | Terms align across `spec.md`, `grill.md`, and the captured ACP fixture facts without reopening settled decisions. |
| Completion Signals | Clear | Success criteria cover capability proof latency, ACP-only enforcement, transcript format, crash/cancel behavior, test growth, verification commands, ADRs, roadmap correction, and first tracer bullet. |
| Misc / Placeholders | Clear | No unresolved clarification markers or decision placeholders requiring user input were found. |

## Questions

None.

