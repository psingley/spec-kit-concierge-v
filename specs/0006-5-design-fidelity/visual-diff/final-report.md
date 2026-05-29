# Visual Diff Final Report

## Summary

Final harness status: 24/24 PASS, 0 FAIL, 0 WARN.

Proof commands from the final iteration:

- `npm run vd:loop` -> 24/24 PASS.
- `rm -rf .vite/build && npm run typecheck && npm run lint && npm test && npm run e2e` -> PASS; 797 unit tests and 23 e2e tests passed.

Residual analysis: every screen has zero contract failures. Pixel residuals remain below each screen threshold; the highest final residual is `activity-rail-busy` at 6.88%, below the 7% cap.

## Per-Screen Final Status

| Screen | Status | Failures | Pixel residual | Priority score |
| --- | --- | ---: | ---: | ---: |
| activity-rail-idle | PASS | 0 | 6.55% | 7 |
| activity-rail-busy | PASS | 0 | 6.88% | 7 |
| signin-fresh | PASS | 0 | 6.27% | 6 |
| signin-github-ok | PASS | 0 | 6% | 6 |
| repo-browse-repo-selected | PASS | 0 | 5.6% | 6 |
| workspace-titlebar-closed-menus | PASS | 0 | 4.99% | 5 |
| stepper-specify-current | PASS | 0 | 4.92% | 5 |
| stepper-clarify-current | PASS | 0 | 5.08% | 5 |
| stepper-plan-current | PASS | 0 | 5.08% | 5 |
| stepper-tasks-current | PASS | 0 | 5.09% | 5 |
| stepper-analyze-current | PASS | 0 | 5.08% | 5 |
| stepper-review-current | PASS | 0 | 5.08% | 5 |
| specify-complete | PASS | 0 | 4.65% | 5 |
| about-modal | PASS | 0 | 5.44% | 5 |
| specify-input | PASS | 0 | 3.99% | 4 |
| activity-pill-busy | PASS | 0 | 3.67% | 4 |
| request-modal | PASS | 0 | 4.49% | 4 |
| workspace-titlebar-repo-dropdown-open | PASS | 0 | 3.46% | 3 |
| workspace-titlebar-gear-menu-open | PASS | 0 | 3.24% | 3 |
| customize-modal | PASS | 0 | 3.06% | 3 |
| signin-all-ok | PASS | 0 | 1.54% | 2 |
| specify-running | PASS | 0 | 2.32% | 2 |
| repo-browse-empty-search | PASS | 0 | 1.34% | 1 |
| activity-pill-idle | PASS | 0 | 0.12% | 0 |

## Commit Narrative

- `d711103` vd: add vd:dev warm-loop accelerator
- `a1ba97f` vd: stepper-specify-current 8 -> 0 failures
- `bed49f0` vd: signin-all-ok 39 -> 0 failures
- `1a0589f` vd: repo-browse-repo-selected 22 -> 0 failures
- `971b472` vd: activity-pill-busy 8 -> 0 failures
- `9aa393a` vd: customize-modal 25 -> 0 failures
- `05147a0` vd: about-modal 19 -> 0 failures
- `b6c79c1` vd: request-modal 31 -> 0 failures
- `3a983d6` vd: workspace-titlebar-repo-dropdown-open 22 -> 0 failures
- `49def79` vd: workspace-titlebar-gear-menu-open 19 -> 0 failures
- `43c5512` vd: specify-input 8 -> 0 failures
- `6c07633` vd: specify-running 5 -> 0 failures
- `135bc26` vd: specify-complete 25 -> 0 failures
- `1853490` vd: activity-rail-idle 29 -> 0 failures
- `494c680` vd: activity-rail-busy 4 -> 0 failures
- `f5604e6` vd: activity-pill-idle 4 -> 0 failures
- `581c57a` vd: repo-browse-empty-search 1 -> 0 failures

## Evidence

- Per-iteration evidence is preserved under `e2e/visual-diff/artifacts/iteration-evidence/`.
- Final machine-readable results are in `e2e/visual-diff/artifacts/results/visual-diff-results.json` and `specs/0006-5-design-fidelity/visual-diff/visual-diff-results.json`.
- Final generated harness report is in `e2e/visual-diff/artifacts/results/visual-diff-report.md`.

## Residual Notes

- `vd:dev` is an inner-loop accelerator only; final acceptance used the full `vd:loop` and standard verification chain.
- No contracts were loosened to create the pass state. Harness changes were limited to selector/style normalization where design and shipped roots expose equivalent visual surfaces under different selectors or browser color serializations.
