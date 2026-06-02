# Feature Specification: Remove Fake Traffic Lights

**Feature Branch**: `001-remove-fake-traffic-lights`

**Created**: 2026-06-02

**Status**: Draft

**Input**: User description: "lets remove the fake inner-top-bar traffic lights that dont do anything on the top left next to spec-kit concierge logo copy. keep the actual top bar normal behavior obviously but lets remove these fake ones that resulted from an overly literal design enforcement agent"

## Clarifications

### Session 2026-06-02

- Q: What should happen to the fake traffic-light indicators and their related layout/styling? -> A: Remove them entirely.
- Q: Should any placeholder or reserved space remain after removal? -> A: No; the header should collapse the space and stay clean.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cleaner Header Chrome (Priority: P1)

As a user, I see only the real window controls and the concierge logo copy, without duplicate decorative traffic-light indicators in the inner top bar.

**Why this priority**: This is the main visible defect and the entire reason for the change.

**Independent Test**: Open the app in a desktop window and confirm the inner top bar no longer shows fake traffic lights while the standard window controls still work normally.

**Acceptance Scenarios**:

1. **Given** the app is open, **When** the top bar renders, **Then** the area beside the concierge logo copy shows no nonfunctional traffic-light indicators.
2. **Given** the user interacts with the window controls, **When** they minimize, maximize, or close the window, **Then** the controls behave exactly as they do today.
3. **Given** the app is viewed at common window widths, **When** the header is rendered, **Then** the top bar remains aligned and uncluttered.

### Edge Cases

- Very narrow windows should not create overlap or clipping after the decorative indicators are removed.
- High display scaling should not leave a visible spacing gap where the fake controls used to be.
- Any view that uses the same inner top bar should present the cleaned-up header consistently.
- Window state changes should keep the actual controls available and unchanged.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The inner top bar MUST not display decorative traffic-light indicators next to the concierge logo copy.
- **FR-002**: The actual window controls MUST remain visible and continue to behave exactly as they do today.
- **FR-003**: The top bar MUST retain its current branding and layout hierarchy apart from removing the decorative indicators.
- **FR-004**: The change MUST apply consistently anywhere the affected inner top bar appears.
- **FR-005**: The updated header MUST not introduce visible overlap, clipping, or empty control gaps at common window sizes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In the fixed viewport checks (1280x800, 1440x900, and 1920x1080), no decorative traffic-light indicators appear next to the concierge logo copy.
- **SC-002**: The minimize, maximize/restore, and close controls continue to work exactly as they do today.
- **SC-003**: The refreshed titlebar-state baselines (`workspace-titlebar-closed-menus`, `workspace-titlebar-gear-menu-open`, `workspace-titlebar-repo-dropdown-open`) no longer reference `[data-vd-role="brand-orb"]`.
- **SC-004**: The refreshed non-titlebar baselines (`specify-complete`, `specify-input`, `specify-running`, `signin-all-ok`, `repo-browse-empty-search`, `repo-browse-repo-selected`) no longer reference `[data-vd-role="brand-orb"]`, and the contract suite passes.

## Assumptions

- This request only removes decorative, nonfunctional traffic-light indicators in the inner top bar.
- The actual window controls remain untouched and keep their current behavior.
- Existing branding and top-bar placement stay in place apart from the cleanup.
- The feature applies to the current desktop experience only.
