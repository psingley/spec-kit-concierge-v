# Contract: Visual Screens

Run 8 adds exactly 10 new visual-diff screens. The inherited 27 screens remain unchanged and non-regressed.

## New Screens

| # | Screen id | Purpose |
|---:|---|---|
| 1 | `plan-passive-idle` | Plan body before passive run starts, with validated prerequisites and disabled evidence rows. |
| 2 | `plan-passive-running` | Plan streaming progress with artifact/milestone rows and activity visible. |
| 3 | `plan-passive-done` | Plan pass state with `plan.md`, `research.md`, optional artifact summary, context-file exception, and commit identity. |
| 4 | `tasks-passive-running` | Tasks streaming progress with task-generation milestones. |
| 5 | `tasks-passive-done` | Tasks pass state with task rows and evidence affordance for `tasks.md`. |
| 6 | `analyze-passive-running` | Analyze progress milestones without user-edit prompts. |
| 7 | `analyze-passive-done` | Analyze no-diff or bounded remediation summary with commit identity and no `analyze.md`. |
| 8 | `artifact-viewer-markdown` | Artifact modal rendering GFM markdown structures with safe sanitized output. |
| 9 | `task-viewer-detail` | Task detail modal showing parsed id, title, phase/area, dependencies, files, acceptance notes, and estimate when present. |
| 10 | `passive-hang-notification` | Visible soft hang notification with Cancel/Restart guidance while step remains in progress. |

## Acceptance Rules

- No eleventh Run 8 visual screen is added without changing the spec.
- Existing 27 screen ids remain in the harness.
- The visual suite must prove no ninth renderer slice is required by rendering through the product store.
- Evidence buttons communicate state with text/icon/ARIA, not color only.
- Viewer dialogs have visible focus and accessible names.
- Markdown screen includes tables, task lists, code fences, links, blockquotes, nested lists, and hostile raw HTML stripped from output.
- Hang screen shows guidance and does not display a failed/canceled step state.
