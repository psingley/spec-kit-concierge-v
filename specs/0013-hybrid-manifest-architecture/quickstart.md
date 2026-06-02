# Quickstart: Hybrid Manifest Architecture

## Prerequisites

- Work on branch `build/manifest-architecture-dogfood`.
- Keep `.specify/feature.json` pointing at `specs/0013-hybrid-manifest-architecture`.
- This is the Run 13 dogfood branch exception: preserve the active `build/` branch while using the numbered spec directory and step commits.
- Do not edit source implementation files during the plan step.
- During implementation, preserve the FR-030 milestone order exactly.
- Before implementation source changes, complete T001 so the ADR and `.github/copilot-instructions.md` record the constitution-approved print-mode step-execution exception.
- For every RED/GREEN pair, record visible RED failure output before starting the paired GREEN implementation task.
- The max performance fixture is `tests/fixtures/hybrid-manifest/session-manifest.max.json`: six steps, three attempts per step, 30 anomalies, 30 interventions, 12 doctor invocations, and 60 artifact snapshot entries.

## Implementation order

1. Add `sessionManifestStore` with strict factories, atomic writes, append-only attempt reducers, anomaly records, intervention records, and manifest read/write tests.
2. Harden `stepContracts` with step-owned path sets, step-start snapshots, and artifact snapshot hashes.
3. Replace branch-history `commitStep` idempotency so a valid prior completion commit can be adopted by comparing step-owned artifact snapshots.
4. Add `sessionReconciler` and run it before and after completion commits.
5. Add dirty-diff gates, safe recovery catalog coverage, and failed markers with stranded-artifact detail.
6. Add guarded `relocateArtifact` backed by the deterministic recovery catalog for valid completion adoption, failed-marker refresh, proven unrelated-file revert, observed active-step cancel, and pinned-context restart only after explicit user confirmation or an approved guarded doctor request; verify recovery audits, returns to reconciliation, and never silently re-runs a step or marks completion directly.
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
npm run test:coverage
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
9. Exercise each safe recovery catalog class and confirm at least 90% of fixture scenarios resolve before doctor invocation while unsafe scenarios avoid false completion.
10. Simulate missing or invalid terminal JSON and confirm classifier records an anomaly without mutating completion.
11. Invoke the doctor in an ambiguous case and confirm it can call only the 12 approved tools, with mutating tools re-reading disk truth.
12. Exhaust two doctor attempts and confirm a needs-attention state is visible without false completion.
13. Confirm pinned-context restart is unavailable until explicit user confirmation or an approved guarded doctor request exists.
14. Confirm the nudge action appears only after needs-attention criteria are met and no deterministic remediation succeeded.
15. Call the localhost HTTP API for manifest read, reconcile, audit trail, doctor status, and nudge, and confirm it mirrors the same GUI state path as a human click.
16. Run nudge on an unambiguous mismatch and confirm guarded repair plus reconciliation.
17. Run nudge on ambiguous branch differences and confirm human escalation with no destructive changes.
18. Inspect audit trail details for failed, remediated, and nudged sessions and confirm the bounded user-visible view appears within 30 seconds.
19. Measure `tests/fixtures/hybrid-manifest/session-manifest.max.json` and confirm manifest read plus reconciliation completes in 500 ms or less.

## Completion criteria

- Passed steps always have matching manifest, branch, and artifact evidence.
- Manifest writes are atomic and invalid partial files are rejected.
- Step execution uses the unified print-mode command contract.
- ACP is not used as the step execution transport.
- Doctor remains unable to write authoritative state directly.
- Renderer state is a projection of reconciliation status and audit summaries, not completion authority.
- All mutating recovery actions are guarded, idempotent by anomaly id, audited, and followed by reconciliation.
- Pinned-context restart never runs silently; it requires explicit user confirmation or an approved guarded doctor request.
- The audit trail is exposed for failed, remediated, and nudged sessions.
- Manifest read, reconcile, audit trail, doctor status, and nudge are exposed through the localhost HTTP API and the renderer bridge with the same validation path.
- Nudge is hidden for healthy or actively recoverable sessions and visible for needs-attention sessions that meet escape-hatch criteria.
- Existing resume, maximum reached step, navigation-loop, failed-step resume, branch-null routing, and Windows-conditional regressions still pass.
