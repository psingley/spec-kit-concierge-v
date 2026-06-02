# Data Model: Hybrid Manifest Architecture

## Session Manifest

Durable worktree-local record at `.concierge/session-manifest.json`.

**Fields**
- `schema`: literal `concierge.sessionManifest.v1`
- `sessionId`: stable UUID for the Concierge session
- `featureDir`: project-relative feature directory, e.g. `specs/0013-hybrid-manifest-architecture`
- `branch`: intended branch name
- `createdAt`: ISO timestamp
- `updatedAt`: ISO timestamp
- `currentStep`: `specify | clarify | plan | tasks | analyze | review`
- `attempts`: `StepAttempt[]`
- `anomalies`: `Anomaly[]`
- `interventions`: `Intervention[]`
- `doctorInvocations`: `DoctorToolInvocation[]`
- `nudgeRequests`: `NudgeRequest[]`
- `audit`: `AuditRecord[]`

**Validation rules**
- Unknown top-level keys are rejected.
- `featureDir` must match `.specify/feature.json` for the active worktree before authoritative updates.
- Manifest writes are atomic and durable; partial writes are invalid.
- Renderer state never writes this file directly.
- Completion display is derived only after reconciliation agrees across manifest attempt state, branch trailer evidence, and step-owned artifact evidence.

## Step Attempt

One execution attempt for a pipeline step.

**Fields**
- `attemptId`: stable id
- `step`: canonical step name
- `status`: `pending | running | pass | failed | killed | interrupted`
- `supersedesAttemptId?: string`
- `startedAt`: ISO timestamp
- `endedAt?: string`
- `branchBefore`: `BranchStateSnapshot`
- `branchAfter?: BranchStateSnapshot`
- `ownedPathSnapshot`: `StepOwnedArtifactSnapshot`
- `completionEvidence?: CompletionEvidence`
- `spawnRecipe`: `SpawnRecipe`
- `assistant`: `AssistantIdentity[]`
- `logReference`: `LogReference`
- `terminalResult?: TerminalResult`
- `anomalyIds`: string[]
- `interventionIds`: string[]

**State transitions**
- `pending -> running`
- `running -> pass | failed | killed | interrupted`
- Terminal attempts are never mutated into a different terminal outcome; a new attempt supersedes them.

## Branch State Snapshot

Durable branch facts captured before and after a step.

**Fields**
- `branch`: string
- `headSha`: string
- `statusPorcelain`: string
- `trackedChanges`: string[]
- `timestamp`: ISO timestamp

**Validation rules**
- Snapshot is evidence only; reconciliation re-reads current git state before mutating anything.

## Step-Owned Artifact Snapshot

Content identity for files a step owns at a point in time.

**Fields**
- `step`: canonical step name
- `featureDir`: project-relative feature directory
- `paths`: Array of `{ path, required, present, sha256?, sizeBytes?, mtimeMs? }`
- `snapshotHash`: stable hash over normalized path/content metadata
- `capturedAt`: ISO timestamp

**Validation rules**
- Paths must be inside the step contract scope except documented context-file exceptions.
- Missing required files prevent `pass`.
- Optional files contribute to evidence only when present.

## Spawn Recipe

Exact command used to invoke a step agent.

**Fields**
- `command`: `copilot`
- `args`: `['-p', '--agent', 'speckit.<step>', '--output-format', 'json', '--session-id', '<uuid>', '--log-dir', '<dir>']`
- `cwd`: worktree path
- `environmentKeys`: names of allowed environment variables, not secret values

**Validation rules**
- Must match FR-009 for step attempts.
- Raw shell command strings are not stored as executable authority.

## Assistant Identity

Identifiers captured from parseable step output.

**Fields**
- `assistantSessionId?: string`
- `messageId?: string`
- `turnId?: string`
- `source`: `print-json-event | transcript | log`

**Validation rules**
- Missing identifiers are anomalies, not pass blockers by themselves unless reconciliation requires them for resume.

## Log Reference

Pointer to captured step logs.

**Fields**
- `path`: project-relative or app-owned display path
- `sha256`: checksum
- `sizeBytes`: number

**Validation rules**
- Raw log bodies are not copied into manifest.

## Terminal Result

Parsed terminal output from step execution.

**Fields**
- `exitCode`: number
- `signal?: string`
- `resultKind`: `success | failure | killed | interrupted | malformed | missing`
- `summary?: string`
- `rawEventChecksum?: string`

**Validation rules**
- `success` is necessary but insufficient for `pass`.
- `malformed` and `missing` create anomalies.

## Completion Evidence

Branch and artifact proof for a completed step.

**Fields**
- `commitSha`: string
- `trailer`: `Concierge-Step: <step>:pass`
- `artifactSnapshot`: `StepOwnedArtifactSnapshot`
- `adoptedFromHistory`: boolean

**Validation rules**
- Only `pass` trailers can establish completion.
- Artifact snapshot must match the reconciler's expected step-owned content.

## Anomaly

Deterministic finding that evidence does not match expected state.

**Fields**
- `anomalyId`: stable id
- `step`: canonical step name
- `kind`: `missing-artifact | conflicting-evidence | unrelated-diff | misplaced-artifact | duplicate-commit | out-of-order-commit | missing-terminal-result | malformed-terminal-result | watchdog-silence | transcript-irregularity | doctor-budget-exhausted | ambiguous-nudge`
- `severity`: `info | warning | blocking`
- `detectedAt`: ISO timestamp
- `evidence`: JSON object with normalized paths, commit SHAs, and checksums only
- `resolvedByInterventionId?: string`

**Validation rules**
- Blocking anomalies prevent `pass`.
- Anomalies are append-only; resolution links to an intervention.

## Intervention

Guarded deterministic action taken to resolve or document an anomaly.

**Fields**
- `interventionId`: stable id
- `anomalyId`: string
- `tool`: guarded tool name
- `startedAt`: ISO timestamp
- `endedAt`: ISO timestamp
- `preconditionSnapshot`: JSON object
- `result`: `applied | no-op | rejected | escalated`
- `auditMessage`: string

**Validation rules**
- Mutating interventions re-read current disk truth at execution time.
- Mutating interventions are idempotent by `anomalyId`.
- Every intervention returns to reconciliation.

## Doctor Tool Invocation

One doctor request to the deterministic harness.

**Fields**
- `invocationId`: stable id
- `step`: canonical step name
- `attemptNumber`: 1 or 2
- `tool`: one of the 12 allowed tools
- `argumentsHash`: checksum of normalized arguments
- `startedAt`: ISO timestamp
- `endedAt?: string`
- `result`: `returned | rejected | failed`
- `rejectionReason?: string`

**Validation rules**
- Doctor cannot call tools outside FR-020/FR-021.
- Doctor cannot directly mark completion, write trailers, run raw git/file operations, widen contracts, or exceed two attempts per step.

## Doctor Budget

Per-step bounded attempt tracker.

**Fields**
- `step`: canonical step name
- `maxAttempts`: `2`
- `usedAttempts`: number
- `exhausted`: boolean

**Validation rules**
- When exhausted, the system records an anomaly and escalates.

## Failed Step Marker

Durable failed-step sidecar under `.specify/concierge/failed-steps/<step>.json`.

**Fields**
- `step`: canonical step name
- `sessionId`: string
- `failedAt`: ISO timestamp
- `reason`: string
- `strandedArtifacts`: string[]
- `anomalyIds`: string[]

**Validation rules**
- Existing fields stay backward-compatible.
- Malformed markers are ignored as invalid input and surfaced through reconciliation warnings.

## Nudge Request

Manual reconciliation attempt for terminal-stuck sessions.

**Fields**
- `nudgeId`: stable id
- `requestedAt`: ISO timestamp
- `step`: canonical step name
- `precondition`: `terminal-stuck-after-auto-remediation`
- `intendedShape`: `IntendedBranchShape`
- `result`: `repaired | no-op | escalated | rejected`
- `interventionIds`: string[]

**Validation rules**
- Nudge is unavailable for healthy, running, or automatically recoverable sessions.
- Nudge cannot force completion.

## Intended Branch Shape

Computed target state for nudge and reconciliation.

**Fields**
- `featureDir`: project-relative feature directory
- `requiredStepOrder`: canonical step list
- `expectedTrailers`: Array of `{ step, status, commitSha? }`
- `expectedArtifacts`: `StepOwnedArtifactSnapshot[]`
- `forbiddenChanges`: string[]

**Validation rules**
- Computed from manifest, feature directory, step contracts, completion evidence, and trailers.
- Ambiguity escalates rather than mutating branch state.

## Reconciliation Result

Pure result emitted by `sessionReconciler`.

**Fields**
- `step`: canonical step name
- `status`: `pending | running | pass | failed | killed | interrupted | terminal-stuck`
- `canCommit`: boolean
- `canAutoRecover`: boolean
- `canNudge`: boolean
- `anomalies`: `Anomaly[]`
- `requiredInterventions`: string[]
- `completionEvidence?: CompletionEvidence`

**Validation rules**
- `pass` requires agreement between manifest, branch evidence, and artifacts.
- `canNudge` is true only when terminal-stuck and no successful automatic remediation has happened.

## Renderer Status Projection

Derived view exposed to renderer listeners and components.

**Fields**
- `step`: canonical step name
- `rendererState`: `not_available | pending | complete`
- `sourceStatus`: `pending | running | pass | failed | killed | interrupted | terminal-stuck`
- `canNudge`: boolean
- `auditSummary`: bounded audit metadata

**Validation rules**
- `pass` maps to `complete` only after reconciliation confirms manifest, trailer, and artifact agreement.
- `failed`, `killed`, `interrupted`, and `terminal-stuck` map to `not_available` plus visible failure or interruption detail.
- Renderer cache never writes authoritative manifest or completion state.
