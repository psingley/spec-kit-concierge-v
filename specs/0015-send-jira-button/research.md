# Research: Send to JIRA from Review

## Decision 1: Reuse the existing Review-step container, auth slice, Jira slice, and modal host

- **Decision**: Add JIRA submission entry, preview, and progress UI through `src/renderer/components/ReviewStepContainer.tsx`, `src/renderer/components/ReviewStep.tsx`, a dedicated `src/renderer/slices/jira.ts` submission-state slice, the existing `ui` slice for modal visibility, and `src/renderer/components/ModalHost.tsx`.
- **Rationale**: Review already owns evidence loading, artifact modal dispatch, and terminal-step actions. Atlassian MCP readiness is already projected into `state.auth.atlassian`, and the app already standardizes overlay dialogs through `.modal-veil` and `ModalHost`.
- **Alternatives considered**:
  - A standalone JIRA screen: rejected because the feature is explicitly the terminal action of Review.
  - Inline dialogs rendered inside `ReviewStep`: rejected because the shared overlay path already exists and keeps modal layout independent of workspace scrolling.

## Decision 2: Build the hierarchy from `spec.md`, `tasks.md`, and the pinned JIRA config

- **Decision**: Generate the dry-run preview and submission DAG from `specs/0015-send-jira-button/spec.md`, the feature's `tasks.md`, and `.specify/extensions/concierge-jira/jira-config.yml`.
- **Rationale**: The feature spec requires Epic -> Phase Story -> Task Subtask creation, and the pinned config already locks project key, issue-type mapping, team-managed `Parent` semantics, and default labels. `CONTEXT.md` and ADR-0018 already define this as the authoritative terminal Review action.
- **Alternatives considered**:
  - Parsing `plan.md` as an additional hierarchy source: rejected because the feature spec names `spec.md` and `tasks.md` as the source artifacts.
  - Calling Atlassian during preview to discover structure: rejected because the preview must be a dry run and must not create or depend on live writes.

## Decision 3: Keep submission records under the feature directory and make disk truth authoritative

- **Decision**: Persist submission records under `specs/0015-send-jira-button/jira-submission-state/` and make preview/resume state derive from those records plus the feature artifacts on disk.
- **Rationale**: The constitution requires disk-as-truth. Existing protocol docs and prior run evidence already use per-feature `jira-submission-state/` directories, which keeps Review restart-safe and auditable from the worktree alone.
- **Alternatives considered**:
  - Storing submission progress in renderer state only: rejected because it breaks relaunch and resume.
  - Storing submission records under `userData/`: rejected because the feature artifacts and their proof need to travel with the branch and remain inspectable from disk in the repository.

## Decision 4: Use one ACP-backed Copilot turn per node; do not add a new print-mode exception

- **Decision**: Run each Jira create attempt through a dedicated main-process module that uses the existing ACP `BoundCLISupervisor`/session prompt path for one bounded Copilot turn per node.
- **Rationale**: The constitution keeps bound-CLI integrations ACP by default and reserves print-mode as a narrow step-execution exception. ADR-0018 rejects the per-ticket LLM shell-out filer and requires a deterministic app-owned loop with the Bound CLI making the Atlassian MCP call.
- **Alternatives considered**:
  - Reusing the old `speckit.concierge-jira.file-ticket` shell-out pattern: rejected by ADR-0018 because it proved unreliable at scale.
  - Direct Atlassian HTTP/MCP calls from app code: rejected by Observer-Only and the feature spec.
  - A new non-step print-mode exception: rejected because the current constitution explicitly keeps non-step integrations ACP-first.

## Decision 5: Preview is local-only and surfaces warnings from deterministic data

- **Decision**: `jira:preview` returns the exact planned hierarchy, parent relationships, thin-body warnings, and existing-record warnings using local artifact parsing plus existing submission records only.
- **Rationale**: User Story 1 requires an exact dry-run preview before any create call. Local parse plus persisted state is enough to warn about thin descriptions, already-verified nodes, and resumable work without violating the "no create before confirm" rule.
- **Alternatives considered**:
  - Deferring warnings until after confirmation: rejected because preview is the safety gate.
  - Performing live orphan searches during preview: rejected because orphan adoption belongs in the deterministic create loop after confirmation.

## Decision 6: Use RTK Query plus a dedicated Jira submission slice

- **Decision**: Expose preview/status through an RTK Query query and submission/resume through an RTK Query streaming mutation; extend the `ui` slice only for overlay visibility and dialog mode; keep submission state in `src/renderer/slices/jira.ts` as `{submitting, dryRunPreview, results, issues, error}`.
- **Rationale**: IPC-crossing async work belongs in RTK Query, and the modal host already expects small UI flags in `ui`. The locked Review submission design also requires a stable renderer-owned submission view model for progress, final issue links, dry-run preview, and errors.
- **Alternatives considered**:
  - Local component state only: rejected because the shared modal host needs stable app-level open/close coordination.
  - Storing progress only in RTK Query cache: rejected because progress and modal rendering need a stable local view model shaped for Review UI, not only transport responses.

## Decision 7: Canonical submission records must include payload hash and idempotency label

- **Decision**: The new app-owned submission record contract uses canonical camelCase fields such as `issueKey`, `issueUrl`, `payloadHash`, and `idempotencyLabel`, and includes the deterministic terminal status needed for resume and duplicate adoption.
- **Rationale**: The feature spec requires canonical `<project_key>-idem-<hash12>` labels, payload identity checks, and verified/duplicate advancement. Older repo docs and historical sample files use inconsistent field names (`issue_key`, `live_key`, `jiraKey`), but those shapes do not carry enough information to satisfy the new resume requirements.
- **Alternatives considered**:
  - Carrying mixed historical field names into the new runtime contract: rejected because it would keep the ambiguity alive at the exact boundary the feature depends on.
  - Reusing the old `concierge.jira.state.v1` sample shape unchanged: rejected because it lacks payload hash and idempotency-label truth.

## Decision 8: v1 remains create-only and must stop on the first non-advanceable node

- **Decision**: The runner creates only the hierarchy, never syncs completion/status back to Jira, and halts on the first node whose persisted record is not terminal `verified` or `duplicate` with a matching payload hash and issue key.
- **Rationale**: This matches FR-010 through FR-019, ADR-0018, and the existing `done_status` note in `jira-config.yml` that explicitly defers status-sync behavior.
- **Alternatives considered**:
  - Status-sync during the same run: rejected as out of scope for v1.
  - Best-effort continue-on-error: rejected because the feature requires deterministic, inspectable halt behavior and safe resume.
