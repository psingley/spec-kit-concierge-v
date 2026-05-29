# Iteration D result: repo-browse-repo-selected

## Before

- Status: FAIL
- Failures: 22
- Pixel residual: 4.76%
- Priority score: 100

## After

- Status: PASS
- Failures: 0
- Pixel residual: 5.6%
- Priority score: 6

## Change summary

Replaced the selected-repo browse state with the design branch-picker pattern: back action, branch marker, prior-session count, four deterministic concierge-api branch rows with pips/timestamps, and the primary new-session CTA. The titlebar now keeps the repository chip at pick-repo while the user is still in repo/branch selection, only showing an active repo once a branch/workspace exists. The style sampler now resolves the design branch-row selector behind the contract's session-row sample and normalizes equivalent dark-surface color serialization.

## Regression gate

`npm run vd:loop` completed with 11/24 PASS. `repo-browse-repo-selected` is PASS. Previously passing sign-in, workspace-titlebar-closed-menus, and all six stepper screens remained passing; signin-fresh and signin-github-ok also moved to PASS. Remaining failures after this iteration:

- workspace-titlebar-repo-dropdown-open: score 100, residual 2.97%
- workspace-titlebar-gear-menu-open: score 100, residual 3%
- specify-input: score 100, residual 2.88%
- specify-running: score 100, residual 2.95%
- specify-complete: score 100, residual 3.55%
- activity-rail-idle: score 100, residual 5.38%
- activity-rail-busy: score 100, residual 5.86%
- activity-pill-idle: score 100, residual 19.29%
- activity-pill-busy: score 100, residual 19.76%
- customize-modal: score 100, residual 16.51%
- about-modal: score 100, residual 12.09%
- request-modal: score 100, residual 10.63%
- repo-browse-empty-search: score 6, residual 1.34%

## Standard gate

Passed: `rm -rf .vite/build && npm run typecheck && npm run lint && npm test && npm run e2e`.

- Typecheck: passed.
- Lint: passed.
- Unit/integration tests: 792 passed.
- E2E: 23 passed.
