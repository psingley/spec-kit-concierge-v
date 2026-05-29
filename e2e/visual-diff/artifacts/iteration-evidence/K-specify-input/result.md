# Iteration K - specify-input

## Baseline

- Screen: `specify-input`
- Command: `npm run vd:dev -- --reset-cache specify-input`
- Status: FAIL
- Failures: 8
- Pixel residual: 2.84%
- Priority score: 100

## Change

Rebuilt the Specify input state around the design prompt input card with `.prompt-input`, a Clear action, lowercase `Begin specify`, and the required sparkle marker. Added harness setup to fill the canonical sample prompt for the input-state screen and aliased the design primary button selector used by the contract.

## After

- Command: `npm run vd:dev -- --reset-cache specify-input`
- Status: PASS
- Failures: 0
- Pixel residual: 3.98%
- Priority score: 4

## Regression Gate

- Command: `npm run vd:loop`
- Result: PASS for `specify-input`; no previously passing screens regressed.
- Suite status after gate: 18/24 PASS.

## Standard Gate

- Command: `rm -rf .vite/build && npm run typecheck && npm run lint && npm test && npm run e2e`
- Result: PASS.
- Unit tests: 113 files, 797 tests.
- E2E: 23 passed.
