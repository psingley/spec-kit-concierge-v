# Proposed Fix - specify-running

## Observed Gap

The shipped Specify state continues to show the prompt input while a run is busy. The design expects a dedicated loading panel with `Specifying…`, `spec.md`, a spinner marker, and activity-stream guidance. The titlebar also hides draft branch names behind the default branch label.

## Fix Plan

- Render a `.spec-loading` panel when `running` is true and no completed spec exists.
- Add the required spinner marker and loading copy.
- Update the titlebar branch chip to show the active draft branch during running states.
- Add CSS for the loading panel, ring, spinner, and stream footer.
