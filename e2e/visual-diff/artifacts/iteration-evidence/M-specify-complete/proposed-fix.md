# Proposed Fix - specify-complete

## Observed Gap

The shipped complete state still uses the earlier review panel and the visual fixture returns the small hello-world spec. The design contract expects the full `md-panel` workflow with Preview/Edit tabs, `spec.md · 63 lines`, the flight-change markdown headings, Jump to end, and Clarify.

## Fix Plan

- Use the existing visual sample prompt for the complete-state setup.
- Make the test ACP adapter return the design flight-change spec for that sample prompt while preserving the hello-world fixture for other e2e coverage.
- Rebuild the completed Specify branch around `.md-panel`, `.md-tabs`, `.md-scroll`, `.md-preview`, `.advance-row`, and `.gate`.
- Preserve accessibility labels, scroll gate state, and the existing pop-out editor behavior.
