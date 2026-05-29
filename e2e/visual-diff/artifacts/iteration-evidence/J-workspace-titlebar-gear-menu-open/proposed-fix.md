# Proposed Fix - workspace-titlebar-gear-menu-open

## Observed Gap

The shipped settings menu omits the design's bug-report and export-log rows, labels the request action differently, and exposes rows as menuitems while the contract requires button controls.

## Fix Plan

- Rebuild the settings popup content to match the design: Customize, Report a bug, Export activity log with `14 lines`, and About.
- Expose the settings popup as a dialog-style action popover with real button controls, while preserving keyboard escape/tab handling.
- Add `data-vd-role="gear-menu-icons"` to the icon-bearing menu so the existing contract marker remains explicit.
- Align gear item sizing/gap/padding and contrast with the design selectors.
- Update focused Titlebar tests to use the new action-popover role and required row names.
