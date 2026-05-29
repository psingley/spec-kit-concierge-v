# Data Model: Run 8 AI-Passive Steps Vertical

## PassiveStepName

Union: `plan | tasks | analyze`.

Validation:
- Must be one of the three passive Run 8 steps.
- Must not include `specify`, `clarify`, or `review` when passed to `registerPassiveStepIpc`.

## PassiveStepAttempt

Represents one user-started passive step attempt.

Fields:
- `sessionId`: stable active session id.
- `step`: `PassiveStepName`.
- `attemptId`: unique id for duplicate-terminal and hang-dedupe boundaries.
- `startedAt`: ISO timestamp.
- `lastProgressAt`: ISO timestamp updated by accepted ACP progress.
- `status`: `idle | running | pass | fail | silent`.
- `rows`: `StatusStepRow[]`.
- `terminal`: optional `PassiveStepTerminal`.
- `transcriptRef`: optional local transcript path/reference.
- `error`: optional typed error summary.

Validation:
- `status` is UI attempt status only; it does not extend ADR-0008 lifecycle states.
- Exactly one terminal result may be accepted per `attemptId`.
- `pass` is legal only after lifecycle validation and Step Commit succeed.
- Usage/cost fields are optional and must not gate pass.

## PassiveStepTerminal

Fields:
- `step`: `PassiveStepName`.
- `status`: `pass | fail`.
- `commitSha`: required for `pass`, absent or optional for `fail`.
- `summary`: compact `ArtifactManifestSummary` or `AnalyzeRemediationSummary`.
- `reason`: required for `fail`.

Validation:
- Must not include full artifact bodies.
- `pass` requires validated disk evidence.
- Duplicate terminal attempts preserve the first accepted terminal.

## StepStreamEvent

Reuses ADR-0010.

Progress fields:
- `type`: `progress`.
- `step`: any canonical step, with Run 8 using `plan | tasks | analyze`.
- `sessionId`: active session id.
- `level`: `info | ok | warn | error`.
- `message`: user-visible progress text.
- `timestamp`: ISO timestamp.
- `progressKind`: optional normalized subtype `text | thought | tool_call | tool_call_update | lifecycle | artifact | hang`.

Terminal fields:
- `type`: `done`.
- `step`: canonical step.
- `sessionId`: active session id.
- `status`: `pass | fail`.
- `commitSha`: required on pass.
- `manifest`: optional compact manifest/remediation summary for Run 8 passive steps.
- `reason`: failure reason.

Validation:
- ACP `session/update` text, thoughts, `tool_call`, and `tool_call_update` all map to progress.
- Pipeline owner enforces exactly one terminal `done`.
- If ACP does not terminate cleanly, Concierge emits no pass until lifecycle validation and Step Commit prove disk state.

## StatusStepRow

Typed rendering union for `StatusStep`.

Common fields:
- `id`: stable row id.
- `label`: user-visible label.
- `state`: `waiting | running | done | warning | error`.
- `description`: optional supporting text.
- `ariaLabel`: accessible row label.

Variants:

### ArtifactRow

Fields:
- `kind`: `artifact`.
- `artifact`: `ArtifactEvidence`.
- `required`: boolean.
- `evidenceEnabled`: boolean.

Validation:
- `evidenceEnabled` is true only after lifecycle validation accepts the artifact path.
- Optional absent Plan artifacts may be omitted or represented as unavailable without failing Plan.

### MilestoneRow

Fields:
- `kind`: `milestone`.
- `milestoneKind`: `stream | lifecycle | validation | commit | transcript`.
- `timestamp`: optional ISO timestamp.

Validation:
- Does not imply artifact availability.

### TaskRow

Fields:
- `kind`: `task`.
- `taskId`: stable task id.
- `title`: task title.
- `phase`: optional phase/area.
- `detailEnabled`: boolean.

Validation:
- `taskId` and `title` are required.
- Detail opens through `tasks:detail`, not renderer-only parsing.

### RemediationRow

Fields:
- `kind`: `remediation`.
- `targetPath`: `spec.md | plan.md | tasks.md`.
- `changeKind`: `verified | changed | rejected`.

Validation:
- No `analyze.md` or source-code target is allowed.

### HangRow

Fields:
- `kind`: `hang`.
- `guidance`: visible Cancel/Restart guidance.
- `detectedAt`: ISO timestamp.

Validation:
- Does not transition the ADR-0008 step state.
- Deduped per silent interval.

## ArtifactEvidence

Fields:
- `path`: feature-relative artifact path.
- `kind`: `text | markdown | code | image | pdf`.
- `sizeBytes`: non-negative integer.
- `mtime`: optional ISO timestamp.
- `validated`: boolean.
- `required`: boolean.

Validation:
- Artifact content is fetched only through explicit user action.
- Text, markdown, and code artifacts over 512 KiB are metadata-only.
- Binary/image/PDF evidence returns metadata and available actions, not unsafe inline rendering.

## ArtifactManifestSummary

Fields:
- `requiredArtifacts`: `ArtifactEvidence[]`.
- `optionalArtifacts`: `ArtifactEvidence[]`.
- `contextFileException`: optional `.github/copilot-instructions.md` summary for Plan.
- `commitSha`: Step Commit identity.

Validation:
- Plan pass requires `plan.md` and `research.md`.
- Tasks pass requires `tasks.md`.
- Optional Plan artifacts include `data-model.md`, `contracts/*`, and `quickstart.md`.
- Full artifact bodies are excluded.

## TaskDetail

Fields:
- `id`: stable task id.
- `title`: task title.
- `phase`: optional phase.
- `area`: optional area.
- `dependencies`: string array.
- `files`: string array.
- `acceptanceNotes`: string array.
- `estimate`: optional string.
- `sourceLine`: optional source line reference.

Validation:
- `id` and `title` are required.
- Dependencies must reference parseable task ids when dependency notation is present.
- Missing optional fields are omitted, not synthesized.
- Malformed structures that prevent stable identity or dependency understanding reject the Tasks contract.

## AnalyzeRemediationSummary

Fields:
- `allowedTargets`: fixed `['spec.md', 'plan.md', 'tasks.md']`.
- `changedTargets`: subset of allowed targets.
- `verifiedTargets`: subset of allowed targets.
- `noDiff`: boolean.
- `rejectedTargets`: disallowed target summaries, present only on fail.
- `commitSha`: required on pass.

Validation:
- `analyze.md` is disallowed.
- Source code, unrelated docs, and files outside the active feature directory are disallowed.
- `noDiff: true` may pass with an empty Step Commit.

## HangNotification

Fields:
- `sessionId`: active session id.
- `step`: `PassiveStepName`.
- `attemptId`: passive attempt id.
- `detectedAt`: ISO timestamp.
- `silenceMs`: milliseconds since `lastProgressAt`.
- `message`: visible guidance.
- `actions`: fixed guidance labels for manual Cancel and Restart.
- `dedupeKey`: `${sessionId}:${step}:${attemptId}:${silentIntervalStart}`.

Validation:
- Emitted after at least 20 minutes of ACP stream silence and the next polling interval.
- Does not auto-fail, auto-cancel, or auto-retry.
- New ACP progress starts a new possible silent interval.

## ActiveFeaturePin

Fields:
- `featureDir`: path from `.specify/feature.json` when present.
- `source`: `feature-json | branch-name-fallback`.
- `readAt`: ISO timestamp.

Validation:
- Main process reads from disk when resolving passive artifacts.
- `.specify/feature.json` wins over branch name, including detached HEAD.
- Renderer must not treat a cached pin as durable truth.

## State Transitions

ADR-0008 lifecycle state remains:

```text
not_available -> pending -> complete
```

Passive attempt status is separate UI state:

```text
idle -> running -> pass
idle -> running -> fail
running -> silent -> running
running -> silent -> fail
```

Rules:
- `silent` is a visible warning state, not a lifecycle failure.
- Escape Hatch resets lifecycle state to `not_available` and clears/replaces the active attempt.
- `complete` requires a `Concierge-Step: <step>:pass` trailer plus validated disk evidence.
