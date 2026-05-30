# Contract: `review:evidence` IPC

## Channel

`review:evidence`

## Purpose

Return Review evidence from main-process disk/git aggregation and read evidence bodies on demand. Renderer session state is not accepted as evidence input.

## Summary request

```ts
type ReviewEvidenceSummaryRequest = {
  kind: 'summary';
  repositoryPath: string;
  branch: string;
  featureDir: string;
};
```

## Body request

```ts
type ReviewEvidenceBodyRequest = {
  kind: 'body';
  repositoryPath: string;
  branch: string;
  featureDir: string;
  evidenceId: string;
  path: string;
  source: 'feature-artifact' | 'app-owned-evidence';
};
```

`path` must match an evidence item previously returned by the summary for the same repository/feature context. Body reads use the existing safe-read limit of 512 KiB.

## Summary response

```ts
type ReviewEvidenceSummaryResponse = {
  kind: 'summary';
  featureDir: string;
  branch: string;
  generatedAt: string;
  steps: Array<{
    step: 'specify' | 'clarify' | 'plan' | 'tasks' | 'analyze';
    status: 'complete' | 'incomplete' | 'unavailable' | 'warning';
    proof?: {
      step: string;
      status: string;
      commitSha: string;
      commitSubject?: string;
      committedAt?: string;
      warnings: ReviewWarning[];
    };
    requiredArtifacts: ArtifactEvidence[];
    optionalArtifacts: ArtifactEvidence[];
    warnings: ReviewWarning[];
  }>;
  clarifications: Array<{
    sessionHeading?: string;
    question: string;
    answer: string;
    lineNumber?: number;
  }>;
  analyzeReport?: {
    id: string;
    sessionId: string;
    path: string;
    available: boolean;
    sizeBytes?: number;
    mtimeMs?: number;
    noDiff: boolean;
    analyzeCommitSha?: string;
    extractionStatus: 'captured' | 'missing' | 'ambiguous';
    missingReason?: string;
  };
  tasks: Array<{
    id: string;
    title: string;
    status?: string;
    sourcePath: 'tasks.md';
    details: string;
  }>;
  pendingNavigation: {
    targetStep?: 'specify' | 'clarify' | 'plan' | 'tasks' | 'analyze';
    reason: 'running-step' | 'first-incomplete' | 'none';
    label?: string;
  };
  warnings: ReviewWarning[];
};

type ArtifactEvidence = {
  id: string;
  step: 'specify' | 'clarify' | 'plan' | 'tasks' | 'analyze';
  label: string;
  path: string;
  source: 'feature-artifact' | 'app-owned-evidence';
  kind: 'markdown' | 'code' | 'text' | 'image' | 'pdf';
  required: boolean;
  present: boolean;
  sizeBytes?: number;
  mtimeMs?: number;
  bodyReadable: boolean;
  warnings: ReviewWarning[];
};

type ReviewWarning = {
  code:
    | 'MALFORMED_TRAILER'
    | 'MISSING_REQUIRED_ARTIFACT'
    | 'OPTIONAL_ARTIFACT_MISSING'
    | 'ARTIFACT_METADATA_UNREADABLE'
    | 'ANALYZE_REPORT_MISSING'
    | 'ANALYZE_REPORT_AMBIGUOUS'
    | 'TASKS_UNREADABLE'
    | 'CLARIFICATIONS_UNREADABLE'
    | 'BODY_READ_FAILED';
  message: string;
  path?: string;
  step?: string;
};
```

## Body response

```ts
type ReviewEvidenceBodyResponse = {
  kind: 'body';
  evidenceId: string;
  path: string;
  text: string;
  sizeBytes: number;
  mtimeMs: number;
};
```

## Error behavior

- Invalid payloads throw a typed IPC/factory error.
- Missing optional Plan artifacts are not errors.
- Missing required artifacts produce summary warnings and incomplete/warning status.
- Analyze report lookup maps the committed `analyze:pass` proof SHA to the app-owned report index on disk.
- Body read failures are surfaced to the selected evidence UI without clearing the summary.
- The handler logs structured success/failure for summary and body reads.

## Invariants

- No renderer session memory fields are accepted in the request.
- No ACP session id is required in the summary request; restart lookup uses git proof plus app-owned evidence index.
- No Review Step Commit is written.
- No `copilot:review` capability is invoked.
- The response never includes evidence body text in `kind: 'summary'`.
