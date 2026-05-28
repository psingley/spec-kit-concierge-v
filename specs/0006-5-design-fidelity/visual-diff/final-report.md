# Visual Diff Final Report

Capture, diff, and report completed on 2026-05-28 from `chore/0006-5-design-fidelity`.

## Summary

All 24 visual-diff screens are at or below the 9% gate. The initial successful baseline already passed, so no CSS/JSX parity iteration was required after harness hardening.

| Screen | Baseline % | Final % | Delta | Gate |
| --- | ---: | ---: | ---: | --- |
| customize-modal | 6.86 | 6.86 | 0.00 | PASS |
| request-modal | 5.19 | 5.19 | 0.00 | PASS |
| repo-browse-repo-selected | 5.03 | 5.03 | 0.00 | PASS |
| about-modal | 4.93 | 4.93 | 0.00 | PASS |
| signin-all-ok | 4.17 | 4.17 | 0.00 | PASS |
| activity-rail-idle | 3.98 | 3.98 | 0.00 | PASS |
| activity-rail-busy | 3.88 | 3.88 | 0.00 | PASS |
| specify-complete | 3.61 | 3.61 | 0.00 | PASS |
| activity-pill-busy | 3.26 | 3.26 | 0.00 | PASS |
| workspace-titlebar-closed-menus | 3.23 | 3.23 | 0.00 | PASS |
| workspace-titlebar-repo-dropdown-open | 3.23 | 3.23 | 0.00 | PASS |
| stepper-specify-current | 3.23 | 3.23 | 0.00 | PASS |
| stepper-clarify-current | 3.23 | 3.23 | 0.00 | PASS |
| activity-pill-idle | 3.23 | 3.23 | 0.00 | PASS |
| stepper-plan-current | 3.22 | 3.22 | 0.00 | PASS |
| stepper-tasks-current | 3.22 | 3.22 | 0.00 | PASS |
| stepper-analyze-current | 3.22 | 3.22 | 0.00 | PASS |
| stepper-review-current | 3.22 | 3.22 | 0.00 | PASS |
| workspace-titlebar-gear-menu-open | 3.18 | 3.18 | 0.00 | PASS |
| specify-input | 3.16 | 3.16 | 0.00 | PASS |
| specify-running | 3.16 | 3.16 | 0.00 | PASS |
| signin-github-ok | 2.20 | 2.20 | 0.00 | PASS |
| signin-fresh | 2.13 | 2.13 | 0.00 | PASS |
| repo-browse-empty-search | 1.36 | 1.36 | 0.00 | PASS |

## Residual Analysis

- `customize-modal` is the highest residual at 6.86%, still 2.14 points under the gate.
- Remaining residuals are from accepted harness masks and expected host differences: scrollbar gutter painting, generated activity timestamps, and text subpixel rendering between the browser-served prototype and bundled Electron assets.
- No screen plateaued above the threshold. No visual parity fix attempts were needed after the harness produced valid screenshots.

## Artifacts

- Results: `specs/0006-5-design-fidelity/visual-diff/visual-diff-results.json`
- Baseline copy: `specs/0006-5-design-fidelity/visual-diff/visual-diff-results-baseline.json`
- Screenshots: `e2e/visual-diff/screenshots/`
