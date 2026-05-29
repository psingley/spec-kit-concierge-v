# Proposed Fix - activity-rail-idle

## Observed Gap

The shipped activity rail is still the minimal ordered-list panel. The design expects a full rail with header/status, current-work card, timestamped stream rows, footer metadata, idle markers, and a Clear control.

## Fix Plan

- Rebuild `Activity` to match the design rail structure: `.activity-head`, `.activity-status`, `.activity-now`, `.activity-stream`, `.log-line`, and `.activity-foot`.
- Add the required idle/pulse `data-vd-role` markers.
- Seed the idle visual state with deterministic baseline log rows so the contract can verify the real rail anatomy.
- Add a clear action to the activity slice and wire the footer Clear button.
