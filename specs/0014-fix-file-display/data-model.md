# Data Model: Fix File Display Modals

## Entity: `FileDisplayModalState`

Renderer-owned UI state for the shared file-display overlay.

| Field | Type | Description |
|---|---|---|
| `showArtifactViewer` | `boolean` | Whether the shared file-display modal is mounted by `ModalHost`. |
| `artifactPath` | `string \| null` | The selected artifact/task path currently displayed. |
| `origin` | `'passive' \| 'review' \| null` | Optional provenance for analytics/debugging and future copy differences; not authoritative. |

**Validation rules**

- `showArtifactViewer === false` requires `artifactPath === null` and `origin === null`.
- `showArtifactViewer === true` requires a non-empty `artifactPath`.
- `origin` is a renderer hint only; query routing is derived from `artifactPath`.

**State transitions**

`closed -> opening -> open(loading | error | ready) -> closed`

Opening is driven by a UI action from passive or review surfaces. Closing is driven by the close button or backdrop interaction. Loading/error/ready are derived from RTK Query state, not persisted in the slice.

## Entity: `FileDisplayRequest`

The normalized request the modal container derives before firing the correct existing query.

| Field | Type | Description |
|---|---|---|
| `repositoryPath` | `string` | Current worktree path from workspace state. |
| `artifactPath` | `string` | Relative feature artifact path or absolute Review-owned evidence path. |
| `requestKind` | `'artifact' \| 'reviewEvidenceBody' \| 'tasksDetail'` | Which existing query path to use. |

**Validation rules**

- `artifactPath.endsWith('tasks.md')` selects `requestKind = 'tasksDetail'`.
- Absolute filesystem paths select `requestKind = 'reviewEvidenceBody'`.
- All other paths select `requestKind = 'artifact'`.
- `repositoryPath` must come from selected workspace repo state; the modal does not invent or cache a separate root.

## Entity: `FileDisplayPayload`

The derived modal view model the presentational `ArtifactViewer` consumes.

| Field | Type | Description |
|---|---|---|
| `title` | `string` | Human-readable dialog heading, usually the artifact path. |
| `status` | `'loading' \| 'error' \| 'ready'` | Content readiness for the open dialog. |
| `contentKind` | `'markdown' \| 'tasks' \| 'plainText'` | Rendering mode inside the shared dialog. |
| `text` | `string` | Markdown or plain-text body when applicable. |
| `tasks` | `ParsedTask[]` | Parsed tasks when the selected path is `tasks.md`. |
| `errorMessage` | `string \| undefined` | User-facing error copy when the read fails. |

**Validation rules**

- `contentKind = 'tasks'` requires `tasks.length >= 0` and ignores `text`.
- `contentKind = 'markdown'` is selected for `.md` paths other than `tasks.md`.
- `contentKind = 'plainText'` is selected for non-markdown artifacts.
- `status = 'error'` requires `errorMessage` and still renders inside the same modal shell.

## Entity: `StandardOverlayDialogPattern`

The shared renderer presentation contract for the affected dialogs.

| Field | Type | Description |
|---|---|---|
| `veilClass` | `'.modal-veil'` | Fixed full-screen backdrop container. |
| `dialogClass` | `'.modal.artifact-viewer'` | Centered dialog shell for artifact and task content. |
| `visualMarker` | `'data-vd-role=modal-veil'` | Marker used by visual-diff contracts. |
| `dismissTriggers` | `'close-button' \| 'backdrop'` | Supported dismissal affordances. |

**Validation rules**

- The overlay must be mounted outside `.workspace-step` scroll content via `ModalHost`.
- The veil uses `position: fixed`, full-screen inset, dimmed backdrop, and centered layout.
- The dialog retains `role="dialog"` and `aria-modal="true"`.

## Relationships

- `FileDisplayModalState` selects zero or one `FileDisplayRequest`.
- `FileDisplayRequest` resolves to one `FileDisplayPayload` through existing RTK Query endpoints.
- `FileDisplayPayload` always renders inside `StandardOverlayDialogPattern`.
- Review task details reuse the same relationship chain by selecting the `tasks.md` artifact path instead of introducing a separate modal entity.
