# Implementation Plan: Hybrid Manifest Architecture

**Branch**: `build/manifest-architecture-dogfood` | **Date**: 2026-06-01 | **Spec**: `specs/0013-hybrid-manifest-architecture/spec.md`

**Input**: Feature specification from `specs/0013-hybrid-manifest-architecture/spec.md`; selected by `.specify/feature.json`; clarification seed: hybrid deterministic core plus bounded LLM doctor, strict reconciliation, print-mode unification, ACP removal from step execution, deterministic code as sole writer and authority, and nudge only for terminal-stuck sessions after automatic remediation fails.

**Note**: This plan stops after Spec Kit Phase 2 planning. `/speckit.tasks` creates implementation tasks. No source implementation files are edited by this planning step.

## Summary

Run 13 introduces a hybrid manifest architecture that makes `.concierge/session-manifest.json`, branch history, and step-owned artifacts the deterministic source of step truth while using a bounded doctor agent only as an anomaly intermediary. The implementation replaces ACP step execution with the unified print-mode command contract, hardens step contracts and commit idempotency, reconciles every step before and after commits, blocks unsafe dirty diffs, records failed markers with stranded artifacts, and exposes guarded recovery/nudge flows that can never bypass deterministic validation.

The build order is fixed by FR-030 and preserved exactly:

1. `sessionManifestStore` with atomic writes and anomaly/intervention records.
2. `stepContracts` hardening and step-start owned-path snapshots.
3. Branch-history `commitStep` idempotency.
4. `sessionReconciler`.
5. Dirty-diff gates plus failed markers with stranded-artifact detail.
6. Guarded `relocateArtifact` backed by the deterministic recovery catalog.
7. Watchdog/transcript classifier.
8. Bounded 12-tool doctor harness.
9. Doctor agent instructions.
10. Facilitator integration.
11. Nudge button plus `reconcileBranchToIntendedShape`.

## Technical Context

**Language/Version**: TypeScript 5.7 strict, Node 22+, React 18, Electron 33.

**Primary Dependencies**: Electron, React, Redux Toolkit + RTK Query, pino, Git CLI via existing `gitCommand.ts`, Copilot CLI print-mode command contract. No planned runtime dependency additions.

**Storage**: Worktree-local `.concierge/session-manifest.json` is the authoritative session manifest. Existing git history and `Concierge-Step:` trailers remain durable completion evidence. Feature artifacts remain under `specs/0013-hybrid-manifest-architecture/`. Failed markers remain under `.specify/concierge/failed-steps/` and gain stranded-artifact detail. App logs and doctor audit records use existing `userData` logging/audit patterns where evidence is app-owned rather than feature-owned.

**Testing**: Vitest for unit/integration tests, React Testing Library for renderer smart/dumb behavior, Playwright/Electron for nudge/facilitator flows, HTTP contract tests for external-agent parity, existing npm scripts: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run test:coverage`, and targeted `npm run e2e` where UI flows change.

**Target Platform**: Electron desktop app with Windows shipping target and macOS developer support.

**Project Type**: Desktop application with main/preload/renderer split and IPC trust boundaries.

**Performance Goals**: Manifest read plus reconciliation over the largest Run 13 fixture must complete in 500 ms or less on local developer hardware. The largest fixture is `tests/fixtures/hybrid-manifest/session-manifest.max.json` with six steps, three attempts per step, 30 anomalies, 30 interventions, 12 doctor invocations, and 60 artifact snapshot entries. Audit-trail inspection for failed, remediated, and nudged sessions must expose a bounded user-visible view within 30 seconds. Doctor harness is invoked only after deterministic recovery cannot resolve an anomaly and is limited to two attempts per step.

**Constraints**: Deterministic code is the only writer of manifest state, commits, trailers, failed markers, completion status, and guarded mutations. Step execution uses `copilot -p --agent speckit.<step> --output-format json --session-id <uuid> --log-dir <dir>`. ACP is retired as the step execution transport for this architecture. Doctor tools are exactly the six read-only and six guarded tools from FR-020 and FR-021. Mutating doctor tools must re-read disk truth, validate preconditions, be idempotent by anomaly id, append audit records, and return to reconciliation. Preserve existing resume reconstruction, maximum reached step advancement, navigation-loop prevention, graceful failed-step resume, branch-null routing gates, and Windows-conditional behavior.

**Scale/Scope**: One cross-cutting architecture slice across main data-layer/domain/hooks/IPC, renderer listener/API/component surfaces, doctor/facilitator instructions, and regression/E2E fixtures. Implementation must remain vertically testable by the 11 milestones above.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate Result | Plan Response |
|-----------|-------------|---------------|
| I. Layered Architecture | PASS | Manifest, git, filesystem, child process execution, doctor tools, and reconciliation live in main/data-layer/domain/effect modules. Renderer reaches state and nudge actions only through typed IPC and RTK Query. |
| II. Disk Is Truth | PASS | Manifest, branch trailers, artifacts, failed markers, and audit records are durable disk/git facts. Renderer state stays derived and non-authoritative. |
| III. Bound CLI and Step Execution Transport | PASS WITH CONSTITUTION EXCEPTION | FR-009 and FR-010 use the Run 13 constitution-approved print-mode exception for step-agent execution only. Bound CLI integrations remain ACP by default, and deterministic reconciliation remains the only completion authority. |
| IV. Factory-First Data Transformation | PASS | Manifest, step attempts, anomalies, interventions, doctor tool payloads, failed markers, nudge results, and renderer API payloads require factories at disk/IPC/preload boundaries. |
| V. Scoped Functional Programming | PASS | Pure reconciliation/classification/contract logic is separated from effectful filesystem, git, child-process, and IPC adapters. |
| VI. State Management | PASS | RTK Query owns IPC reads/mutations and listener middleware coordinates recovery/nudge effects. No ninth Redux slice is planned. |
| VII. Step Lifecycle and Recovery | PASS WITH CHANGE | Hooks remain lifecycle owners, but their execution path delegates to manifest-backed reconciliation and print-mode step invocation rather than ACP sessions. Step Commit and failed-marker writes remain deterministic hook/facilitator responsibilities. |
| VIII. Step Contracts | PASS | Existing contract factories are hardened with step-owned snapshots and artifact snapshot identities used by reconciliation and idempotency. |
| IX. Driveable by External Agents | PASS | Manifest read, reconcile, audit trail, doctor status, and nudge are implemented through the same validated IPC/data-layer path and exposed through the localhost HTTP API with typed request/response contracts. |
| X. MCP Posture | PASS | Doctor and step agents may use the Bound CLI's MCP configuration indirectly; Concierge still does not speak to MCP services directly. |
| XI. External-Service Submission | PASS | This feature does not change JIRA outer-loop ownership. |
| XII/XIII. Smart/Dumb + Effects | PASS | Renderer nudge button and status surfaces are smart-container driven; presentational components stay props-only; side effects stay in RTK Query/listeners. |
| XIV. Accessibility | PASS | Nudge affordance, doctor/escalation notices, failed-state markers, and recovery results must be keyboard-accessible and announced via status/alert regions. |
| XV. Structured Observability | PASS | Manifest writes, reconciliation decisions, anomalies, interventions, doctor tool invocations, classifier results, and nudge actions emit structured logs/audit entries without PII or raw tokens. |
| XVI. Spec-kit Discipline | PASS WITH DOGFOOD BRANCH EXCEPTION | Phase 0/1 artifacts are generated before tasks; implementation must use vertical tracer bullets and preserve the FR-030 milestone order. This dogfood lane remains on `build/manifest-architecture-dogfood` while `.specify/feature.json` points at the numbered `specs/0013-hybrid-manifest-architecture` feature directory. |

### Constitution impact

FR-009 and FR-010 rely on the Run 13 constitution exception for print-mode step execution. The implementation plan includes an early documentation/ADR/guidance task that records the exception before source changes rely on it. This is not optional feature behavior; it is part of the user-approved architecture seed.

## Project Structure

### Documentation (this feature)

```text
specs/0013-hybrid-manifest-architecture/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── doctor-tools.md
│   ├── facilitator-nudge.md
│   ├── http-api.md
│   ├── manifest-schema.md
│   ├── reconciliation.md
│   ├── recovery-catalog.md
│   └── renderer-status-mapping.md
└── tasks.md                  # created later by /speckit.tasks
```

### Source Code (repository root)

```text
src/main/
├── data-layer/
│   ├── manifest/             # new sessionManifestStore atomic read/write helpers
│   ├── agents/               # new typed Copilot print-mode process adapter
│   ├── doctor/               # new bounded doctor harness tool adapters
│   ├── recovery/             # new guarded relocate/revert/restart/cancel actions
│   ├── git/
│   │   ├── gitCommand.ts     # existing git shell-out path; extend branch-history idempotency
│   │   ├── branchState.ts    # existing branch-state facts reused by reconciler
│   │   └── uncommittedPaths.ts
│   ├── failedSteps.ts        # extend marker detail and parser strictness
│   └── specify/featureDir.ts # existing .specify/feature.json resolver
├── domain/
│   ├── manifest/             # new pure manifest factories/types and attempt reducers
│   ├── reconciliation/       # new pure sessionReconciler, dirty-diff gates, intended shape
│   ├── doctor/               # new pure tool request/response factories and budgets
│   └── factories/            # harden existing step contracts and artifact snapshots
├── hooks/
│   ├── hookHelpers.ts        # route before/after hooks through manifest/reconciler
│   ├── manifest.ts           # strengthen step artifact ownership metadata
│   └── *.hook.ts             # preserve lifecycle entry points
	├── ipc/
	│   ├── copilotPassiveAgent.ts # orchestrates IPC/facilitator flow through data-layer print-mode adapter
	│   ├── passiveStepIpc.ts      # reconcile before/after execution and failed-marker handling
	│   ├── sessionManifest.ts     # new read/reconcile/nudge IPC handlers
	│   └── *.factory.ts           # trust-boundary factories
	├── http/
	│   ├── sessionManifest.ts     # localhost HTTP parity handlers
	│   ├── sessionManifest.routes.ts
	│   └── sessionManifest.factory.ts
	└── logging.ts

src/preload/
└── index.ts                  # expose typed manifest/reconcile/nudge bridge entries

src/renderer/
├── api/
│   ├── sessionManifest.endpoint.ts
│   ├── sessionManifest.factory.ts
│   └── rootApi.ts
├── listeners/
│   ├── sessionLifecycle.listener.ts
│   ├── stepLifecycle.listener.ts
│   └── transcriptCapture.listener.ts
├── components/
│   ├── PassiveStepContainer.tsx
│   ├── ReviewStepContainer.tsx
│   ├── StatusStep.tsx
│   └── NudgeButton.tsx
└── slices/
    ├── steps.ts
    └── session.ts

.github/agents/
├── speckit.doctor.agent.md   # new bounded doctor instructions
└── existing step agents      # invoked through print-mode command contract
```

**Structure Decision**: Keep the existing Electron main/preload/renderer layout. New durable authority lives in main/domain/data-layer modules. Renderer work is limited to derived display and explicit nudge actions through typed IPC/RTK Query. Doctor instructions are data/prompt artifacts, while all doctor tool execution remains deterministic code.

## Phase 0: Research

Research is complete in `research.md`. All planning unknowns are resolved:

- The manifest is a worktree-local, atomically written JSON record under `.concierge/session-manifest.json`.
- Step attempts are append-only records with supersession links and captured execution evidence.
- Step execution moves to the print-mode command contract from FR-009.
- ACP is retired only for step execution; existing ACP modules can remain until replacement work removes their call paths.
- Completion is a reconciler decision over manifest attempt state, branch history, and step-owned artifact snapshots.
- Branch-history idempotency compares step-owned artifact snapshot identities, not only HEAD.
- Dirty-diff gates use step-start owned-path snapshots and block unrelated/ambiguous changes.
- The doctor is a bounded LLM intermediary with exactly twelve tools and zero direct authority.
- The nudge action computes intended branch shape from durable evidence and runs only after terminal-stuck criteria are met.

## Phase 1: Design & Contracts

Design artifacts are complete:

- `data-model.md` defines Session Manifest, Step Attempt, Branch State Snapshot, Step-Owned Artifact Snapshot, Terminal Result, Anomaly, Intervention, Doctor Tool Invocation, Doctor Budget, Failed Step Marker, Nudge Request, Intended Branch Shape, and Reconciliation Result.
- `contracts/manifest-schema.md` defines the durable manifest schema, atomic-write expectations, attempt lifecycle, anomaly/intervention audit records, and migration/version behavior.
- `contracts/reconciliation.md` defines reconciliation inputs, completion gates, branch-history idempotency, dirty-diff gates, failed-marker writes, and classifier output.
- `contracts/doctor-tools.md` defines the exact six read-only and six guarded doctor tools, budgets, preconditions, idempotency, audit semantics, and forbidden actions.
- `contracts/facilitator-nudge.md` defines facilitator integration, print-mode invocation, terminal-stuck criteria, nudge visibility, `reconcileBranchToIntendedShape`, and human escalation outputs.
- `contracts/http-api.md` defines localhost HTTP parity for manifest read, reconcile, audit trail, doctor status, and nudge.
- `quickstart.md` defines implementation order and verification entry points.

## Implementation Approach

### Milestone 1: `sessionManifestStore`

Add an atomic JSON store for `.concierge/session-manifest.json` with strict factories, schema versioning, append-only step attempts, anomaly/intervention records, and durable fsync-backed writes. The store is the only persistence API for session manifest state and exposes pure reducers for attempt transitions plus effectful read/write helpers.

### Milestone 2: `stepContracts` hardening

Extend step contract metadata to include step-owned path sets and step-start path/content snapshots. Factories validate required artifacts and produce artifact snapshot identities for reconciliation and commit idempotency. Existing step contract behavior stays compatible with current required/optional artifact rules.

### Milestone 3: Branch-history `commitStep` idempotency

Replace head-only idempotency with a branch-history search that compares the current step-owned artifact snapshot against prior step completion commits. Adopt an existing valid commit when artifact content already matches intended completion; otherwise commit through the existing `gitCommand.ts` path with exactly one `Concierge-Step: <step>:pass` trailer.

### Milestone 4: `sessionReconciler`

Build a pure reconciler that reads manifest attempts, branch trailers, artifact snapshots, failed markers, and terminal results and emits `pass`, `failed`, `killed`, `interrupted`, or terminal-stuck state without trusting renderer memory or agent prose. Run reconciliation before and after commit writes.

### Milestone 5: Dirty-diff gates plus failed markers

Add deterministic dirty-diff gates that distinguish step-owned changes from unrelated, ambiguous, or unsafe edits. Block completion on unsafe diffs and write failed markers with stranded artifact detail so resume and Review can surface exact recovery context.

### Milestone 6: Guarded `relocateArtifact` and deterministic recovery catalog

Implement the deterministic recovery orchestrator and guarded recovery actions for the safe recovery catalog before doctor escalation under the Run 13 constitution exception. `relocateArtifact` is the first filesystem mutation and re-reads disk truth, validates source/destination ownership, rejects ambiguity, appends an intervention audit record, and returns control to reconciliation. The same orchestrator also covers valid completion adoption, failed-marker refresh, proven unrelated-file revert, observed active-step cancellation, and pinned-context restart only after explicit user confirmation or an approved guarded doctor request. The orchestrator never silently re-runs a step, marks completion directly, or writes completion trailers outside hook ownership.

### Milestone 7: Watchdog/transcript classifier

Classify watchdog silence, missing terminal output, invalid JSON output, unexpected child exit, and transcript anomalies as deterministic anomaly records. The classifier cannot mutate authoritative state or mark completion.

### Milestone 8: Bounded 12-tool doctor harness

Add a doctor harness with exactly six read-only tools (`readFeatureJson`, `readManifest`, `gitStatusDiff`, `readTrailers`, `readArtifacts`, `readTranscript`) and six guarded tools (`relocateArtifact`, `reRunStepWithPinnedContext`, `issueCorrectionPrompt`, `revertUnrelatedFiles`, `markFailedWithStrandedArtifacts`, `cancelActiveStep`). Enforce two attempts per step and reject unsafe or out-of-contract requests.

### Milestone 9: Doctor agent instructions

Create doctor instructions that state the doctor is advisory/intermediary only, cannot write authoritative state directly, cannot mark completion, cannot bypass reconciliation, and must use only the 12-tool harness. The instructions must require escalation when ambiguity remains.

### Milestone 10: Facilitator integration

Integrate print-mode step execution and doctor escalation into the passive step/facilitator path. The child-process transport lives in a dedicated main data-layer adapter; IPC only validates requests and orchestrates the shared facilitator path. The facilitator records spawn recipes, assistant/session/message identifiers, log references/checksums, terminal results, anomalies, and interventions into the manifest and invokes reconciliation at every authority boundary, including the localhost HTTP API parity path.

Validation fixtures include a 100-case interrupted/restarted resume corpus for the 99% SC-002 threshold, a 20-case deterministic recovery corpus for the 90% SC-004 threshold, and parseable print-mode events that explicitly assert `assistantSessionId`, `messageId`, and `turnId` capture.

### Milestone 11: Nudge button plus `reconcileBranchToIntendedShape`

Expose a nudge action only for terminal-stuck sessions after automatic remediation fails. `reconcileBranchToIntendedShape` computes intended branch state from manifest, feature directory, step contracts, completion evidence, and trailers; applies guarded deterministic repairs only for unambiguous mismatches; and escalates all ambiguous or risky differences to the user.

## Post-Design Constitution Check

| Gate | Result |
|------|--------|
| Disk authority maintained | PASS: manifest, trailers, artifacts, failed markers, and audit records are authoritative; renderer remains derived. |
| IPC boundary maintained | PASS: manifest/reconcile/nudge/doctor payloads are factory-validated at main and renderer bridge exits. |
| Step lifecycle maintained | PASS WITH CONSTITUTION EXCEPTION: hook ownership remains, but step execution migrates to print-mode per FR-009/010 and the Run 13 transport exception. |
| Doctor boundedness maintained | PASS: exact 12-tool harness, two attempts per step, deterministic mutations only, no direct completion authority. |
| Recovery safety maintained | PASS: all mutating guarded tools re-read current disk truth, validate preconditions, audit before returning, and re-enter reconciliation. |
| Existing behavior preserved | PASS: resume reconstruction, maximum reached step advancement, navigation-loop prevention, failed-step resume, branch-null routing, and Windows-conditional behavior are explicit regression targets. |
| Dependency policy maintained | PASS: no new runtime dependency is planned. |

No unresolved constitution gate violation remains after the Run 13 transport and dogfood branch exceptions. The exception still must be documented in ADR/project guidance before implementation source changes.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Replace ACP step execution with print-mode command contract | FR-009 and FR-010 make print-mode unification and ACP retirement part of the architecture seed, and the constitution now scopes this to the Run 13 step-execution exception. | Keeping ACP for step execution would fail the feature's recovery and deterministic-execution requirements. |

No unresolved clarifications remain.
