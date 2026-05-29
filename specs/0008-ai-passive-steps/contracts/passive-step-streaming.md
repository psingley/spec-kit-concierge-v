# Contract: Passive Step Streaming

## Capabilities

Run 8 adds these business capabilities:

| Capability | Transport event | Step |
|---|---|---|
| `copilot:plan` | `copilot:plan:event` | `plan` |
| `copilot:tasks` | `copilot:tasks:event` | `tasks` |
| `copilot:analyze` | `copilot:analyze:event` | `analyze` |

Transport names derive from the capability plus `:event`, matching ADR-0010. Specify and Clarify are not refactored through the Run 8 passive helper.

## Request

```ts
type PassiveStepRunRequest = {
  sessionId: string;
  repositoryPath: string;
  branchName: string;
  step: 'plan' | 'tasks' | 'analyze';
};
```

Validation:
- `step` must match the invoked capability.
- `repositoryPath` must be the active workspace.
- Active feature directory resolves from `.specify/feature.json` when present, falling back to branch-derived feature only when absent.

## Progress Event

```ts
type PassiveStepProgressEvent = {
  type: 'progress';
  step: 'plan' | 'tasks' | 'analyze';
  sessionId: string;
  level: 'info' | 'ok' | 'warn' | 'error';
  message: string;
  timestamp: string;
  progressKind?: 'text' | 'thought' | 'tool_call' | 'tool_call_update' | 'lifecycle' | 'artifact' | 'hang';
};
```

Rules:
- ACP text chunks, thought chunks, `tool_call`, and `tool_call_update` are progress evidence.
- Progress can update milestone rows but cannot mark a lifecycle step complete.
- Missing usage, token, duration, or cost metadata never blocks pass.

## Terminal Event

```ts
type PassiveStepDoneEvent = {
  type: 'done';
  step: 'plan' | 'tasks' | 'analyze';
  sessionId: string;
  status: 'pass' | 'fail';
  commitSha?: string;
  manifest?: PassiveStepManifest;
  reason?: string;
};
```

Rules:
- Each attempt emits exactly one accepted terminal event.
- `status: 'pass'` requires `commitSha` and compact `manifest`.
- `status: 'fail'` requires `reason`.
- Terminal payloads must not include full artifact bodies.
- Duplicate terminal attempts are ignored or logged as duplicates without changing the first accepted terminal.

## PassiveStepManifest

```ts
type PassiveStepManifest =
  | {
      step: 'plan';
      requiredArtifacts: ArtifactEvidence[];
      optionalArtifacts: ArtifactEvidence[];
      contextFileException?: {
        path: '.github/copilot-instructions.md';
        updatedPlanPath: string;
      };
    }
  | {
      step: 'tasks';
      requiredArtifacts: ArtifactEvidence[];
      taskCount: number;
      malformedTaskCount: number;
    }
  | {
      step: 'analyze';
      allowedTargets: Array<'spec.md' | 'plan.md' | 'tasks.md'>;
      changedTargets: Array<'spec.md' | 'plan.md' | 'tasks.md'>;
      verifiedTargets: Array<'spec.md' | 'plan.md' | 'tasks.md'>;
      noDiff: boolean;
    };
```

## Lifecycle Order

1. Validate request at IPC entry.
2. Resolve active feature directory from disk.
3. Run `before_<step>` hook.
4. Start ACP prompt through the ACP data layer.
5. Emit progress events from ACP and lifecycle checkpoints.
6. Run `after_<step>` hook.
7. Validate Step Contract from disk.
8. Write Step Commit trailer.
9. Read compact manifest/remediation summary from disk.
10. Emit one terminal `done`.

Failure at any point emits one terminal fail and routes recovery through the established Step Escape Hatch path when applicable.

## Observability

Each attempt records:
- IPC handler start/end and outcome.
- ACP turn events and transcript reference.
- Lifecycle hook start/end.
- Step Contract validation pass/fail.
- Step Commit identity on pass.
- Error path and Escape Hatch reason on fail.
