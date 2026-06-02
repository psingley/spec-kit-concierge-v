# Implementation Plan: Send to JIRA from Review

**Branch**: `017-send-jira-button` | **Date**: 2026-06-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/0015-send-jira-button/spec.md`

**Note**: This plan stops after Spec Kit Phase 2 planning. `/speckit.tasks` creates implementation tasks.

## Summary

Run 15 turns Review into a safe JIRA submission surface. The renderer adds a gated **Send to JIRA** terminal action that reuses the app's shared modal host for a dry-run preview and in-flight progress, while main-process application code deterministically parses `spec.md` + `tasks.md`, renders the Jira payloads, writes canonical submission records under the feature directory, and drives one ACP-backed Copilot turn per node so the app never calls Atlassian directly.

## Technical Context

**Language/Version**: TypeScript 5.7 strict, Node 22+, React 18, Electron 33.

**Primary Dependencies**: Electron IPC/preload bridge, Redux Toolkit + RTK Query, existing ACP `BoundCLISupervisor`, pino logging, existing Atlassian MCP config/auth modules; no new runtime dependency planned.

**Storage**: Disk truth only — feature artifacts under `specs/0015-send-jira-button/`, pinned Jira config at `.specify/extensions/concierge-jira/jira-config.yml`, and canonical per-node records under `specs/0015-send-jira-button/jira-submission-state/`.

**Testing**: Vitest for pure modules, factories, IPC handlers, renderer endpoints, and component tests; existing Playwright/Electron and visual-diff harness remain available for terminal Review regression coverage; repository gates are `npm run lint`, `npm run typecheck`, and `npm run test`.

**Target Platform**: Electron desktop app, with macOS dev workflow and Windows shipping target.

**Project Type**: Desktop application with main/preload/renderer split and typed IPC boundaries.

**Performance Goals**: Preview performs only local parse + record reads and must not make Jira create calls before confirmation; progress updates are incremental per node; resume rehydrates directly from disk without replaying completed creates.

**Constraints**: Review-step action only; deterministic parent-first Epic -> Story -> Subtask hierarchy; one bounded ACP-backed Copilot turn per node; no direct Atlassian calls; standard `.modal-veil` overlay experience; dedicated Jira Redux slice for submission state; create-only v1 (no status sync); new boundary payloads require factory coverage.

**Scale/Scope**: One vertical feature across main data-layer parsing/records/runner, IPC/preload bridge, renderer RTK Query + Review UI + modal host, and submission-state persistence for restart-safe resume.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate Result | Plan Response |
|-----------|-------------|---------------|
| I. Layered Architecture | PASS | Jira preview, payload rendering, state-record I/O, and Copilot turns live in main-process data-layer + IPC. Renderer reaches them only through preload + RTK Query. |
| II. Disk Is Truth | PASS | Eligibility, preview warnings, progress, and resume derive from `spec.md`, `tasks.md`, `jira-config.yml`, and `jira-submission-state/` on disk. |
| III. Bound CLI and Step Transport | PASS | The feature reuses ACP-backed Copilot sessions for bounded turns and does not add a new print-mode exception or direct Atlassian client. |
| IV. Factory-First Data Transformation | PASS | Add main IPC and renderer factories for preview, submit ack, and stream events before any consumer sees the data. |
| V. Scoped Functional Programming | PASS | Parsing, DAG ordering, payload hashing, and record normalization stay pure; ACP prompts, filesystem writes, and logging stay in effect files. |
| VI. State Management | PASS | RTK Query owns preview and submit/resume IPC; the dedicated `jira` slice stores submission state while the existing `ui` slice stores only dialog visibility/mode. |
| VII. Step Lifecycle and Recovery | PASS | Review remains a terminal human action and does not create a new step commit path; resume uses persisted submission records only. |
| X. Observer-Only | PASS | Every Jira create call flows through the Bound CLI; the app prepares payloads, reads records, and verifies outcomes only. |
| XIV. Accessibility | PASS | Preview/progress/result flows reuse the app's modal pattern with semantic dialogs, focus return, and live status/error copy. |

No constitution violations require complexity justification.

## Project Structure

### Documentation (this feature)

```text
specs/0015-send-jira-button/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── jira-preview-ipc.md
│   ├── jira-submission-stream.md
│   └── jira-submission-state.md
└── tasks.md                  # created later by /speckit.tasks
```

### Source Code (repository root)

```text
src/main/
├── data-layer/
│   ├── jiraSubmission/
│   │   ├── config.ts
│   │   ├── parser.ts
│   │   ├── preview.ts
│   │   ├── payloads.ts
│   │   ├── records.ts
│   │   ├── runner.ts
│   │   └── *.test.ts
│   ├── acp/
│   │   ├── supervisor.ts
│   │   ├── protocol.ts
│   │   └── types.ts
│   └── mcp-config/
│       └── copilotMcp.ts
├── ipc/
│   ├── jiraSubmission.ts
│   ├── jiraSubmission.factory.ts
│   ├── jiraSubmission.factory.spec.ts
│   └── jiraSubmission.test.ts
└── index.ts

src/preload/
└── index.ts

src/renderer/
├── api/
│   ├── jiraSubmission.endpoint.ts
│   ├── jiraSubmission.factory.ts
│   ├── jiraSubmission.factory.spec.ts
│   └── jiraSubmission.endpoint.test.ts
├── components/
│   ├── ReviewStepContainer.tsx
│   ├── ReviewStep.tsx
│   ├── ModalHost.tsx
│   ├── JiraSubmissionPreviewModal.tsx
│   ├── JiraSubmissionProgressModal.tsx
│   ├── JiraSubmissionPreviewModal.test.tsx
│   └── JiraSubmissionProgressModal.test.tsx
└── slices/
    ├── ui.ts
    ├── ui.selectors.ts
    ├── jira.ts
    └── auth.selectors.ts
```

**Structure Decision**: Keep the existing Electron main/preload/renderer split. Main owns deterministic preview generation, submission-state persistence, and the ACP-backed bound-CLI turn loop. Renderer reuses Review smart/dumb boundaries, RTK Query, a dedicated Jira submission slice, and the shared modal host instead of introducing a standalone JIRA screen.

## Phase 0: Research

Research is complete in `research.md`. All planning unknowns are resolved from current repo probes and the authoritative Jira docs:

- Review already has the correct smart/dumb split and shared overlay modal infrastructure.
- Atlassian readiness already projects through the auth slice and does not block workspace entry, only Review-step submission gating.
- The deterministic hierarchy comes from `spec.md`, `tasks.md`, and `.specify/extensions/concierge-jira/jira-config.yml`.
- Submission records belong under the feature directory and must carry payload hash + canonical idempotency label for resume safety.
- Jira create calls remain Bound-CLI-only; the feature uses ACP-backed bounded turns and not the retired per-ticket filer shell-out.

## Phase 1: Design & Contracts

Design artifacts are complete:

- `data-model.md` defines the eligibility gate, preview nodes, warnings, canonical submission record, run snapshot, and stream event model.
- `contracts/jira-preview-ipc.md` defines the dry-run preview/read contract.
- `contracts/jira-submission-stream.md` defines submit/resume ack plus progress/done event streaming.
- `contracts/jira-submission-state.md` locks the canonical on-disk record shape and invariants.
- `quickstart.md` defines implementation order and verification commands.

## Implementation Approach

1. Add pure main-process JIRA submission modules under `src/main/data-layer/jiraSubmission/`. Parse `spec.md` and `tasks.md`, load the pinned Jira config, derive canonical idempotency ids/labels, render deterministic issue bodies, and read/write normalized submission records with atomic tmp-and-rename semantics.
2. Add preview/read IPC. `jira:preview` validates the request, resolves the feature directory from the repository root, computes the eligibility gate from existing Atlassian auth truth plus Review evidence, and returns parent-first nodes, warnings, and the latest run snapshot built from disk records.
3. Add deterministic submission orchestration. `jira:submit` starts or resumes from the preview DAG, opens one ACP-backed Copilot session through the customized concierge-jira extension-agent contract, executes one bounded create turn per node from an app-rendered payload, re-reads the node record from disk after each turn, threads parent issue keys only after `verified` or `duplicate`, and halts on the first non-advanceable node.
4. Add trust-boundary factories on both sides of preload. Main-side IPC factories validate preview and submit payloads; renderer factories validate preview responses, submit ack payloads, and streaming progress/done events before the UI consumes them.
5. Reuse the shared modal host. Extend the `ui` slice only for JIRA preview/progress dialog visibility and mode, mount new modal components from `ModalHost`, and store submission flow state in a dedicated `jira` slice fed by RTK Query and stream events.
6. Update Review UI. `ReviewStepContainer` reads Review evidence and Atlassian status, shows or disables **Send to JIRA**, opens the preview modal, starts/resumes the mutation, and surfaces created/adopted issue keys, links, halt state, and remaining work in the progress modal and Review panel.
7. Add coverage and regression proof. Unit-test parsers, hashing, records, and runner sequencing; factory-test every new boundary; integration-test preview/submit IPC and Review-step modal behavior; add audit/logging proof that creation is Bound-CLI-only with no direct Atlassian app calls; keep lint/typecheck/test green.

## Post-Design Constitution Check

| Gate | Result |
|------|--------|
| Disk truth maintained | PASS: preview and resume rebuild from feature artifacts plus `jira-submission-state/` records on disk. |
| IPC boundary maintained | PASS: preview and submit streaming are factory-validated in both main and renderer before use. |
| Bound-CLI-only Jira calls maintained | PASS: the app owns orchestration but every Jira create call still goes through the customized concierge-jira extension-agent contract on Copilot/ACP. |
| State inventory maintained | PASS: RTK Query + minimal `ui` slice flags + dedicated `jira` submission slice; no unrelated thunk layer. |
| Accessibility/test policy maintained | PASS: modal dialogs, warnings, progress, and halt states are planned with semantic UI and targeted renderer/main coverage. |

No gate failures or unresolved clarifications remain.

## Complexity Tracking

No constitution violations. The feature is intentionally cross-surface because the safety requirements only hold when preview, deterministic submission, persisted records, and Review-step resume are designed together.
