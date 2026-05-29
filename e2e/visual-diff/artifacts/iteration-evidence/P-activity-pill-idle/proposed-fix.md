# Iteration P: activity-pill-idle proposed fix

## Baseline

`activity-pill-idle` fails 4 checks:

- Missing text `Idle`
- Missing button named `Idle`
- Border top color sample drift
- Pixel residual above threshold

## Source comparison

The design activity pill is a compact floating terminal/spinner control. The idle contract requires the pill to expose `Idle` as both text and button name, while the shipped pill currently derives its accessible label from `currentStatus`. In the workspace idle capture, that status is no longer the literal `Idle`.

The shipped CSS also hides `.ap-label` down to a 1px accessibility span, so even when the text exists it is not visible in the DOM snapshot region.

## Fix

Make the idle pill deterministic:

- Use `Idle` as the displayed and accessible label when not busy.
- Preserve the existing busy prompt label behavior for `activity-pill-busy`.
- Keep the existing terminal icon, divider, and spinner markers.
- Align the pill border to the design line token while preserving busy accent border.

This is scoped to `ActivityPill.tsx` and its CSS.
