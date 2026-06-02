# Implementation Plan: Remove Fake Traffic Lights

**Branch**: `001-remove-fake-traffic-lights` | **Date**: 2026-06-02 | **Spec**: `specs/001-remove-fake-traffic-lights/spec.md`

**Input**: Feature specification from `/specs/001-remove-fake-traffic-lights/spec.md`

## Summary

Remove the decorative (non-functional) traffic-light dots from the inner titlebar in `src/renderer/components/Titlebar.tsx`. The three colored `<span>` elements inside `.titlebar-dots[data-vd-role="brand-orb"]` mimic macOS window controls but do nothing. Remove the JSX, the associated CSS rules (`.titlebar-dots` and its `span` nth-child selectors in `src/renderer/styles/index.css`), update the co-located test (`Titlebar.test.tsx`) that asserts on `[data-vd-role="brand-orb"]`, and refresh the nine affected visual-diff contract baselines under `e2e/visual-diff/contracts/` (`workspace-titlebar-closed-menus`, `workspace-titlebar-gear-menu-open`, `workspace-titlebar-repo-dropdown-open`, `specify-complete`, `specify-input`, `specify-running`, `signin-all-ok`, `repo-browse-empty-search`, `repo-browse-repo-selected`). The real window controls and the "Spec-kit Concierge" brand label remain untouched.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode + `noUncheckedIndexedAccess`)

**Primary Dependencies**: React 18, Redux Toolkit, Electron Forge, Vite

**Storage**: N/A (renderer-only change)

**Testing**: Vitest + React Testing Library (unit), visual-diff harness (`npm run vd:*`) at 1280x800, 1440x900, and 1920x1080

**Target Platform**: macOS / Windows desktop (Electron)

**Project Type**: Desktop app (Electron)

**Performance Goals**: N/A (static DOM removal)

**Constraints**: Must not break existing window-drag region; must not shift layout for the brand label or auth chip

**Scale/Scope**: 3 renderer files plus affected visual-diff contract baselines, ~35 lines removed

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Layered Architecture | ✅ PASS | Change is renderer-only; no main-process or IPC impact |
| II. Disk Is Truth | ✅ PASS | No state persistence involved |
| III. Bound CLI & Step Execution | ✅ PASS | No ACP / CLI interaction |
| IV. Factory-First Data | ✅ PASS | No new data crossing trust boundaries |
| V. Scoped FP | ✅ PASS | Removal of JSX; no new code introduced |
| VI. State Management | ✅ PASS | No slice or selector changes |
| VII. Step Lifecycle | ✅ PASS | No step execution affected |
| VIII. Step Contracts | ✅ PASS | No Step Contract changes; affected visual-diff baselines are refreshed separately |
| IX. Driveable by External Agents | ✅ PASS | No HTTP API surface change |
| X. MCP Posture | ✅ PASS | No MCP interaction |
| XI. External-Service Submission | ✅ PASS | No JIRA interaction |

**Gate result: ALL PASS — no violations, no complexity tracking required.**

## Project Structure

### Documentation (this feature)

```text
specs/001-remove-fake-traffic-lights/
├── plan.md              # This file
├── research.md          # Phase 0 output
└── spec.md              # Feature specification
```

### Source Code (affected files)

```text
src/renderer/
├── components/
│   ├── Titlebar.tsx              # Remove .titlebar-dots div (lines 238-240)
│   └── Titlebar.test.tsx         # Remove brand-orb assertion (line 62)
├── styles/
│   └── index.css                 # Remove .titlebar-dots rules (lines 311-335)
└── e2e/visual-diff/contracts/
    └── *.contract.json           # Refresh the nine affected baselines that still contain brand-orb
```

**Structure Decision**: Existing Electron app with layered renderer/main split. This feature touches the renderer layer plus the nine affected visual-diff contract baselines that still contain `brand-orb` — one presentational component, its co-located test, and the shared stylesheet. No new files created.

## Complexity Tracking

> No violations. Table intentionally left empty.
