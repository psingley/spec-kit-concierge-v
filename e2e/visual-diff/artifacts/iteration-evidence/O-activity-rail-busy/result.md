# Iteration O: activity-rail-busy result

Before: FAIL, 4 failures, residual 6.56%.
Focused after: PASS, 0 failures, residual 6.69%.
Full regression after: PASS, 0 failures, residual 6.74%.

Change summary: Activity rail now uses a deterministic 16-line busy transcript while preserving the idle transcript and rail structure. The busy Current panel now exposes `Drafting spec.md from prompt...`, and the log includes `git checkout -b spec/draft-rwgq` plus `copilot specify`.

Regression note: full vd:loop reports 22/24 PASS. Remaining failures: activity-pill-idle: 4 failures, residual 17.28%; repo-browse-empty-search: 1 failures, residual 1.34%.

Standard gate: PASS (`rm -rf .vite/build && npm run typecheck && npm run lint && npm test && npm run e2e`), with 797 unit tests and 23 e2e tests passing.
