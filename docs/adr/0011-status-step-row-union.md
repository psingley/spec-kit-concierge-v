# ADR-0011: Use a typed row union for StatusStep rendering

**Status:** Accepted

## Context

Run 8 adds passive watching screens for Plan, Tasks, and Analyze. Plan needs validated artifact evidence rows, Tasks needs parsed task rows and detail entry points, and Analyze needs remediation/no-diff milestone rows. The UI should share one presentational `StatusStep` surface without forcing every step into an artifact-only model.

ADR-0008 already locks lifecycle state to `not_available`, `pending`, and `complete`. ADR-0010 already locks step stream events to progress plus exactly one terminal `done`.

## Decision

`StatusStep` receives a typed row union:

- `ArtifactRow` for validated artifact evidence and lazy viewer affordances.
- `MilestoneRow` for stream/lifecycle/validation/commit/transcript progress.
- `TaskRow` for parsed Tasks entries that can open `tasks:detail`.
- `RemediationRow` for Analyze allowed-target verification or changes.
- `HangRow` for visible soft silence guidance.

All variants share stable `id`, `label`, `state`, and accessible label fields. Smart containers derive rows from existing session/RTK Query state and pass them into dumb `StatusStep` props.

## Non-goals

- This does not add lifecycle states beyond ADR-0008.
- This does not allow a row to mark a step complete.
- This does not bypass ADR-0010 terminal-event enforcement.
- This does not create a ninth renderer slice.
- This does not let presentational components fetch artifacts or subscribe to ACP.

## Rationale

A row union keeps the shared UI deep enough for three different passive-step evidence models while preserving component dumbness. It also makes evidence affordance availability explicit: artifact and task detail actions are disabled until lifecycle validation produces safe evidence.

## Consequences

- Plan, Tasks, and Analyze can share `StatusStep`.
- Accessibility rules can be enforced once for row state, evidence buttons, and live status copy.
- Selectors/container code own the conversion from product state to row props.
- Tests should assert public rendering and actions, not internal row-building helper details.

## References

- `specs/0008-ai-passive-steps/spec.md`
- `specs/0008-ai-passive-steps/grill.md`
- `specs/0008-ai-passive-steps/data-model.md`
- `docs/adr/0008-step-state-machine.md`
- `docs/adr/0010-streaming-mutation-pattern.md`
- `.specify/memory/constitution.md` Principles VI, VIII, XIV
