# Proposed Fix - specify-input

## Observed Gap

The shipped Specify input state uses a plain textarea plus a single `Begin Specify` button. The design contract expects the prompt input card with `.prompt-input`, a footer action row, `Clear`, lowercase `Begin specify`, and a sparkle marker inside the primary action.

## Fix Plan

- Rebuild the not-yet-complete Specify state around `prompt-input-card`, `.prompt-input`, and `.spec-input-actions`.
- Add a Clear button wired to `onPromptChange('')`.
- Rename the primary action to `Begin specify` and add the required `data-vd-role="begin-sparkle"` icon marker.
- Preserve textarea labeling and begin disabled/running behavior.
- Add CSS for the prompt input card and action footer using the design tokens.
