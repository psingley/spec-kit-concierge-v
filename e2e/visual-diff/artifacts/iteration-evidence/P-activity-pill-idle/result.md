# Iteration P: activity-pill-idle result

Before: FAIL, 4 failures, residual 17.28%.
Focused after: PASS, 0 failures, residual 0.12%.
Full regression after: PASS, 0 failures, residual 0.12%.

Change summary: Activity pill idle labeling is deterministic as `Idle`, the tiny pixel-C spinner uses the design-size 9-cell frame and color behavior, and style normalization now maps Electron RGB output for the design surface background. Busy pill behavior remained green in regression.

Regression note: full vd:loop reports 23/24 PASS. Remaining failures: repo-browse-empty-search: 1 failures, residual 1.34%.

Standard gate: PASS (`rm -rf .vite/build && npm run typecheck && npm run lint && npm test && npm run e2e`), with 797 unit tests and 23 e2e tests passing.
