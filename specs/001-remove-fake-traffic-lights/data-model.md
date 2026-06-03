# Data Model: Remove Fake Traffic Lights

**Feature**: 001-remove-fake-traffic-lights
**Date**: 2026-06-02

## Overview

This feature introduces no new entities, state, or data transformations.
It is a pure DOM/CSS removal in the renderer layer.

## Entities

None. No new models, state shapes, or data flows are introduced.

## State Changes

| Slice | Change | Notes |
|-------|--------|-------|
| (none) | No changes | Feature is presentational removal only |

## Affected Interfaces

| Interface | Change Type | Description |
|-----------|-------------|-------------|
| `Titlebar.tsx` JSX | Removal | Delete `.titlebar-dots` div and its 3 child spans |
| `index.css` | Removal | Delete `.titlebar-dots` and `.titlebar-dots span` rule blocks (lines 311–335) |
| `Titlebar.test.tsx` | Removal | Delete assertion on `[data-vd-role="brand-orb"]` |

## Validation Rules

- Post-removal: the `.titlebar-left` flex container must still contain `.titlebar-brand` as its first meaningful child
- No empty gap or misalignment at common window sizes (verified via existing e2e smoke)
- Real window controls (native frame) remain unchanged

## State Transitions

N/A — no state machine involvement.
