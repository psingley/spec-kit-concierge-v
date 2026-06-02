# Implementation Plan: Fix File Display Modals

**Branch**: `017-fix-file-display` | **Date**: 2026-06-02 | **Spec**: `specs/0014-fix-file-display/spec.md`

**Input**: Feature specification from `specs/0014-fix-file-display/spec.md`; current renderer modal infrastructure in `src/renderer/components/ModalHost.tsx`, `src/renderer/components/ArtifactViewer.tsx`, `src/renderer/components/PassiveStepContainer.tsx`, `src/renderer/components/ReviewStepContainer.tsx`, `src/renderer/components/ReviewStep.tsx`, and `src/renderer/styles/index.css`.

**Note**: This plan stops after Spec Kit Phase 2 planning. `/speckit.tasks` creates implementation tasks. The intended change is renderer-only and should reuse existing IPC/query contracts rather than introduce new transport or persistence surfaces.

## Summary

The broken behavior comes from two local rendering paths: `ArtifactViewer` is mounted inside `PassiveStep` and `ReviewStep`, and Review task details use a second bespoke modal branch inside `ReviewStep`. Both paths live inside the scrollable workspace content, so the dialogs appear inline instead of floating above the full app.

The fix keeps the scope narrow by reusing the existing global modal architecture: extend the `ui` slice with shared file-display state, render the viewer from `ModalHost`, reuse the standard `.modal-veil` + `.modal` overlay treatment already used by About/Request/Customize, and route all affected opens through one tasks-aware `ArtifactViewer` flow. Existing About, Request, and Customize dialogs remain unchanged.

## Technical Context

**Language/Version**: TypeScript 5.7 strict, Node 22+, React 18, Electron 33.

**Primary Dependencies**: Existing Electron, React, React Redux, Redux Toolkit + RTK Query, `react-markdown`, `remark-gfm`, and `rehype-sanitize`. No new runtime dependency additions are planned.

**Storage**: Disk-backed artifact content remains authoritative through the existing `artifacts:read`, `review:evidence`, and `tasks:detail` IPC/query paths. Renderer state only tracks which file-display dialog is open.

**Testing**: Vitest + React Testing Library for component/container coverage, existing workspace/review tests for flow regression, and required visual-diff harness contract updates for `passive-artifact-modal` and `review-task-modal` plus unchanged About/Request/Customize modal contracts. Standard repo verification remains `npm run typecheck`, `npm run lint`, and `npm run test`; visual-diff contract coverage is part of the feature verification plan for the affected modal screens.

**Target Platform**: Electron desktop app on common desktop window sizes, with acceptance focus on 1280x800 and 1440x900.

**Project Type**: Desktop application with main/preload/renderer split and renderer modal orchestration owned by Redux UI state plus RTK Query.

**Performance Goals**: Opening any affected dialog must not reflow the workspace layout, must keep the close affordance visible within the viewport, and must continue lazy-reading artifact content on open rather than prefetching full step bodies.

**Constraints**: Reuse `ModalHost` and the existing `.modal-veil` overlay treatment; keep About/Request/Customize behavior unchanged; do not add a new Redux slice or a new IPC capability; keep renderer I/O behind existing RTK Query endpoints and preload bridge methods; preserve loading/error/content handling for markdown, task-list, and plain-text artifact states.

**Scale/Scope**: One narrow renderer slice across `ui` state/selectors, `ModalHost`, `ArtifactViewer`, `PassiveStep*`, `ReviewStep*`, shared CSS, and targeted component/visual regression tests.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate Result | Plan Response |
|-----------|-------------|---------------|
| I. Layered Architecture | PASS | The feature reuses existing RTK Query endpoints and preload bridge methods. No renderer Electron/Node imports or main-process transport changes are introduced. |
| II. Disk Is Truth | PASS | Modal state remains ephemeral renderer state; artifact bodies still come from existing disk/git-backed queries on demand. |
| IV. Factory-First Data Transformation | PASS | Existing artifact, review-evidence, and tasks-detail factories remain the only typed entry points for modal content. |
| V. Scoped Functional Programming | PASS | Effects stay in smart containers and RTK Query hooks; selectors and presentational components remain the read-only/pure surfaces. |
| VI. State Management | PASS | The design extends the existing `ui` slice and `ModalHost` instead of adding a new slice, thunk, or event bus. RTK Query continues to own IPC reads. |
| XII/XIII. Smart/Dumb + Effects | PASS | `PassiveStepContainer`, `ReviewStepContainer`, and the modal host remain smart; `PassiveStep`, `ReviewStep`, and `ArtifactViewer` stay props-first presentation surfaces. |
| XIV. Accessibility | PASS | Affected dialogs converge on one semantic overlay pattern with `role="dialog"`, `aria-modal="true"`, visible close controls, and loading/error announcements inside the modal. |
| XVI. Spec-kit Discipline | PASS | Phase 0/1 artifacts stay under `specs/0014-fix-file-display/`, and `.github/copilot-instructions.md` is updated only for the allowed Plan context-file exception. |

No constitution violations require complexity tracking.

## Project Structure

### Documentation (this feature)

```text
specs/0014-fix-file-display/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── file-display-modal-ui.md
└── tasks.md                  # created later by /speckit.tasks
```

### Source Code (repository root)

```text
src/renderer/
├── components/
│   ├── ModalHost.tsx
│   ├── ArtifactViewer.tsx
│   ├── ArtifactViewerModalContainer.tsx   # new global smart container
│   ├── PassiveStep.tsx
│   ├── PassiveStepContainer.tsx
│   ├── ReviewStep.tsx
│   ├── ReviewStepContainer.tsx
│   ├── AboutModal.tsx
│   ├── RequestModal.tsx
│   └── CustomizeModal.tsx
├── slices/
│   ├── ui.ts
│   └── ui.selectors.ts
└── styles/
    └── index.css

src/renderer/api/
├── artifacts.endpoint.ts
├── reviewEvidence.endpoint.ts
└── tasksDetail.endpoint.ts

src/renderer/components/
├── WorkspaceContainer.test.tsx
├── ArtifactViewerModalContainer.test.tsx
├── ReviewStepContainer.test.tsx
├── ReviewStep.test.tsx
├── AboutModal.test.tsx
├── RequestModal.test.tsx
├── CustomizeModal.test.tsx
└── ArtifactViewer.test.tsx              # add if absent
src/renderer/slices/
└── ui.selectors.test.ts                  # add if absent

e2e/visual-diff/
├── harness/screens.config.ts
└── contracts/
    ├── passive-artifact-modal.contract.json
    ├── review-task-modal.contract.json
    ├── about-modal.contract.json
    ├── request-modal.contract.json
    └── customize-modal.contract.json
```

**Structure Decision**: Keep the existing Electron layout and renderer smart/dumb split. Centralize the affected file-display overlay under `ModalHost` with `ui` slice state, reuse existing RTK Query endpoints for all content reads, and limit visual changes to the shared file-display path rather than introducing another specialized Review-only dialog implementation.

## Phase 0: Research

Research is complete in `research.md`. The planning unknowns are resolved:

- The standard overlay presentation path is `ModalHost` mounted beside the workspace body, backed by `ui` slice modal state and the `.modal-veil` / `.modal` CSS pair.
- `ArtifactViewer` currently renders inline inside `PassiveStep` and `ReviewStep`, so it inherits the scrollable workspace flow instead of the fixed overlay treatment.
- Review task details already open the tasks artifact path and the existing `ArtifactViewer` already knows how to render `tasks.md` through `TaskViewer`, so a second dedicated Review task modal is unnecessary.
- Existing RTK Query endpoints already cover all required content sources: relative feature artifacts (`artifacts:read`), review-owned absolute-path bodies (`review:evidence` body mode), and parsed task lists (`tasks:detail`).
- The existing visual-diff screens `passive-artifact-modal` and `review-task-modal` provide the right regression surfaces and should be updated rather than replaced.

## Phase 1: Design & Contracts

Design artifacts are complete:

- `data-model.md` defines the renderer file-display modal state, request routing rules, derived payload states, and the shared overlay presentation contract.
- `contracts/file-display-modal-ui.md` defines the trigger, state, render, dismissal, and data-source contract for passive-step artifacts and Review task details.
- `quickstart.md` defines the recommended implementation order and verification entry points.
- `.github/copilot-instructions.md` now points the active SPECKIT plan reference at `specs/0014-fix-file-display/plan.md`.

## Implementation Approach

1. **Promote file-display state into the existing `ui` slice.** Add open/close state and selected artifact path fields/selectors so passive/review surfaces stop owning inline modal state.
2. **Add a global `ArtifactViewerModalContainer` under `ModalHost`.** This new smart container reads the selected artifact path from `ui`, selects the active repository from existing workspace state, and drives the current RTK Query lazy readers for artifact text, review-evidence bodies, and parsed tasks.
3. **Remove local inline dialog ownership from passive/review surfaces.** `PassiveStepContainer` and `ReviewStepContainer` dispatch shared open/close actions, `PassiveStep` stops rendering the viewer inline, and `ReviewStep` removes the bespoke `taskModalOpen` branch and reuses `onArtifactOpen(taskArtifact.path)` for task details.
4. **Normalize `ArtifactViewer` to the standard modal markup.** Render the same fixed `.modal-veil` wrapper, `data-vd-role="modal-veil"` marker, dialog shell, keyboard/focus-safe dismissal behavior, and loading/error announcements, while keeping markdown, task-list, and plain-text states inside the same dialog.
5. **Extend regression coverage where the bug currently leaks through.** Update `WorkspaceContainer.test.tsx`, add/extend `ReviewStepContainer.test.tsx`, add `ArtifactViewer.test.tsx`, `ArtifactViewerModalContainer.test.tsx`, `ReviewStep.test.tsx`, and `ui.selectors.test.ts` if needed, and tighten the `passive-artifact-modal` and `review-task-modal` visual contracts so they assert the overlay wrapper instead of tolerating inline rendering.

## Post-Design Constitution Check

| Gate | Result |
|------|--------|
| Existing IPC/query boundaries reused | PASS: all dialog content still comes through `artifacts:read`, `review:evidence`, and `tasks:detail`. |
| State inventory preserved | PASS: `ui` slice extension only; no new slice or cross-domain thunk. |
| Shared modal path reused | PASS: `ModalHost` becomes the only renderer mount point for the affected file-display overlay. |
| Accessibility and dismissal preserved | PASS: one standard dialog shell covers loading, error, markdown, task-list, and text states. |
| Scope remains narrow | PASS: About, Request, and Customize remain untouched aside from regression checks. |

No gate failures or unresolved clarifications remain.

## Complexity Tracking

No constitution violations. The only intentional cross-surface complexity is moving a broken inline renderer path onto the already-established global modal host so the passive and review flows share one overlay implementation instead of two divergent ones.
