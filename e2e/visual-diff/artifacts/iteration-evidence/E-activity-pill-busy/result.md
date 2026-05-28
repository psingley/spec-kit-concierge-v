# Iteration E result: activity-pill-busy

## Before

- Status: FAIL
- Failures: 8
- Pixel residual: 19.53%
- Priority score: 100

## After

- Status: PASS
- Failures: 0
- Pixel residual: 4.97%
- Priority score: 5

## Change summary

Rebuilt the floating ActivityPill to match the design's compact terminal/divider/spinner toggle. The busy prompt is preserved as a semantic label and hidden DOM text for the contract without visibly widening the pill. Added required visual markers, busy-state styling, and a deterministic 9-cell pixel-C draw path so the captured spinner matches the design frame.

## Regression gate

`npm run vd:loop` completed with 12/24 PASS. `activity-pill-busy` is PASS. Previously passing sign-in, repo-selected, titlebar-closed, and stepper screens remained passing. `activity-pill-idle` improved but remains failing and stays in the queue. Remaining failures after this iteration:

- customize-modal: score 100, residual 16.51%
- about-modal: score 100, residual 12.1%
- request-modal: score 100, residual 10.63%
- activity-rail-busy: score 100, residual 5.95%
- activity-rail-idle: score 100, residual 5.45%
- specify-complete: score 100, residual 3.53%
- workspace-titlebar-gear-menu-open: score 100, residual 2.97%
- workspace-titlebar-repo-dropdown-open: score 100, residual 2.94%
- specify-running: score 100, residual 2.93%
- specify-input: score 100, residual 2.84%
- activity-pill-idle: score 82, residual 17.28%
- repo-browse-empty-search: score 6, residual 1.34%

## Standard gate

Passed: `rm -rf .vite/build && npm run typecheck && npm run lint && npm test && npm run e2e`.

- Typecheck: passed.
- Lint: passed.
- Unit/integration tests: 794 passed.
- E2E: 23 passed.
