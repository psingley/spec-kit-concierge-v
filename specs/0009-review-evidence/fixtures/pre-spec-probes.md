# Run 9 Pre-Spec Probes

Date: 2026-05-30
Branch: `spec/0009-review-evidence`
Base: `fb1b9050f5da3a797ee7e15875d75b6cf6ff31f2`

## Summary

The current code supports the Run 9 disk-only Review design, but it does not yet expose a main-process evidence aggregator. `readConciergeStepHistory()` already reads committed git history from disk, while `steps:read` only parses commit messages supplied by its caller. Plan optional artifact discovery is still missing. The passive ACP adapter discards the prompt result, and the ACP prompt result currently returns `stopReason` plus updates, not terminal assistant markdown text.

## Probe A - Step History Wiring

Finding: `readConciergeStepHistory()` is a disk-history helper, not an IPC surface today.

Evidence:

- `commitWithTrailer()` writes `Concierge-Step: ${step}:${status}` trailers and returns the commit SHA (`src/main/data-layer/git/gitCommand.ts:62-100`).
- `readConciergeStepHistory()` shells out to `git log --format=%H%x00%B%x1e`, parses committed messages, and returns `{ step, status, commitSha, warnings }` records (`src/main/data-layer/git/gitCommand.ts:110-127`).
- `steps:read` registers an IPC handler, but its default reader parses `request.commits` supplied in the payload. It does not call `readConciergeStepHistory()` or perform git I/O (`src/main/ipc/steps.ts:21-68`).

Run 9 implication: `review:evidence` should call the disk-history helper or a thin disk-history wrapper in main. It should not depend on renderer-supplied commit messages or renderer state.

## Probe B - Clarifications Format

Finding: the committed `spec.md` clarification format is parseable from disk.

Observed fixture:

```md
## Clarifications

### Session 2026-05-29

- Q: Should Ask Another start a new ACP session or continue the active Clarify conversation? -> A: Same ACP session.
```

Evidence: `specs/0007-clarify-vertical/spec.md:11-19` contains the canonical `## Clarifications` / `### Session <date>` section with Q/A bullets. `specs/0008-ai-passive-steps/spec.md` uses the same heading shape.

Run 9 implication: implement the parser in main near `review:evidence`, reading committed `spec.md` file contents. Do not use `ClarifyCompletionSummary` from renderer session state.

## Probe C - App-Owned Analyze Report Location

Finding: app-owned runtime files already live below `app.getPath('userData')`, with in-flight markers using `userData/in-flight/${sessionId}/${step}.marker`.

Evidence: `markerPath()` builds `path.join(userDataPath, 'in-flight', sessionId, `${step}.marker`)` (`src/main/hooks/inFlightMarker.ts:24-25`). Passive IPC handlers receive `userDataPath` from the Electron registration path and pass it through the hook context (`src/main/ipc/passiveStepIpc.ts:92-104`, `143-149`).

Recommended Run 9 path: `userData/evidence/${sessionId}/analyze-report.md`.

Rationale: this is clearly app-owned evidence, outside the feature artifact contract. It avoids inventing `analyze.md` under `specs/<feature>/`, while still making the report available on disk for Review and the Analyze screen. Review can include the app-owned report path as evidence metadata and read its body on click through a safe main-process read path.

## Probe D - ACP Prompt Result and Terminal Text

Finding: the passive adapter currently discards the prompt result, and the supervisor result type does not expose final assistant markdown text.

Evidence:

- `createPassiveCopilotAgentAdapter()` awaits `session.prompt(...)` and ignores the returned value (`src/main/ipc/copilotPassiveAgent.ts:16-40`).
- `LiveBoundCLISession.prompt()` collects updates after `protocol.prompt(...)`, calls `onUpdate` only after the prompt resolves, writes the transcript, and returns `{ stopReason, updates }` (`src/main/data-layer/acp/supervisor.ts:159-178`).
- `BoundCLIPromptResult` is typed as `{ stopReason: string; updates: BoundCLIPromptUpdate[] }`, with no assistant text field (`src/main/data-layer/acp/types.ts:105-108`).

Run 9 implication: capture the final report by deriving terminal assistant markdown from the prompt updates or transcript records. Also plumb fine-grained updates through the passive pipeline as they arrive; the current `onUpdate` callback is invoked after `protocol.prompt()` returns, which is too late for real-time hang-silence reset.

## Probe E - Optional Plan Discovery Fixture

Finding: a fixture with the optional Plan artifacts exists, but the current implementation does not discover it.

Fixture check:

- `specs/0007-clarify-vertical/contracts/clarify-api.md` exists.
- `specs/0007-clarify-vertical/data-model.md` exists.
- `specs/0007-clarify-vertical/quickstart.md` exists.

Current implementation:

- `STEP_ARTIFACT_MANIFEST.plan.optionalFiles` is `[]` (`src/main/hooks/manifest.ts:22-25`).
- `expectedArtifactsForStep()` only concatenates manifest required files, manifest optional files, and Analyze remediation files (`src/main/hooks/manifest.ts:46-61`).
- `validatePlanArtifacts()` validates required Plan markdown and commits only `STEP_ARTIFACT_MANIFEST.plan.requiredFiles` (`src/main/domain/factories/plan.factory.ts:5-15`).
- Passive summary maps `expectedArtifactsForStep(step)` and marks every non-Analyze artifact as required (`src/main/ipc/passiveStepIpc.ts:72-83`).

Run 9 implication: add manifest entries for `data-model.md`, `quickstart.md`, and a `contracts/` directory pattern, then implement disk discovery so present optional artifacts are included with `required:false` and absent optional artifacts do not gate validation or commit.
