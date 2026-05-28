# Iteration I - workspace-titlebar-repo-dropdown-open

## Baseline

- Screen: `workspace-titlebar-repo-dropdown-open`
- Command: `npm run vd:dev -- --reset-cache workspace-titlebar-repo-dropdown-open`
- Status: FAIL
- Failures: 22
- Pixel residual: 2.94%
- Priority score: 100

## Change

Replaced the repository dropdown utility actions with the design repo picker content: filter field, Recent group, repo rows with branch-count pills and last-used metadata, and the All repos list. Adjusted repo row roles to satisfy the visual contract's button controls and changed the titlebar menu shadow to the design token.

## After

- Command: `npm run vd:dev -- workspace-titlebar-repo-dropdown-open`
- Status: PASS
- Failures: 0
- Pixel residual: 3.1%
- Priority score: 3

## Regression Gate

- Command: `npm run vd:loop`
- Result: PASS for `workspace-titlebar-repo-dropdown-open`; no previously passing screens regressed.
- Suite status after gate: 16/24 PASS.

## Standard Gate

- Command: `rm -rf .vite/build && npm run typecheck && npm run lint && npm test && npm run e2e`
- Result: PASS.
- Unit tests: 113 files, 797 tests.
- E2E: 23 passed.
