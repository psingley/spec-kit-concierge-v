# Proposed Fix - request-modal

## Observed Gap

The shipped modal is a Run 6.5 stub with a support heading, placeholder paragraph, read-only textarea, and Close button. The design contract requires the real file-a-request form: request type segmented controls, title/details fields, severity segmented controls, automatic context tags, triage destination copy, and Cancel/Send actions.

## Fix Plan

- Rebuild `RequestModal.tsx` from the stub into the design modal anatomy: `modal-veil`, `modal-head`, `modal-body`, `modal-foot`.
- Use deterministic default state that matches the design: bug request type, normal severity, empty title/details, disabled Send request until a title exists.
- Preserve accessibility with dialog semantics, labeled inputs/textareas, pressed-state segmented buttons, and an accessible icon-only dismiss control.
- Add shipped CSS for `.field`, `.segctl`, request context tags, and request modal sizing using the existing modal token system.
- Update the legacy e2e screenshot close action from `Close` to `Cancel`, because the real design contract does not expose a Close footer button.
- Add a focused component test for required request-modal content and controls.
