# Iteration L - specify-running

## Result

- Before: FAIL, score 100, residual 2.94%, 5 failures.
- After focused loop: PASS, score 2, residual 2.32%, 0 failures.
- Full regression gate: 19/24 PASS.

## Change Summary

- Added the design loading panel for active Specify runs, including `Specifying…`, `spec.md`, activity-stream guidance, and the required spinner marker.
- Kept draft branch labels visible only while Specify is running or complete; idle input states continue to display the default branch label.
- Added deterministic visual-harness inputs for draft branch names and test ACP prompt delay so the running state can be captured before completion.

## Regression Note

`specify-running` now passes. No previously passing screen remains regressed after correcting draft-branch display scope. `activity-pill-busy` also passes in the full regression suite after the deterministic running-state capture change.

## Verification

- `npm run vd:dev -- specify-running`: PASS.
- `npm run vd:loop`: 19/24 PASS.
- Standard 4-command gate: PASS (`typecheck`, `lint`, `npm test` with 797 tests, `e2e` with 23 tests).
