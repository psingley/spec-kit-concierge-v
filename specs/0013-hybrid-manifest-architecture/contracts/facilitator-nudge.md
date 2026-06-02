# Contract: Facilitator Integration and Nudge

## Print-mode step invocation

The facilitator invokes every step agent with:

```bash
copilot -p --agent speckit.<step> --output-format json --session-id <uuid> --log-dir <dir>
```

For each invocation it records:

- spawn recipe
- branch state before execution
- step-owned artifact snapshot at step start
- assistant/session/message/turn identifiers from parseable output
- log reference and checksum
- terminal result
- anomalies and interventions

## Facilitator state flow

1. Create or load the session manifest.
2. Append a pending attempt for the active step.
3. Capture branch and owned-path snapshot.
4. Start print-mode step execution.
5. Stream progress to renderer as derived state.
6. Parse terminal output and log references.
7. Run reconciliation before completion commit.
8. Ask the after-hook-owned completion path to write or adopt a completion commit only if reconciliation permits.
9. Run reconciliation after completion commit.
10. Update manifest attempt status.
11. Escalate to deterministic recovery, doctor, failed marker, or nudge eligibility when needed.

## Needs-attention criteria

A session is needs-attention when:

- The active/latest attempt is terminal `failed`, `killed`, or `interrupted`, or reconciliation has a blocking anomaly.
- Deterministic known-safe recovery did not succeed.
- Doctor is disabled, rejected, or exhausted its two attempts without safe resolution.
- No currently running attempt can still produce a normal result.

## Nudge visibility

Renderer may show nudge only when `canNudge` is true in the reconciled state. Nudge is hidden for:

- healthy sessions
- running sessions
- incomplete sessions that can still auto-recover
- sessions where branch or feature context cannot be verified

## `reconcileBranchToIntendedShape`

Inputs:

- Session manifest
- Current feature directory
- Step contracts
- Branch trailer history
- Current artifact snapshots
- Failed markers

Outputs:

```ts
type NudgeResult = {
  nudgeId: string;
  result: 'repaired' | 'no-op' | 'escalated' | 'rejected';
  repairedAnomalyIds: string[];
  interventionIds: string[];
  message: string;
  escalation?: {
    reason: string;
    evidence: string[];
  };
};
```

Rules:

- Computes intended branch shape from durable evidence only.
- Applies guarded deterministic actions only for unambiguous mismatches.
- Re-reads disk truth before each mutating action.
- Runs reconciliation after each action.
- Never writes or adopts completion commits outside the after-hook-owned completion path.
- Escalates ambiguous or risky differences without destructive changes.
- Never marks a step complete directly.

## UI contract

- Nudge button has an accessible name that includes the affected step.
- Running nudge disables duplicate clicks for the current request.
- Results are announced through a status or alert region.
- Escalation copy includes the reason and evidence paths/commit ids needed for human judgment.
