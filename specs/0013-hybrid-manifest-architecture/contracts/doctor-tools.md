# Contract: Bounded Doctor Tools

## Doctor authority boundary

The doctor is an LLM anomaly intermediary. It may read evidence and request approved guarded actions through deterministic tools. It must not write authoritative state directly, mark steps complete, write trailers, run raw git/file operations, widen contracts, guess on unresolved ambiguity, or exceed two attempts per step.

## Read-only tools

### `readFeatureJson`

Reads `.specify/feature.json` and returns the selected feature directory.

### `readManifest`

Reads and validates `.concierge/session-manifest.json`.

### `gitStatusDiff`

Returns normalized branch status and diff metadata. Does not return secrets or raw unrelated file contents.

### `readTrailers`

Reads `Concierge-Step:` trailer history through the existing git command path.

### `readArtifacts`

Reads metadata and bounded contents for step-owned artifacts needed to evaluate an anomaly.

### `readTranscript`

Reads bounded transcript/log excerpts by manifest log reference and checksum.

## Guarded mutating tools

Every mutating tool must:

1. Re-read current disk truth at execution time.
2. Validate anomaly id, step, feature directory, branch, and preconditions.
3. Be idempotent by anomaly id.
4. Append an intervention audit record before returning.
5. Return control to `sessionReconciler`.

### `relocateArtifact`

Moves a misplaced artifact only when source and destination are unambiguous and step-owned.

### `reRunStepWithPinnedContext`

Starts a new superseding step attempt using the recorded session context, feature directory, and step contract. It cannot skip reconciliation.

### `issueCorrectionPrompt`

Issues a bounded correction prompt to the step agent using the same assistant/session identity where required, then returns to reconciliation.

### `revertUnrelatedFiles`

Reverts only files proven unrelated to the active step and safe to restore. Ambiguous files are escalated.

### `markFailedWithStrandedArtifacts`

Writes or updates the failed marker for the active step with stranded-artifact detail and anomaly ids.

### `cancelActiveStep`

Cancels an active step attempt and records `killed` or `interrupted` based on observed process state. It cannot mark completion.

## Budget contract

- Maximum two doctor attempts per step.
- Tool rejections count toward the budget when the request is unsafe or out-of-contract.
- Budget exhaustion records a blocking anomaly and escalates to user-visible terminal-stuck state.
