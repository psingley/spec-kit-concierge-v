# File Display Modal UI Contract

## Goal

Make artifact viewing and Review task details use one shared centered overlay dialog path that floats above the full application surface instead of rendering inside the scrollable workspace body.

## Trigger Contract

| Surface | User action | Renderer action | Expected result |
|---|---|---|---|
| Passive step evidence/status rows | Click artifact path | Dispatch file-display open action with selected path and origin `passive` | Shared modal opens through `ModalHost` and lazy-loads artifact content |
| Review evidence list | Click artifact row | Dispatch file-display open action with selected path and origin `review` | Shared modal opens through `ModalHost` and lazy-loads artifact or review-owned body |
| Review Tasks panel | Click `Open` | Dispatch file-display open action for the `tasks.md` artifact path | Shared modal opens through `ModalHost` and renders `TaskViewer` inside the same overlay shell |

## State Contract

The existing `ui` slice is extended with file-display modal state rather than adding a new slice.

Minimum required fields:

- `showArtifactViewer: boolean`
- `artifactPath: string | null`
- optional `origin: 'passive' | 'review' | null`

Minimum required actions:

- `artifactViewerOpened(...)`
- `artifactViewerClosed()`

Minimum required selectors:

- `selectUiShowArtifactViewer`
- `selectUiArtifactViewerPath`
- optional `selectUiArtifactViewerOrigin`

## Data Source Routing Contract

The new global modal container must reuse existing renderer endpoints and choose the request path from the selected artifact path:

| Path shape | Query path | Output mode |
|---|---|---|
| `tasks.md` suffix | `tasks:detail` | Render `TaskViewer` with parsed tasks |
| Absolute filesystem path | `review:evidence` body mode | Render markdown/plain-text from Review-owned evidence body |
| Relative feature artifact path | `artifacts:read` | Render markdown/plain-text from standard artifact read |

No new IPC capability is introduced for this feature.

## Render Contract

The affected dialog is mounted only from `src/renderer/components/ModalHost.tsx`.

Required DOM shape:

```tsx
<div className="modal-veil" data-vd-role="modal-veil" onClick={onClose}>
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="artifact-viewer-title"
    className="modal artifact-viewer"
    onClick={(event) => event.stopPropagation()}
  >
    ...
  </div>
</div>
```

Required behavior:

- Loading, error, markdown, task-list, and plain-text states all render inside the same dialog shell.
- Close button and backdrop click dismiss the dialog and clear slice state.
- The modal remains centered over the app viewport regardless of `.workspace-step` scroll position.
- The underlying workspace layout does not reflow when the modal opens.

## Regression Contract

The following dialogs must remain on their existing code paths and visual treatment:

- `AboutModal`
- `RequestModal`
- `CustomizeModal`

Regression coverage must continue to prove those dialogs still render with `.modal-veil`.

## Visual Contract

The existing visual-diff screens remain authoritative and must be updated to assert the shared overlay wrapper:

- `passive-artifact-modal`
- `review-task-modal`
- unchanged regression references: `about-modal`, `request-modal`, `customize-modal`
