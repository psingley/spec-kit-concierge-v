# Data Model: Run 9 Review & Evidence Vertical

## Review Evidence Summary

Aggregated, restart-proof evidence for the current feature.

**Fields**
- `featureDir`: project-relative feature directory, e.g. `specs/0009-review-evidence`
- `branch`: git branch used for trailer lookup
- `generatedAt`: ISO timestamp for the read
- `steps`: `StepEvidence[]` in canonical order `specify`, `clarify`, `plan`, `tasks`, `analyze`
- `clarifications`: `ClarificationAnswer[]`
- `artifacts`: `ArtifactEvidence[]`
- `analyzeReport?: AnalyzeReportEvidence`
- `tasks`: `TaskDetail[]`
- `pendingNavigation`: `PendingNavigationState`
- `warnings`: `ReviewWarning[]`

**Validation rules**
- Must not include a `review` Step Commit or `copilot:review` state.
- Must not include evidence sourced from renderer session memory.
- Missing optional artifacts produce no incomplete status.
- Malformed trailers or unreadable metadata produce warnings, not fabricated pass states.

## Step Evidence

Evidence for one completed or unavailable workflow step.

**Fields**
- `step`: `specify | clarify | plan | tasks | analyze`
- `status`: `complete | incomplete | unavailable | warning`
- `proof?: StepProof`
- `requiredArtifacts`: `ArtifactEvidence[]`
- `optionalArtifacts`: `ArtifactEvidence[]`
- `warnings`: `ReviewWarning[]`

**Relationships**
- Has zero or one authoritative `StepProof`.
- Owns artifact evidence rows by step.

**State transitions**
- `unavailable` → `complete` only when a passing disk-backed trailer exists.
- `complete` → `warning` when proof exists but related evidence is malformed or missing.
- No transition to Review committed state in Run 9.

## Step Proof

Parsed git trailer proof.

**Fields**
- `step`: canonical step name
- `status`: trailer status, normally `pass`
- `commitSha`: full commit SHA
- `commitSubject?: string`
- `committedAt?: string`
- `warnings`: parse warnings

**Validation rules**
- Only `Concierge-Step: <step>:pass` establishes completion.
- `fail`, `skipped`, malformed, or conflicting trailers do not establish completion.

## Artifact Evidence

Metadata for a feature artifact or app-owned evidence file.

**Fields**
- `id`: stable evidence id returned by `review:evidence`
- `step`: owning step
- `label`: user-visible label
- `path`: project-relative path for feature artifacts or app-owned display path for Analyze report
- `source`: `feature-artifact | app-owned-evidence`
- `kind`: `markdown | code | text | image | pdf`
- `required`: boolean
- `present`: boolean
- `sizeBytes?: number`
- `mtimeMs?: number`
- `bodyReadable`: boolean
- `warnings`: `ReviewWarning[]`

**Validation rules**
- Body text is absent from the summary.
- Body reads are allowed only for IDs/paths returned in the summary.
- Optional Plan artifacts are `required: false`.

## Clarification Answer

Resolved Q/A parsed from committed `spec.md`.

**Fields**
- `sessionHeading?: string`
- `question`: string
- `answer`: string
- `lineNumber?: number`

**Validation rules**
- Parsed only from committed `spec.md` Clarifications section.
- Empty or absent clarifications produce an empty list, not invented answers.

## Analyze Report Evidence

App-owned report captured from Analyze output.

**Fields**
- `id`: stable evidence id
- `sessionId`: passive Analyze session id
- `featureKey`: stable app-owned key derived from the feature directory
- `analyzeCommitSha`: committed `Concierge-Step: analyze:pass` SHA used for restart lookup
- `path`: `userData/evidence/{featureKey}/{sessionId}/analyze-report.md`
- `available`: boolean
- `sizeBytes?: number`
- `mtimeMs?: number`
- `noDiff`: boolean
- `missingReason?: string`
- `extractionStatus`: `captured | missing | ambiguous`

**Validation rules**
- Lives outside `specs/<feature>/`.
- Is rediscovered through `userData/evidence/{featureKey}/analyze-report-index.json`, keyed by feature directory and Analyze commit SHA.
- Does not affect Analyze Step Commit diff scope.
- Empty Analyze pass remains valid when disk proof exists; missing or ambiguous report extraction adds a warning.

## Analyze Report Index

App-owned disk index that lets Review rediscover Analyze report evidence after restart.

**Fields**
- `featureDir`: project-relative feature directory
- `reports`: Array of `{ analyzeCommitSha, sessionId, reportPath, capturedAt, sizeBytes?, mtimeMs?, extractionStatus }`

**Validation rules**
- Stored outside the feature artifact contract under `userData/evidence/{featureKey}/analyze-report-index.json`.
- Review never trusts renderer memory for report lookup; it maps the committed Analyze proof SHA to this index.
- Missing index entries produce warnings, not false Analyze failures.

## Task Detail

Task metadata shown in Review and expanded in a modal.

**Fields**
- Existing parsed task fields from `tasks:detail`, including id/title/status/dependencies/details as available.
- `sourcePath`: normally `tasks.md`

**Validation rules**
- Uses the existing parsed task model.
- Does not introduce a new task parser contract.

## Pending Navigation State

Resume affordance target derived for display.

**Fields**
- `targetStep?: specify | clarify | plan | tasks | analyze`
- `reason`: `running-step | first-incomplete | none`
- `label`: e.g. `Resume Plan`

**Validation rules**
- Running step wins.
- Otherwise choose the first incomplete step in canonical order.
- Do not emit a multi-pending warning in Run 9.

## Passive Silence Notice

Soft notice for long-running passive steps with no ACP activity.

**Fields**
- `step`: passive step name
- `sessionId`: string
- `lastActivityAt`: ISO timestamp
- `noticedAt`: ISO timestamp
- `silenceMs`: number
- `message`: "Still working; no recent output."

**Validation rules**
- `silenceMs >= 2_400_000`.
- Any ACP stream activity resets `lastActivityAt`.
- Notice does not auto-fail, auto-cancel, or auto-retry.

## Visual Fixture State

Deterministic state used by visual-diff harness.

**Fields**
- `name`: visual screen name
- `surface`: `review | passive`
- `state`: fixture state label
- `drivesRealComponentPath`: boolean
- `assertions`: expected visible contracts

**Validation rules**
- Review fixtures cover unavailable/idle, partial, populated, read-only/bounce, resume target, selected evidence, read failure, and task-modal states.
- Passive fixtures drive the real shipped `StatusStep` path for idle, running, and done states.
