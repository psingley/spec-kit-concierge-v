# Contract: Deterministic Recovery Catalog

Deterministic guarded recovery runs before the doctor under the Run 13 constitution exception. A recovery action is safe only when the current disk and git facts prove the action is scoped to the active step, has an idempotency key, appends an audit record, and returns to reconciliation before any status changes. Recovery never silently re-runs a step, marks completion directly, or writes completion trailers outside hook ownership.

## Safe recovery classes

1. `relocate-step-owned-artifact`
   - Source file is inside a known spec artifact location.
   - Destination is the selected `.specify/feature.json` feature directory.
   - The file belongs to the active step contract and no competing destination exists.
2. `adopt-valid-completion`
   - Branch history contains a `Concierge-Step: <step>:pass` trailer.
   - The trailer commit's step-owned artifact snapshot matches the current intended snapshot.
3. `refresh-failed-marker`
   - Reconciliation found a blocking anomaly.
   - Failed marker update preserves backward-compatible fields and adds `strandedArtifacts` and `anomalyIds`.
4. `revert-proven-unrelated-file`
   - The file is outside the active step-owned path set.
   - A safe restore point is available from the step-start branch snapshot.
   - The file is not ambiguous and is not user-confirmed work.
5. `cancel-observed-active-step`
   - Process state proves an active attempt is killed or interrupted.
   - Cancellation records terminal attempt state and cannot mark completion.
6. `restart-with-pinned-context`
   - A new attempt supersedes the failed attempt only after explicit user confirmation or an approved guarded doctor request.
   - Feature directory, branch, assistant/session identity, and step contract are pinned from durable evidence.

## Unsafe classes

These always escalate to failed marker, doctor, nudge, or human review:

- ambiguous artifact destinations
- changes outside the step-owned path set without a safe restore point
- missing required artifacts with no deterministic source
- branch changes after nudge or recovery preconditions were displayed
- doctor requests outside the approved tool catalog
- silent retry or restart without explicit user confirmation or an approved guarded doctor request
- any action that would mark completion without manifest, trailer, and artifact agreement

## Measurement

`tests/fixtures/hybrid-manifest/recovery-scenarios.json` enumerates each safe and unsafe class. SC-004 passes only when at least 90% of safe-class fixture scenarios are resolved without invoking the doctor and 100% of unsafe-class scenarios avoid false completion.
