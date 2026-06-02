# Contract: JIRA Submission State

## Directory

```text
specs/0015-send-jira-button/jira-submission-state/
```

One JSON file is written per planned Jira node.

## Canonical record

```ts
type JiraSubmissionRecord = {
  schema: 'concierge.jira.submission.v2';
  featureKey: string;
  nodeId: string;
  status: 'creating' | 'verified' | 'duplicate' | 'payload_hash_mismatch' | 'create_failed' | 'rate_limit_exhausted' | 'verify_mismatch';
  issueKey: string | null;
  issueUrl: string | null;
  parentKey: string | null;
  payloadHash: string;
  idempotencyLabel: string;
  attempts: number;
  startedAt: string;
  completedAt: string | null;
  orphanJql: string;
  method: 'acp-bound-cli';
  agentModel: string | null;
  copilotSessionId: string | null;
  costMultiplier: number | null;
  error: { code: string; message: string } | null;
};
```

## Invariants

- Files are written atomically with tmp-and-rename semantics.
- `idempotencyLabel` always follows `<project_key>-idem-<hash12>`.
- The generated idempotency label is excluded from payload hashing; `payloadHash` comes first.
- `creating` is transient only. `verified` and `duplicate` are the only advanceable terminal states.
- Preview and resume read these files from disk on every open; renderer memory never establishes completion.
- Historical repo examples with `jiraKey`/`issue_key`/`live_key` remain audit references only. The app contract for this feature writes the canonical shape above.
