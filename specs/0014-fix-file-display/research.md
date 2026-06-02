# Research: Fix File Display Modals

## Decision 1: Reuse `ModalHost` and `ui` slice state for the affected file-display dialogs

- **Decision**: Move artifact-viewer open/close state out of `PassiveStepContainer` / `ReviewStepContainer` and render the affected dialog from `src/renderer/components/ModalHost.tsx`, using new `ui` slice fields/actions/selectors.
- **Rationale**: The current bug exists because file-display UI is mounted inside the scrollable `.workspace-step` flow. The existing working dialogs already solve centered overlay placement through `ModalHost` and `.modal-veil`, so the smallest behavior-safe fix is to route the broken dialogs through the same host and shared state pattern.
- **Alternatives considered**:
  - Add `position: fixed` directly to the inline viewer and leave state local. Rejected because the spec requires reuse of the application's centralized overlay path and shared UI-state model.
  - Create a second modal host under the step content. Rejected because it preserves duplicate dialog ownership and keeps overlay logic split across surfaces.

## Decision 2: Reuse `ArtifactViewer` for Review task details instead of maintaining a second Review-only modal branch

- **Decision**: Remove the bespoke `taskModalOpen` branch from `src/renderer/components/ReviewStep.tsx` and treat Review task details as another open of the shared tasks-aware `ArtifactViewer`.
- **Rationale**: Review already opens the `tasks.md` artifact path before showing task details, and `ArtifactViewer` already switches to `TaskViewer` when the selected path ends with `tasks.md`. Reusing the same dialog eliminates divergence between artifact and task-detail overlays while satisfying the requirement that both use the same overlay pattern.
- **Alternatives considered**:
  - Keep a dedicated `ReviewTaskModal` component and only restyle it. Rejected because it leaves two separate modal implementations for the same user-visible behavior.
  - Create a second global modal container for task details. Rejected because it adds state and wiring without any new capability beyond what `ArtifactViewer` already supports.

## Decision 3: Keep all content reads lazy and route them through the existing RTK Query endpoints

- **Decision**: Let the new global modal container continue to choose between `artifacts:read`, `review:evidence` body mode, and `tasks:detail` based on the selected artifact path.
- **Rationale**: The current containers already have the correct routing rules: relative feature paths use `artifacts:read`, absolute Review paths use `review:evidence` body mode, and `tasks.md` uses `tasks:detail`. Reusing those rules preserves disk-backed truth, keeps the renderer free of direct I/O, and avoids new IPC work for a renderer-only bugfix.
- **Alternatives considered**:
  - Preload artifact bodies in each step before the modal opens. Rejected because it adds unnecessary reads and does not improve the overlay bug.
  - Add a new combined IPC channel for modal content. Rejected because existing typed endpoints already cover every required content shape.

## Decision 4: Tighten the existing component and visual-diff tests rather than inventing a new verification lane

- **Decision**: Extend `WorkspaceContainer.test.tsx`, `ReviewStepContainer.test.tsx`, and the existing visual-diff screens/contracts (`passive-artifact-modal`, `review-task-modal`) so they assert the overlay wrapper and unchanged standard dialogs.
- **Rationale**: The repository already has tests for working modal surfaces and visual-diff coverage for the affected screens. The gap is that current artifact-related checks assert dialog presence but not the fixed overlay shell, so strengthening those tests prevents a regression back to inline rendering without adding a whole new harness.
- **Alternatives considered**:
  - Rely on CSS-only review or manual QA. Rejected because the bug is structural and needs automated guardrails.
  - Add an entirely new Playwright-only suite for this fix. Rejected because the existing component and visual-diff surfaces already target the affected renderer paths.
