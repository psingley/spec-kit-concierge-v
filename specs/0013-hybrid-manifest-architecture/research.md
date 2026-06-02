# Research: Hybrid Manifest Architecture

## Decision: `.concierge/session-manifest.json` is the durable session authority

**Rationale**: The feature needs one durable record that survives app restarts and branch/session reconstruction. A worktree-local `.concierge/session-manifest.json` travels with the isolated session workspace and can be reconciled against the same branch history and artifact paths that define completion. Atomic writes with fsync prevent partial manifest files from being accepted as valid state.

**Alternatives considered**:
- Renderer session state: rejected because it is transient and violates Disk-Is-Truth.
- UserData-only manifest: rejected because branch/session evidence would not travel with the worktree.
- Git trailers only: rejected because trailers prove completed outcomes but cannot preserve running/killed/interrupted attempts, spawn recipes, anomalies, interventions, or doctor audit records.

## Decision: Step attempts are append-only records with supersession links

**Rationale**: Attempts must preserve interrupted, killed, failed, and superseded executions without overwriting evidence that may explain later recovery. Supersession links let resume choose the active/latest attempt while retaining prior anomalies and interventions for audit.

**Alternatives considered**:
- Single mutable step record: rejected because it erases failed evidence and makes duplicate/out-of-order commits harder to reason about.
- One file per attempt: rejected for v1 because it adds file coordination complexity without improving the reconciliation model.

## Decision: Step execution uses the print-mode command contract

**Rationale**: FR-009 fixes the command shape: `copilot -p --agent speckit.<step> --output-format json --session-id <uuid> --log-dir <dir>`. This gives a consistent spawn recipe, resumable session id, JSON output stream, and explicit log directory without relying on ACP as the step execution transport.

**Alternatives considered**:
- Keep ACP supervisor for step agents: rejected by FR-010 and the architecture seed.
- Shell out to ad-hoc agent commands per step: rejected because it would fragment spawn recipes and make recovery/replay inconsistent.
- Let the doctor invoke raw agent commands: rejected because deterministic code must remain the sole writer and authority.

## Decision: Completion is a `sessionReconciler` decision over manifest, branch, and artifacts

**Rationale**: A step should pass only when the manifest attempt, branch completion evidence, and required artifacts agree. A pure reconciler makes that decision testable and reusable from step completion, resume, doctor returns, nudge, and Review.

**Alternatives considered**:
- Mark pass from process exit code: rejected because success exits can leave missing artifacts or conflicting branch evidence.
- Mark pass from assistant terminal prose: rejected because agent output is not authoritative.
- Mark pass from trailer alone: rejected because required artifacts may be missing, stale, or contradictory.

## Decision: Branch-history idempotency compares step-owned artifact snapshots

**Rationale**: Head-only idempotency fails when a valid completion commit exists earlier in branch history or commits are duplicated/out of order. Comparing the step-owned artifact snapshot for the candidate step lets the system adopt a prior valid commit instead of writing duplicates.

**Alternatives considered**:
- Continue checking only HEAD: rejected by FR-013.
- Compare commit messages only: rejected because a trailer can exist on the wrong artifact content.
- Always write a new commit: rejected because duplicate completion evidence is one of the core failure modes.

## Decision: Dirty-diff gates use step-start owned-path snapshots

**Rationale**: The system needs to distinguish intended step changes from unrelated user or agent edits. Taking a step-owned path snapshot at step start gives dirty-diff gates the baseline needed to block unrelated, ambiguous, or unsafe changes while allowing valid step-owned artifact updates.

**Alternatives considered**:
- Block any dirty worktree: rejected because steps normally create artifacts.
- Allow all changes under the feature directory: rejected because misplaced or unrelated feature edits can still corrupt completion.
- Rely on git status only: rejected because path lists alone cannot prove ownership or content identity.

## Decision: Failed markers include stranded-artifact detail

**Rationale**: Resume and Review need actionable failure evidence when a step cannot be safely reconciled. Recording stranded artifacts in `.specify/concierge/failed-steps/<step>.json` preserves the mismatch without marking completion and gives deterministic recovery or human escalation a precise input.

**Alternatives considered**:
- Store only a failure reason: rejected because the user cannot inspect what needs recovery.
- Store failed markers in renderer state: rejected because failures must survive restart.
- Delete stranded artifacts automatically: rejected because ambiguous recovery must escalate rather than guess.

## Decision: `relocateArtifact` is the first guarded recovery tool

**Rationale**: Misplaced step-owned artifacts are common and sometimes safe to repair. A guarded relocation tool can resolve only unambiguous cases after re-reading disk truth, validating expected source/destination ownership, appending an intervention record, and returning to reconciliation.

**Alternatives considered**:
- Ask the doctor to move files directly: rejected because the doctor cannot perform raw file operations.
- Always fail on misplaced artifacts: rejected because deterministic recovery should handle known safe cases before escalation.
- Relocate based on filename alone: rejected because duplicate plausible feature directories are an explicit edge case.

## Decision: Watchdog/transcript classifier records anomalies without authority

**Rationale**: Process silence, missing terminal JSON, killed child processes, and transcript irregularities are evidence that reconciliation needs, but classification should not mutate manifest outcome or branch state by itself. Recording anomalies keeps authority centralized in the reconciler.

**Alternatives considered**:
- Auto-fail or auto-cancel from watchdog: rejected because the constitution forbids automatic failure/cancel/retry on silence.
- Ignore transcript anomalies: rejected because the doctor and user need evidence.
- Let classifier mark completion when output looks successful: rejected because completion requires manifest/branch/artifact agreement.

## Decision: Doctor harness exposes exactly twelve tools

**Rationale**: Open-ended anomalies can benefit from an LLM intermediary, but only if it is bounded. The exact read-only tools from FR-020 and guarded tools from FR-021 give the doctor enough evidence and safe actions while forbidding direct state writes, raw git/file operations, completion marking, contract widening, guessing, and more than two attempts per step.

**Alternatives considered**:
- No doctor: rejected because ambiguous anomalies would lack guided triage.
- General shell/file/git tool access: rejected because it would create a second source of authority.
- More than two attempts: rejected because failed doctor loops should escalate instead of compounding risk.

## Decision: Facilitator remains deterministic owner of step orchestration

**Rationale**: The facilitator can spawn print-mode agents, capture identifiers/log checksums/terminal results, write manifest attempts, and route anomalies to deterministic recovery or doctor escalation while keeping all authoritative writes in app code.

**Alternatives considered**:
- Move orchestration into the doctor prompt: rejected because deterministic code must own writes and state transitions.
- Keep orchestration split between passive IPC and hooks without a manifest owner: rejected because authority would remain scattered.

## Decision: Nudge is available only for terminal-stuck sessions after auto-remediation fails

**Rationale**: The nudge is an escape hatch, not normal flow. It should appear only when automatic deterministic recovery has failed and the session is terminal-stuck. Its repair function computes intended branch shape from durable evidence and applies guarded actions only for unambiguous discrepancies.

**Alternatives considered**:
- Always show nudge: rejected because users could trigger risky repair during healthy or actively recoverable sessions.
- Hide nudge and require manual git operations: rejected because the app should offer a safe deterministic escape hatch.
- Let nudge force completion: rejected because it would bypass reconciliation.

## Decision: Existing resume and routing behaviors are regression contracts

**Rationale**: FR-028 requires preserving resume reconstruction, maximum reached step advancement, navigation-loop prevention, graceful failed-step resume, branch-null routing gates, and Windows-conditional behavior. These should be treated as compatibility contracts while manifest authority replaces transient state assumptions.

**Alternatives considered**:
- Rewrite navigation around the new manifest without compatibility tests: rejected because it risks regressions in already-shipped flows.
- Leave resume on existing step slices only: rejected because it would keep renderer state too authoritative.
