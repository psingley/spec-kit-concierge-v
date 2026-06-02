# Contract: Session Manifest Schema

## File location

`<worktree>/.concierge/session-manifest.json`

## Write contract

- Writers must write through the manifest store only.
- Writes are atomic and durable: write a complete temp file, fsync the file, rename into place, and fsync the containing directory where supported.
- Partial, truncated, malformed, or unknown-schema manifests are invalid and must not be treated as authoritative.
- Every successful write updates `updatedAt` and appends an audit record for state-changing operations.

## JSON shape

```ts
type SessionManifestV1 = {
  schema: 'concierge.sessionManifest.v1';
  sessionId: string;
  featureDir: string;
  branch: string;
  createdAt: string;
  updatedAt: string;
  currentStep: StepName;
  attempts: StepAttempt[];
  anomalies: Anomaly[];
  interventions: Intervention[];
  doctorInvocations: DoctorToolInvocation[];
  nudgeRequests: NudgeRequest[];
  audit: AuditRecord[];
};
```

## Attempt contract

```ts
type StepAttempt = {
  attemptId: string;
  step: StepName;
  status: 'pending' | 'running' | 'pass' | 'failed' | 'killed' | 'interrupted';
  supersedesAttemptId?: string;
  startedAt: string;
  endedAt?: string;
  branchBefore: BranchStateSnapshot;
  branchAfter?: BranchStateSnapshot;
  ownedPathSnapshot: StepOwnedArtifactSnapshot;
  completionEvidence?: CompletionEvidence;
  spawnRecipe: SpawnRecipe;
  assistant: AssistantIdentity[];
  logReference: LogReference;
  terminalResult?: TerminalResult;
  anomalyIds: string[];
  interventionIds: string[];
};
```

## Required validation

- Unknown keys are rejected at the trust boundary.
- `schema` must be exactly `concierge.sessionManifest.v1`.
- `sessionId`, `featureDir`, `branch`, timestamps, attempt ids, anomaly ids, intervention ids, and nudge ids are non-empty strings.
- `currentStep` and every attempt `step` are canonical steps.
- Attempt terminal statuses are immutable; new attempts supersede old attempts.
- `completionEvidence.trailer` must match `Concierge-Step: <step>:pass`.
- Audit records must not contain raw tokens, raw transcript bodies, or PII.

## Migration behavior

Run 13 introduces only v1. Unknown future schema values must be rejected with a visible recovery/error state, not silently coerced.
