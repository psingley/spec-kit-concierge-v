# Quickstart: Send to JIRA from Review

## Implementation order

1. Add pure main-process JIRA submission modules for config loading, `spec.md` + `tasks.md` parsing, payload rendering, and canonical submission-record read/write under `src/main/data-layer/jiraSubmission/`.
2. Add `src/main/ipc/jiraSubmission.ts` plus main/renderer trust-boundary factories and expose the preload bridge on `window.concierge.jiraSubmission`.
3. Add the renderer `jira` slice for submission state, and extend the renderer `ui` slice plus `ModalHost` only for shared preview/progress modal visibility.
4. Update `ReviewStepContainer.tsx` and `ReviewStep.tsx` to gate **Send to JIRA** from existing Atlassian auth state plus the Review evidence `tasks.md` artifact and to surface preview/resume/result affordances.
5. Add the streaming submission mutation, progress modal, and final result rendering before broad verification.

## Recommended verification sequence

```bash
npm run test -- src/main/data-layer/jiraSubmission/config.test.ts src/main/data-layer/jiraSubmission/parser.test.ts src/main/data-layer/jiraSubmission/records.test.ts src/main/data-layer/jiraSubmission/runner.test.ts
npm run test -- src/main/ipc/jiraSubmission.factory.spec.ts src/main/ipc/jiraSubmission.test.ts src/renderer/api/jiraSubmission.factory.spec.ts src/renderer/api/jiraSubmission.endpoint.test.ts
npm run test -- src/renderer/components/ReviewStepContainer.test.tsx src/renderer/components/ReviewStep.test.tsx src/renderer/components/JiraSubmissionPreviewModal.test.tsx src/renderer/components/JiraSubmissionProgressModal.test.tsx
npm run lint
npm run typecheck
npm run test
```

## Acceptance focus

- Review shows **Send to JIRA** only when Atlassian MCP is ready and `tasks.md` exists.
- Opening the action shows a dry-run preview modal with the full Epic -> Story -> Subtask hierarchy and warning rows before any Jira create attempt starts.
- Confirmed submission updates progress one node at a time, surfaces created/adopted issue keys and links, and halts visibly on the first non-advanceable node.
- Closing and reopening the app rebuilds preview and resume state from `jira-submission-state/` records on disk.
