# Clarifications: Run 6 Specify Vertical

**Session Date**: 2026-05-27
**Spec**: `specs/0006-specify-vertical/spec.md`
**Grill Resolutions**: `specs/0006-specify-vertical/grill.md`
**Design Reference**: `design/v3-fetch/project/`

## Result

Residual ambiguities found. These do not reopen the 11 settled grill decisions or the user decision to soften the auth gate; they resolve seams left between the Run 6 spec, the grill, and the v3 design bundle before `/speckit.plan`.

## Residual Ambiguities and Proposed Defaults

| ID | Ambiguity | Proposed default | Why this default |
|---|---|---|---|
| R6-C01 | Draft-session branch timing and naming are inconsistent across artifacts. The spec says starting a new session creates a draft branch before workspace entry, while the v3 design mock creates `spec/draft-<suffix>` only when Begin is clicked. | `git:createDraft` runs when the user chooses "Start a new session" from the repository/branch picker. It creates and checks out a branch from the selected repo's default branch before opening the workspace. Branch names use `spec/draft-<base36 timestamp suffix>` when no prompt-derived slug exists; collision retries generate a new suffix. | Matches FR-012 and keeps workspace titlebar, dirty-check failures, and Step Commit target deterministic before the Specify pipeline starts. |
| R6-C02 | The selected Copilot model is represented in preferences/titlebar, but the spec does not state whether it affects the Specify ACP run. | The selected `preferences.copilotModel` is included in `copilot:specify` and applied before the ACP prompt using Run 3's `setSessionConfigOption` with standard `configOptions[id=model]`. Changes affect future runs only; they do not mutate an in-flight Specify run. | Prevents the model picker from being cosmetic while preserving Run 3's established model-selection contract. |
| R6-C03 | The readback source for rendered `spec.md` is underspecified. The spec requires a done event with readable markdown and also adds `artifacts:read`, but does not name the canonical path source. | After `after_specify` validates the Step Contract and writes the Step Commit, the main process reads `spec.md` from the Step Contract's validated artifact path. The `copilot:specify` final event carries `specMarkdown`, `artifactPath`, and `commitSha`; `artifacts:read` uses the same relative `artifactPath` for refresh and modal reads. | Avoids a second path-discovery heuristic and guarantees the UI only shows completion for the same artifact that passed validation and was committed. |
| R6-C04 | The streaming mutation's event contract is only described as progress plus one done event, but Runs 7-9 will reuse it. | Use one discriminated event shape for step streams: progress events carry `type: 'progress'`, `step`, `sessionId`, `level: 'info' | 'ok' | 'warn' | 'error'`, `message`, and `timestamp`; the terminal event carries `type: 'done'`, `step`, `sessionId`, `status: 'pass' | 'fail'`, optional `specMarkdown`, `artifactPath`, `commitSha`, and optional `reason`. Exactly one terminal event is emitted per run. | Gives ADR-0010 and later verticals a stable reusable contract without changing Run 5 lifecycle semantics. |
| R6-C05 | Later-step placeholder navigation is not precise enough for restored sessions and post-Specify state. | On a fresh Run 6 session, only Specify is actionable. After Specify passes, Clarify becomes `pending` and may be selected only to show the Run 7 placeholder. Plan, tasks, analyze, and review remain `not_available` and non-actionable unless restored trailer history says otherwise; any restored later step state is displayed faithfully, but its body remains a Run 7-9 placeholder. | Keeps the six-step UI honest, supports branch restore, and avoids implying later-step implementation in Run 6. |

## Codex audit verdict (agentId aedd16f543ec0950a)

Codex independent audit ran against spec.md + grill.md + v3 design
bundle. Verdict on each ambiguity:

- **R6-C01:** ACCEPT — real inconsistency. `git:createDraft` runs at
  "Start a new session" from the repo picker, before workspace entry.
  Branch naming `spec/draft-<base36-timestamp-suffix>`.
- **R6-C02:** ACCEPT — model selection threads through `copilot:specify`
  via Run 3's `setSessionConfigOption`. Changes affect future runs only.
- **R6-C03:** ACCEPT — Step Contract's validated artifact path is
  canonical. `copilot:specify` final event carries `specMarkdown +
  artifactPath + commitSha`; `artifacts:read` uses same path.
- **R6-C04:** ACCEPT — discriminated event shape locked for Runs 6-9
  reuse (ADR-0010 candidate during Plan step):
  ```ts
  type StepStreamEvent =
    | { type: 'progress', step, sessionId, level: 'info'|'ok'|'warn'|'error', message, timestamp }
    | { type: 'done', step, sessionId, status: 'pass'|'fail', specMarkdown?, artifactPath?, commitSha?, reason? };
  ```
  Exactly ONE terminal `done` event per run.
- **R6-C05:** MODIFY — placeholder semantics accepted, BUT step order
  in the renderer follows spec-kit canonical `specify → clarify → plan
  → tasks → analyze → review`. The design's `plan → analyze → tasks`
  ordering is cosmetic-only and explicitly NOT followed. Restored
  sessions display per-trailer step state faithfully; later step
  bodies remain placeholders for Runs 7-9.

User HITL gate (psingley): "patch" — apply codex's 4 ACCEPT + 1 MODIFY
verdicts.

## Settled Decisions Not Reopened

The GitHub + Copilot auth gate with optional Atlassian stub, three visible prerequisite rows, eight-slice state lock, canonical step order, activity cap of 256, single stylesheet, empty Specify prompt, v3 component inventory, PixelCSpinner, CustomizeModal, first Playwright vertical tracer bullet, and gpt-5.5 high model choice remain settled.
