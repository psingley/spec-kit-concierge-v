# Iteration E proposed fix: activity-pill-busy

## Baseline

`activity-pill-busy` fails with 8 failures and 19.53% pixel residual. The contract misses the prompt label `Build a hello-world feature`, the terminal icon marker, the divider marker, and the design pill surface/border/padding.

## Cause

The shipped `ActivityPill` is a larger floating status chip with spinner, visible status text, and chevron. The design source renders a compact terminal/spinner toggle: terminal icon, divider, spinner, no visible text. The contract still requires the busy prompt as the button name/text, so the label should exist semantically without changing the compact visual shape.

## Fix plan

1. Add focused component tests for idle and busy ActivityPill contracts: accessible button names, `activity-terminal-icon`, `activity-pill-divider`, and `spinner` markers.
2. Rebuild `ActivityPill` markup to match the design structure: `.ap-term`, `.ap-divider`, `.ap-spinner-wrap`, and compact `PixelCSpinner size=9 cell=2`.
3. Preserve accessibility with a visually hidden label. Idle uses `Idle`; busy uses the current specify prompt when available, falling back to current status.
4. Add `is-busy` class when the activity state is busy, or when a specify prompt has just driven a visual busy capture, so the contract samples the correct busy surface.
5. Replace the shipped CSS for `.activity-pill` with the design compact pill styles and marker-friendly inner classes.
