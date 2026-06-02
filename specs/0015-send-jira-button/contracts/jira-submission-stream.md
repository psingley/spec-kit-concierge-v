# Contract: JIRA Submission Stream

## `jira:submit`

Events are Jira-submission-specific stream events delivered over the `jira:submit` subscription channel. They are validated by the Jira submission factories and are not generic step-stream lifecycle events.

Request:

```ts
type JiraSubmitRequest = {
  repositoryPath: string;
  mode: 'start' | 'resume';
  subscriptionId: string;
};
```

Ack:

```ts
type JiraSubmitAck = {
  sessionId: string;
  mode: 'start' | 'resume';
  remainingNodeIds: string[];
};
```

Progress event:

```ts
type JiraSubmissionProgressEvent = {
  type: 'progress';
  sessionId: string;
  nodeId: string;
  level: 'info' | 'ok' | 'warn' | 'error';
  status: 'preparing' | 'creating' | 'verifying' | 'verified' | 'duplicate' | 'failed' | 'halted';
  message: string;
  timestamp: string;
  issueKey?: string;
  issueUrl?: string;
};
```

Done event:

```ts
type JiraSubmissionDoneEvent = {
  type: 'done';
  sessionId: string;
  status: 'pass' | 'fail';
  reason?: string;
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

- The main-process runner performs exactly one bounded Copilot turn per node through the customized concierge-jira extension-agent contract.
- The runner reads the node's persisted submission record after each turn and advances only on terminal `verified` or `duplicate` with matching payload hash and issue key.
- Child nodes never start before their parent record is advanceable.
- The stream emits exactly one terminal `done` event per request.
- Renderer reopen/resume uses `jira:preview`; the stream is not authoritative after process exit.
