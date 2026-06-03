# Research: Remove Fake Traffic Lights

**Feature**: 001-remove-fake-traffic-lights
**Date**: 2026-06-02

## Overview

This feature is a targeted cosmetic removal with no external dependencies,
no new technology choices, and no ambiguous requirements. All NEEDS
CLARIFICATION items from the technical context were resolved through direct
codebase inspection.

## Research Findings

### R-001: Identification of the Fake Traffic Lights

**Decision**: The fake traffic lights are the `.titlebar-dots` div in
`src/renderer/components/Titlebar.tsx` (lines 238–240), rendered as three
`<span>` elements colored red/yellow/green via CSS nth-child selectors in
`src/renderer/styles/index.css` (lines 311–335).

**Rationale**: The `data-vd-role="brand-orb"` attribute and `aria-hidden="true"`
confirm these are decorative-only. They have no click handlers, no IPC
invocations, and no associated Redux actions. They do not map to real Electron
`BrowserWindow` controls (minimize/maximize/close), which are handled by the
native frame or `titleBarStyle: 'hidden'` with `trafficLightPosition`.

**Alternatives considered**: None — the spec is explicit that these must be
removed entirely with no replacement.

### R-002: Impact on Window Drag Region

**Decision**: Safe to remove. The `.titlebar-dots` div declares
`-webkit-app-region: drag`, but the parent `.titlebar` header element already
has `drag` set on the overall bar. Removing the child does not break drag
functionality.

**Rationale**: Electron's drag region is additive — any element within a drag
ancestor that sets `-webkit-app-region: no-drag` would exclude itself, but
removing a drag child from a drag parent has no effect on draggability.

**Alternatives considered**: Keeping an invisible spacer — rejected because
the spec explicitly says "no placeholder or reserved space."

### R-003: Layout Collapse After Removal

**Decision**: The `.titlebar-brand` element (the "Spec-kit Concierge" label)
directly follows the `.titlebar-dots` in the flex container. After removal, the
brand label becomes the first flex child of `.titlebar-left`, collapsing the
gap naturally. The `padding: 0 8px` on `.titlebar-brand` provides sufficient
left spacing.

**Rationale**: Flexbox gap between removed siblings is automatically reclaimed.
No explicit margin adjustment needed.

**Alternatives considered**: Adding explicit left padding to `.titlebar-left` —
not needed based on visual inspection of the existing padding on `.titlebar-brand`.

### R-004: Test Impact

**Decision**: One assertion in `Titlebar.test.tsx` line 62 queries
`[data-vd-role="brand-orb"]` and must be removed. The branch-display test
(line 91/105) uses `"016-remove-traffic-dots"` as a branch name string — this
is coincidental naming and is not affected (it tests branch chip rendering).

**Rationale**: Direct grep confirms only one test assertion references the
removed DOM element.

**Alternatives considered**: N/A.

### R-005: E2E / Visual Regression

**Decision**: No existing Playwright e2e tests assert on the traffic-light dots.
The e2e suite tests step flows and workspace behavior, not specific titlebar
decoration.

**Rationale**: Grep of `e2e/` directory shows no references to `brand-orb` or
`titlebar-dots`.

**Alternatives considered**: N/A.

## Unresolved Items

None. All technical context is fully resolved.
