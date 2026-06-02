# Contract: Session Reconciliation

## Inputs

`sessionReconciler` receives:

- Parsed `SessionManifestV1`
- Current `.specify/feature.json` feature directory
- Current git branch and HEAD
- Full branch `Concierge-Step:` trailer history
- Current step-owned artifact snapshots
- Current dirty-diff facts
- Failed-step markers with stranded artifacts
- Optional classifier anomalies from watchdog/transcript parsing

## Output

```ts
type ReconciliationResult = {
  step: StepName;
  status: 'pending' | 'running' | 'pass' | 'failed' | 'killed' | 'interrupted' | 'needs-attention';
  canCommit: boolean;
  canAutoRecover: boolean;
  canNudge: boolean;
  anomalies: Anomaly[];
  requiredInterventions: string[];
  completionEvidence?: CompletionEvidence;
};
```

## Completion gate

A step may be marked `pass` only when all of these are true:

1. The latest non-superseded attempt for the step has a successful terminal result.
2. Required step artifacts are present and pass their step contract.
3. The step-owned artifact snapshot matches the completion evidence snapshot.
4. Branch history contains a valid `Concierge-Step: <step>:pass` trailer on a commit whose step-owned artifact snapshot matches.
5. Dirty-diff gates find no unrelated, ambiguous, or unsafe changes.
6. No blocking anomaly for the step remains unresolved.

## Pre-commit reconciliation

Before writing a completion commit:

- Re-read manifest, branch state, and step-owned artifacts.
- Reject completion if required artifacts are missing or contract-invalid.
- Search branch history for an existing matching completion commit.
- If found, adopt it and record `adoptedFromHistory: true`.
- If not found, allow commit only for step-owned paths plus documented context exceptions.

## Post-commit reconciliation

After writing or adopting a commit:

- Re-read branch trailers and artifacts.
- Verify exactly one authoritative completion evidence record is selected for the step.
- Update the manifest attempt to `pass` only after verification.
- Remove failed marker only after the pass result is durable.

## Dirty-diff gates

Dirty-diff gates classify changes as:

- `owned-safe`: current diff is inside the active step-owned path set.
- `owned-mismatched`: path is owned but content does not match expected snapshot/contract.
- `unrelated`: path is outside the active step-owned path set.
- `ambiguous`: path could belong to more than one feature or recovery target.
- `unsafe`: destructive or unreviewed change that cannot be repaired deterministically.

Only `owned-safe` may proceed to commit. Other classifications produce blocking anomalies and failed markers with stranded-artifact details.

## Classifier contract

Watchdog/transcript classifier output is anomaly evidence only. It cannot:

- mark a step complete
- write trailers
- mutate artifacts
- cancel active steps
- invoke doctor tools directly

## Failed marker contract

When reconciliation cannot safely resolve a step:

- Write `.specify/concierge/failed-steps/<step>.json`.
- Include `step`, `sessionId`, `failedAt`, `reason`, `strandedArtifacts`, and `anomalyIds`.
- Preserve backward compatibility with existing marker readers by keeping existing fields intact.
