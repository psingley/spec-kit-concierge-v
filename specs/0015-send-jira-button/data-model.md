# Data Model: Send to JIRA from Review

## JiraSubmissionEligibility

- `repositoryPath: string`
- `featureKey: string`
- `tasksArtifactPath: string | null`
- `atlassianStatus: 'ok' | 'unknown' | 'out' | 'error'`
- `canSubmit: boolean`
- `blockedReasons: Array<'atlassian-auth-missing' | 'tasks-artifact-missing' | 'preview-build-failed'>`

This is the small renderer-facing gate model for whether Review should expose or disable **Send to JIRA**.

## JiraSubmissionNode

- `nodeId: string` — stable local node id such as `spec`, `phase-01`, or `t014`
- `level: 'epic' | 'phase' | 'task'`
- `issueType: 'Epic' | 'Story' | 'Subtask'`
- `title: string` — human-readable label for the modal list
- `summary: string` — exact Jira summary the app will submit
- `description: string` — deterministic Jira body markdown rendered by the app
- `descriptionStatus: 'full' | 'thin'`
- `parentNodeId: string | null`
- `parentIssueKey: string | null`
- `idempotencyId: string`
- `idempotencyLabel: string`
- `payloadHash: string`
- `sourcePaths: string[]`
- `acceptanceCriteria: string[]`

Nodes are returned in deterministic parent-first order. Child nodes never become runnable until their parent record resolves to `verified` or `duplicate`.

## JiraPreviewWarning

- `code: 'already-verified' | 'duplicate-record' | 'thin-body' | 'tasks-artifact-missing' | 'atlassian-auth-missing' | 'preview-build-failed'`
- `severity: 'info' | 'warn' | 'error'`
- `nodeId?: string`
- `message: string`

Warnings are preview-only projections. They never mutate Jira or local submission records by themselves.

## JiraSubmissionPreview

- `eligibility: JiraSubmissionEligibility`
- `specPath: string`
- `tasksPath: string | null`
- `stateDir: string`
- `nodes: JiraSubmissionNode[]`
- `warnings: JiraPreviewWarning[]`
- `run: JiraSubmissionRunSnapshot`

The preview payload is the single Review-step read model for both first-run and resume cases.

## JiraSubmissionRecord

- `schema: 'concierge.jira.submission.v2'`
- `featureKey: string`
- `nodeId: string`
- `status: 'creating' | 'verified' | 'duplicate' | 'payload_hash_mismatch' | 'create_failed' | 'rate_limit_exhausted' | 'verify_mismatch'`
- `issueKey: string | null`
- `issueUrl: string | null`
- `parentKey: string | null`
- `payloadHash: string`
- `idempotencyLabel: string`
- `attempts: number`
- `startedAt: string`
- `completedAt: string | null`
- `orphanJql: string`
- `method: 'acp-bound-cli'`
- `agentModel: string | null`
- `copilotSessionId: string | null`
- `costMultiplier: number | null`
- `error: { code: string; message: string } | null`

`creating` is transient. Only terminal `verified` and `duplicate` records are advanceable.

## JiraSubmissionNodeResult

- `nodeId: string`
- `status: 'pending' | 'running' | 'verified' | 'duplicate' | 'failed' | 'halted'`
- `issueKey?: string`
- `issueUrl?: string`
- `message?: string`
- `updatedAt: string`

This is the normalized renderer projection of one node's current result.

## JiraSubmissionRunSnapshot

- `status: 'idle' | 'running' | 'halted' | 'complete'`
- `mode: 'start' | 'resume' | null`
- `startedAt: string | null`
- `completedAt: string | null`
- `currentNodeId: string | null`
- `haltedNodeId: string | null`
- `completedCount: number`
- `remainingCount: number`
- `results: JiraSubmissionNodeResult[]`

The preview query returns the latest snapshot built from on-disk records. The streaming mutation updates the same shape live while a run is active.

## JiraSubmissionEvent

### Progress event

- `type: 'progress'`
- `sessionId: string`
- `nodeId: string`
- `level: 'info' | 'ok' | 'warn' | 'error'`
- `status: 'preparing' | 'creating' | 'verifying' | 'verified' | 'duplicate' | 'failed' | 'halted'`
- `message: string`
- `timestamp: string`
- `issueKey?: string`
- `issueUrl?: string`

### Done event

- `type: 'done'`
- `sessionId: string`
- `status: 'pass' | 'fail'`
- `reason?: string`
- `run: JiraSubmissionRunSnapshot`

The event stream is the only live transport for progress. The renderer rehydrates from `JiraSubmissionPreview` on reopen.
