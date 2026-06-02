# Feature Specification: Fix File Display Modals

**Feature Branch**: `017-fix-file-display`

**Created**: 2026-06-02

**Status**: Draft

**Input**: User description: "Fix the file-display modals so they render as proper centered overlay modals instead of appearing inline inside the scrollable workspace container."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Open artifacts in a true overlay modal (Priority: P1)

As a user reviewing generated artifacts, I want spec, plan, and tasks files to open in a centered overlay dialog so I can read them without the workspace layout shifting around me.

**Why this priority**: Artifact viewing is the primary broken experience. If these files still appear inline, the app feels visually broken during normal step review.

**Independent Test**: From the workspace, open each supported artifact file and confirm it appears centered over the full app with a dimmed backdrop while the underlying step layout remains unchanged.

**Acceptance Scenarios**:

1. **Given** a user opens `spec.md`, `plan.md`, or `tasks.md` from a step, **When** the file display appears, **Then** it is shown as a centered overlay dialog above the full app with the standard dimmed backdrop.
2. **Given** the workspace step area is scrolled, **When** a user opens an artifact file, **Then** the file display does not appear inline inside the scrollable step content and does not reflow the page.
3. **Given** an artifact is loading or returns an error, **When** the viewer is shown, **Then** the loading or error state appears inside the same overlay dialog treatment instead of inline in the workspace.

---

### User Story 2 - Inspect review task details in the same overlay pattern (Priority: P2)

As a user reviewing task details, I want the Review-step task detail view to open as the same full-screen overlay pattern used elsewhere in the app so the experience feels consistent and readable.

**Why this priority**: The Review-step task detail dialog is explicitly affected by the same bug and must be fixed alongside artifact viewing to remove the remaining broken inline modal behavior.

**Independent Test**: In the Review step, open task details and confirm they appear as a centered overlay with the standard backdrop and dismiss behavior.

**Acceptance Scenarios**:

1. **Given** the Review step offers task details, **When** the user opens them, **Then** the details appear in a centered overlay dialog over the whole app rather than inside the review panel flow.
2. **Given** task details are open, **When** the user dismisses the dialog, **Then** the overlay closes cleanly and the user returns to the same review context underneath.

---

### User Story 3 - Preserve existing working dialogs (Priority: P3)

As a user, I want the already-correct About, Request, and Customize dialogs to continue working exactly as they do now so the fix does not introduce regressions in unrelated modal flows.

**Why this priority**: The request is intentionally narrow. Regressing other dialogs would make the bug fix unsafe.

**Independent Test**: Open About, Request, and Customize after the fix and confirm their appearance and dismissal behavior remain unchanged.

**Acceptance Scenarios**:

1. **Given** the existing standard dialogs are available, **When** a user opens About, Request, or Customize, **Then** each dialog still renders and dismisses exactly as before.

### Edge Cases

- Opening a file-display modal from deep within a scrolled workspace must still place the dialog in the center of the app viewport.
- Long artifact content must remain readable within the overlay without pushing the dialog outside the viewport.
- Switching between supported artifact types must keep the same overlay treatment for markdown, task-list, plain-text, loading, and error states.
- Closing an affected modal must not leave a stray backdrop or duplicate overlay behind.
- Common desktop window sizes must keep the dialog centered and keep critical controls visible.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST display opened artifact files as centered overlay dialogs above the full application surface, using the standard dimming backdrop and never rendering inline inside the scrollable workspace-step container.
- **FR-002**: The system MUST present the Review-step task detail view through the same centered overlay dialog pattern used for artifact files.
- **FR-003**: The system MUST let users dismiss affected dialogs via the visible close control, Escape key, and backdrop click, then remove the overlay/backdrop, restore focus to the invoking control when available, and return to the previous workspace context without layout reflow.
- **FR-004**: The system MUST reuse the application's existing centralized overlay-dialog presentation path and shared UI-state pattern for the affected dialogs instead of introducing a separate modal flow.
- **FR-005**: The system MUST support the same overlay treatment for artifact loading, error, markdown, task-list, and plain-text display states.
- **FR-006**: The system MUST avoid user-visible behavior changes outside the artifact viewer and the Review-step task detail dialog, while allowing existing shared renderer modal infrastructure to be reused for those two affected dialogs.
- **FR-007**: The system MUST leave the existing About, Request, and Customize dialogs unchanged in appearance and behavior.
- **FR-008**: The system MUST keep affected dialogs centered and readable at common desktop window sizes without clipping essential controls.
- **FR-009**: The system MUST expose affected dialogs with semantic dialog accessibility (`role="dialog"` and `aria-modal="true"`), visible keyboard-operable close controls, trap-free keyboard operation, focus movement/return behavior, and loading/error announcements inside the dialog shell.

### Key Entities *(include if feature involves data)*

- **File-Display Dialog**: The overlay experience used to present generated files such as `spec.md`, `plan.md`, and `tasks.md`, and task details from the Review step, including loading, error, and content states.
- **Standard Modal Pattern**: The application's existing modal presentation behavior, including centered placement, backdrop dimming, keyboard/focus behavior, and dismissal handling, which serves as the expected experience for this fix.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In acceptance testing, opening `spec.md`, `plan.md`, `tasks.md`, and Review-step task details results in a centered overlay dialog with a dimmed backdrop in 100% of tested cases.
- **SC-002**: In acceptance testing, 0 affected dialogs appear inline within the scrollable workspace-step container.
- **SC-003**: At common desktop window sizes of 1280×800 and 1440×900, affected dialogs remain centered and keep their close controls visible in 100% of tested cases.
- **SC-004**: Users can dismiss any affected dialog with the close control, Escape key, or backdrop click and return focus to the same workspace context without visible page reflow in 100% of tested cases.
- **SC-005**: Automated renderer tests verify semantic dialog markup, close-control accessibility, and loading/error announcements for affected dialogs in 100% of targeted modal states.
- **SC-006**: Regression checks confirm About, Request, and Customize continue to behave unchanged in 100% of tested flows.

## Assumptions

- The application's existing standard overlay dialog experience is the intended visual and interaction model for this fix.
- The change is limited to renderer-side presentation and state wiring; no workflow, backend, or main-process behavior changes are required.
- The affected dialogs remain read-only views of existing artifact and task-detail content.
- Common desktop window sizes are the relevant target context for validation of this fix.
- Introducing a new parallel modal mechanism is out of scope for this feature.
