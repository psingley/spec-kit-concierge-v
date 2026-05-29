# Iteration N - activity-rail-idle

## Result

- Before: FAIL, score 100, residual 5.54%, 29 failures.
- After focused loop: PASS, score 6, residual 6.28%, 0 failures.
- Full regression gate: 21/24 PASS.

## Change Summary

- Rebuilt the activity rail into the design header/status/current/stream/footer structure.
- Added required `activity-idle-dot` and `activity-pulse-dot` markers.
- Added deterministic baseline idle log rows for visual verification.
- Wired the rail Clear control to a new `activityCleared` action.

## Regression Note

`activity-rail-idle` now passes. No previously passing screen regressed in the full `vd:loop` gate.

## Verification

- `npm run vd:dev -- activity-rail-idle`: PASS.
- `npm run vd:loop`: 21/24 PASS.
- Standard 4-command gate: PASS (`typecheck`, `lint`, `npm test` with 797 tests, `e2e` with 23 tests).
