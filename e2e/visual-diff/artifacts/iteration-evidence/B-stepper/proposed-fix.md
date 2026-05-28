# Iteration B Proposed Fix: stepper-specify-current

## Baseline

- Screen: `stepper-specify-current`
- Baseline harness result: FAIL
- Priority score: 100
- Pixel residual: 10.89%

## Diagnosis

The design stepper is an orb-based progress row: each step is a compact label with a 14px circular orb, separator line segments between steps, and a bottom track/fill layer. The shipped stepper is still a button-tab grid with large 26px pseudo-element circles, status text labels, and pseudo-element connectors. That creates both required-marker failures and a larger pixel mismatch.

## Fix Plan

- Rebuild `Stepper.tsx` so each tab renders as a `.step` button with:
  - semantic `role="tab"` and `aria-selected`
  - native `disabled` plus `aria-disabled`
  - existing `data-testid="step-<name>"`
  - only required contract markers: `step-orb`, `step-separator`, `stepper-track`, and `stepper-track-fill`
- Keep the constitution step order: Specify, Clarify, Plan, Tasks, Analyze, Review.
- Preserve accessibility names by making the button text just the visible step label, not the internal state.
- Replace tab-grid CSS with design-aligned orb/track CSS in `src/renderer/styles/index.css`.
- Add a renderer unit test before coding to lock the required markers and tab semantics.

## Regression Risk

The main risk is navigation/accessibility regression because the current component relies on buttons. The fix keeps real buttons and tab roles, so keyboard/focus behavior and the existing screen setup selectors should continue to work.
