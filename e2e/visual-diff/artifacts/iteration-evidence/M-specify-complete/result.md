# Iteration M - specify-complete

## Result

- Before: FAIL, score 100, residual 3.54%, 25 failures.
- After focused loop: PASS, score 5, residual 4.65%, 0 failures.
- Full regression gate: 20/24 PASS.

## Change Summary

- Rebuilt the complete Specify state around the design `.md-panel`, `.md-tabs`, `.md-scroll`, `.md-preview`, `.advance-row`, and `.gate` structure.
- Updated the visual complete-state setup to use the shared sample prompt.
- Made the test ACP adapter return the flight-change spec for that sample prompt while preserving the hello-world spec for existing e2e coverage.
- Fixed heading verification so contracts requiring multiple headings of the same level check for each exact heading, not only the first heading at that level.

## Regression Note

`specify-complete` now passes. No previously passing screens regressed in the full `vd:loop` gate.

## Verification

- `npm run vd:dev -- specify-complete`: PASS.
- `npm run vd:loop`: 20/24 PASS.
- Standard 4-command gate: PASS (`typecheck`, `lint`, `npm test` with 797 tests, `e2e` with 23 tests).
