# Iteration Journal

## 2026-05-28 - Harness Replacement And Run 6 Parity

- Replaced the old full-viewport pixelmatch-only scripts with the four-layer harness under `e2e/visual-diff/harness/`.
- Added TDD coverage for contract extraction, required-element verification, and priority scoring.
- Generated 24 initial contracts from `design/v3-fetch/project/*.jsx`, then reviewed them to remove aggregate JSX text and setup-flow noise.
- Fixed `signin-fresh` in shipped React/CSS: restored the brand mark, correct `Spec-kit Concierge` heading, provider names, subtitles, real sign-in buttons, footer copy, and `data-vd-role="signin-mark"`.
- Added `data-vd-role="spinner"` to the shipped pixel spinner for contracts that intentionally require a spinner marker.
- Corrected contract noise where design JSX contained global spinner/pulse artifacts that were not required markers for stepper or activity-rail screens.
- Full harness result after iteration: `24/24 PASS`; worst residual is activity-pill at `19.29%` / `19.41%`, accepted by reviewed contract because the semantic and marker gates pass and the crop is tiny/high-motion.
