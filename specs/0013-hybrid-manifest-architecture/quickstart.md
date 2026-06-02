# Quickstart: Hybrid Manifest Architecture

## Prerequisites

- Work on branch `build/manifest-architecture-dogfood`.
- Keep `.specify/feature.json` pointing at `specs/0013-hybrid-manifest-architecture`.
- Do not edit source implementation files during the plan step.
- During implementation, preserve the FR-030 milestone order exactly.
- Before implementation source changes, record the constitution impact for replacing ACP step execution with print-mode.

## Implementation order

1. Add `sessionManifestStore` with strict factories, atomic writes, append-only attempt reducers, anomaly records, intervention records, and manifest read/write tests.
2. Harden `stepContracts` with step-owned path sets, step-start snapshots, and artifact snapshot hashes.
3. Replace branch-history `commitStep` idempotency so a valid prior completion commit can be adopted by comparing step-owned artifact snapshots.
4. Add `sessionReconciler` and run it before and after completion commits.
5. Add dirty-diff gates and failed markers with stranded-artifact detail.
6. Add guarded `relocateArtifact`.
7. Add watchdog/transcript classifier.
8. Add bounded 12-tool doctor harness.
9. Add doctor agent instructions.
10. Integrate facilitator print-mode execution, manifest writes, doctor escalation, and deterministic reconciliation.
11. Add nudge button and `reconcileBranchToIntendedShape`.

## Targeted verification commands

```bash
npm run typecheck
npm run lint
npm run test
npm run e2e
```

## Manual evidence checks

1. Start a new session and confirm `.concierge/session-manifest.json` is created with a pending/running first attempt.
2. Complete one step and confirm manifest attempt, branch trailer, required artifacts, and UI status agree.
3. Restart the app and confirm resume reconstructs status from manifest, trailers, artifacts, and failed markers instead of renderer memory.
4. Force a successful process exit with a missing required artifact and confirm the step is not marked passed.
5. Create duplicate or out-of-order completion commits and confirm branch-history idempotency adopts the valid matching commit.
6. Add unrelated branch edits during a step and confirm dirty-diff gates block completion.
7. Place a step-owned artifact in one unambiguous wrong feature directory and confirm guarded relocation audits the intervention then re-runs reconciliation.
8. Create two plausible artifact destinations and confirm relocation escalates without moving files.
9. Simulate missing or malformed terminal JSON and confirm classifier records an anomaly without mutating completion.
10. Invoke the doctor in an ambiguous case and confirm it can call only the 12 approved tools, with mutating tools re-reading disk truth.
11. Exhaust two doctor attempts and confirm a terminal-stuck state is visible without false completion.
12. Confirm the nudge action appears only after terminal-stuck criteria are met and no automatic remediation succeeded.
13. Run nudge on an unambiguous mismatch and confirm guarded repair plus reconciliation.
14. Run nudge on ambiguous branch differences and confirm human escalation with no destructive changes.

## Completion criteria

- Passed steps always have matching manifest, branch, and artifact evidence.
- Manifest writes are atomic and invalid partial files are rejected.
- Step execution uses the unified print-mode command contract.
- ACP is not used as the step execution transport.
- Doctor remains unable to write authoritative state directly.
- All mutating recovery actions are guarded, idempotent by anomaly id, audited, and followed by reconciliation.
- Nudge is hidden for healthy or actively recoverable sessions and visible for terminal-stuck sessions that meet escape-hatch criteria.
- Existing resume, maximum reached step, navigation-loop, failed-step resume, branch-null routing, and Windows-conditional regressions still pass.
