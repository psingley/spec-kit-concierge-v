# Contract: JIRA Preview IPC

## `jira:preview`

Request:

```ts
type JiraPreviewRequest = {
  repositoryPath: string;
};
```

Response:

```ts
type JiraPreviewResponse = {
  eligibility: {
    repositoryPath: string;
    featureKey: string;
    tasksArtifactPath: string | null;
    atlassianStatus: 'ok' | 'unknown' | 'out' | 'error';
    canSubmit: boolean;
    blockedReasons: Array<'atlassian-auth-missing' | 'tasks-artifact-missing' | 'preview-build-failed'>;
  };
  specPath: string;
  tasksPath: string | null;
  stateDir: string;
  nodes: Array<{
    nodeId: string;
    level: 'epic' | 'phase' | 'task';
    issueType: 'Epic' | 'Story' | 'Subtask';
    title: string;
    summary: string;
    description: string;
    descriptionStatus: 'full' | 'thin';
    parentNodeId: string | null;
    parentIssueKey: string | null;
    idempotencyId: string;
    idempotencyLabel: string;
    payloadHash: string;
    sourcePaths: string[];
    acceptanceCriteria: string[];
  }>;
  warnings: Array<{
    code: 'already-verified' | 'duplicate-record' | 'thin-body' | 'tasks-artifact-missing' | 'atlassian-auth-missing' | 'preview-build-failed';
    severity: 'info' | 'warn' | 'error';
    nodeId?: string;
    message: string;
  }>;
  run: {
    status: 'idle' | 'running' | 'halted' | 'complete';
    mode: 'start' | 'resume' | null;
    startedAt: string | null;
    completedAt: string | null;
    currentNodeId: string | null;
    haltedNodeId: string | null;
    completedCount: number;
    remainingCount: number;
    results: Array<{
      nodeId: string;
      status: 'pending' | 'running' | 'verified' | 'duplicate' | 'failed' | 'halted';
      issueKey?: string;
      issueUrl?: string;
      message?: string;
      updatedAt: string;
    }>;
  };
};
```

## Invariants

- `jira:preview` performs no Atlassian create/search calls.
- `nodes` are returned in deterministic parent-first order.
- Every node includes a canonical `<project_key>-idem-<hash12>` label and payload hash before confirmation.
- `eligibility.canSubmit === false` when either Atlassian MCP is not authenticated or `tasks.md` is missing.
- `run` is derived from on-disk submission records, not renderer memory.
