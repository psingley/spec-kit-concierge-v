# Quickstart: Fix File Display Modals

## Implementation order

1. Extend `src/renderer/slices/ui.ts` and `src/renderer/slices/ui.selectors.ts` with shared file-display modal state and actions.
2. Add `src/renderer/components/ArtifactViewerModalContainer.tsx` and mount it from `src/renderer/components/ModalHost.tsx`.
3. Update `src/renderer/components/PassiveStepContainer.tsx`, `src/renderer/components/PassiveStep.tsx`, `src/renderer/components/ReviewStepContainer.tsx`, and `src/renderer/components/ReviewStep.tsx` so they dispatch shared open/close actions instead of rendering inline dialogs.
4. Normalize `src/renderer/components/ArtifactViewer.tsx` to the standard `.modal-veil` overlay structure and remove the bespoke Review task-detail modal branch.
5. Update component and visual regression coverage before broad verification.

## Recommended verification sequence

```bash
npm run test -- src/renderer/components/WorkspaceContainer.test.tsx src/renderer/components/ReviewStepContainer.test.tsx src/renderer/components/ArtifactViewer.test.tsx
npm run test -- src/renderer/components/AboutModal.test.tsx src/renderer/components/RequestModal.test.tsx src/renderer/components/CustomizeModal.test.tsx
npm run vd:capture -- passive-artifact-modal review-task-modal about-modal request-modal customize-modal
npm run vd:diff
npm run vd:report
npm run lint
npm run typecheck
npm run test
```

## Acceptance focus

- Opening `spec.md`, `plan.md`, `tasks.md`, and Review task details shows one centered overlay dialog with a dimmed backdrop.
- The dialog stays centered when the workspace content is scrolled.
- Loading and error states render inside the same overlay shell.
- About, Request, and Customize remain visually and behaviorally unchanged.
