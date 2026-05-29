# Implementation Plan: Run 8 AI-Passive Steps Vertical

**Branch**: `spec/0008-ai-passive-steps` | **Date**: 2026-05-29 | **Spec**: `specs/0008-ai-passive-steps/spec.md`

**Input**: Feature specification from `specs/0008-ai-passive-steps/spec.md`

## Summary

Run 8 ships the passive watching vertical for Plan, Tasks, and Analyze after Specify and Clarify are complete. The implementation extends the existing Electron/Redux/RTK Query step pipeline with three passive step bodies, one shared `StatusStep` rendering surface, compact validated evidence manifests, lazy artifact viewing through the shipped plural `artifacts:read` channel, task detail parsing, visible hang notification, and strict Plan/Tasks/Analyze Step Contract factories.

The design reuses ADR-0008 for step lifecycle states, ADR-0009 for listener-owned recovery/effect coordination, and ADR-0010 for streaming mutations with progress events plus exactly one terminal `done`. New design decisions are captured in ADR-0011 (`StatusStep` typed row union) and ADR-0012 (`registerPassiveStepIpc` helper for Plan/Tasks/Analyze only).

## Technical Context

**Language/Version**: TypeScript strict mode with `noUncheckedIndexedAccess`; React 18 function components in renderer; Electron main/preload/renderer split.

**Primary Dependencies**: Existing Electron, React, Redux Toolkit, RTK Query, Vitest, React Testing Library, Playwright, pino, and `@agentclientprotocol/sdk@0.22.1`; Run 8 adds exactly `react-markdown`, `rehype-sanitize`, and `remark-gfm` for markdown rendering. No `rehype-raw`, syntax highlighting, icon, UI, or animation runtime dependency is added.

**Storage**: Disk is truth through git history, `Concierge-Step:` trailers, feature-directory artifacts, `.specify/feature.json` active feature pin when present, `userData/in-flight/*` markers, local logs, and local ACP transcripts. Renderer state is a derived cache only.

**Testing**: Vitest + React Testing Library for unit/component behavior, Playwright visual/e2e harness for Electron, recorded ACP transcript fixtures for protocol behavior, fake timers for hang notification, and the repo scripts `npm run lint`, `npm run typecheck`, `npm run test`, `npm run e2e`, and `npm run test:coverage`.

**Target Platform**: Electron desktop application, v1 Windows packaging with macOS/Linux dev-from-source behavior unchanged.

**Project Type**: Desktop application with main-process IPC/data-layer boundaries and React renderer.

**Performance Goals**: Artifact bodies are not fetched before explicit user action; text/markdown/code artifacts over 512 KiB render as metadata-only evidence; passive status screens remain responsive during long ACP streams; hang notification appears after at least 20 minutes of ACP silence within the existing 30-second polling cadence; activity history remains capped at 256 entries.

**Constraints**: Preserve canonical step order `specify -> clarify -> plan -> tasks -> analyze -> review`; no Review/JIRA implementation; no ninth renderer slice; extend only the existing session/pipeline state for passive steps; Plan requires `plan.md` and `research.md` and may summarize optional `data-model.md`, `contracts/*`, and `quickstart.md`; Tasks requires `tasks.md`; Analyze validates/remediates only `spec.md`, `plan.md`, and `tasks.md`, allows no-diff empty Step Commit, and must not require or create `analyze.md`; terminal stream payloads carry compact manifests and `commitSha`, not full artifact bodies; use shipped plural `artifacts:read`.

**Scale/Scope**: Three passive steps, three pipeline IPC capabilities (`copilot:plan`, `copilot:tasks`, `copilot:analyze`), shared passive IPC helper, shared presentational `StatusStep`, artifact viewer, task viewer/detail API, markdown renderer replacement, stricter Plan/Tasks/Analyze factories, visible hang notification, 10 new visual screens, and no regression to the inherited 27 visual screens.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Layered Architecture | Renderer components use IPC/RTK Query only; main owns filesystem, git, ACP, hooks, artifact reads, and task parsing. | PASS |
| II. Disk Is Truth | Step completion and artifact validity come from disk, factory validation, and Step Commit trailers, not ACP prose or renderer memory. | PASS |
| III. ACP-Only Bound CLI | Passive step execution stays behind the existing ACP data-layer and pipeline IPC surface; no renderer or non-ACP CLI spawning. | PASS |
| IV. Factory-First Data Transformation | New IPC, renderer-entry, artifact, task-detail, and Step Contract payloads pass through factories with seven-case floors where required. | PASS |
| VI. State Management | Passive state extends existing slices and RTK Query; no ninth slice or component-owned stream subscription. | PASS |
| VII. Step Lifecycle and Recovery | `before_<step>` and `after_<step>` remain authoritative; Escape Hatch handles failure/cancel; hang notification never auto-fails. | PASS |
| VIII. Step Contracts | Plan, Tasks, and Analyze strict contracts validate artifact/remediation boundaries before pass; Analyze removes the `analyze.md` drift. | PASS |
| XIII. React Effects Discipline | Components remain declarative; subscriptions live in RTK Query/listeners; effects only for dialog focus/layout needs. | PASS |
| XIV. Accessibility | Status rows, evidence pills, viewers, task details, and hang notification require keyboard, focus, accessible names, live regions, and no color-only state. | PASS |
| XV. Structured Observability | IPC outcomes, ACP turns, lifecycle transitions, errors, hang notifications, and transcript references are logged/activity-visible. | PASS |
| XVI. Spec-kit/TDD Discipline | Implementation must use vertical tracer bullets: one failing public-behavior test, one minimal implementation, then repeat. | PASS |

### State Ownership Map

| Data | Owner |
|---|---|
| Step lifecycle state (`not_available`, `pending`, `complete`) | Existing `steps` slice per ADR-0008 |
| Passive pipeline attempt state, progress rows, terminal summary, task detail selection, hang notice visibility | Existing `session.pipelines.<step>` extension |
| Artifact and task-detail request results | RTK Query caches keyed by repo/branch/path or task id |
| Stream subscription lifecycle | RTK Query `onCacheEntryAdded` plus preload unsubscribe per ADR-0010 |
| Hang detection timer/dedupe | Existing listener middleware path (`transcriptCapture.listener.ts` / cataloged listener ownership), dispatching public actions |
| Activity entries and busy/current copy | Existing `activity` slice with 256-entry cap |
| Active feature directory | Disk read from `.specify/feature.json` at the main/data-layer boundary; not trusted as long-lived renderer truth |

## Project Structure

### Documentation (this feature)

```text
specs/0008-ai-passive-steps/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contract-reconciliation.md
├── grill.md
├── spec.md
├── contracts/
│   ├── artifact-read.md
│   ├── passive-step-streaming.md
│   ├── step-contracts.md
│   ├── task-detail.md
│   └── visual-contracts.md
└── fixtures/
    ├── analyze-transcript.jsonl
    ├── markdown-render-findings.md
    ├── plan-transcript.jsonl
    ├── tasks-transcript.jsonl
    └── transcript-findings.md
```

### Source Code (repository root)

```text
src/
├── main/
│   ├── data-layer/
│   │   ├── acp/
│   │   ├── fs/
│   │   └── git/
│   ├── domain/factories/
│   │   ├── plan.factory.ts
│   │   ├── tasks.factory.ts
│   │   └── analyze.factory.ts
│   ├── hooks/
│   │   ├── afterPlan.hook.ts
│   │   ├── afterTasks.hook.ts
│   │   ├── afterAnalyze.hook.ts
│   │   └── manifest.ts
│   └── ipc/
│       ├── artifacts.ts
│       ├── copilotPlan.ts
│       ├── copilotTasks.ts
│       ├── copilotAnalyze.ts
│       ├── passiveStepIpc.ts
│       └── tasksDetail.ts
├── preload/
│   └── index.ts
└── renderer/
    ├── api/
    │   ├── artifacts.endpoint.ts
    │   ├── copilotPassive.endpoint.ts
    │   └── tasksDetail.endpoint.ts
    ├── components/
    │   ├── AnalyzeStep.tsx
    │   ├── AnalyzeStepContainer.tsx
    │   ├── ArtifactViewer.tsx
    │   ├── PlanStep.tsx
    │   ├── PlanStepContainer.tsx
    │   ├── StatusStep.tsx
    │   ├── TaskViewer.tsx
    │   ├── TasksStep.tsx
    │   └── TasksStepContainer.tsx
    ├── listeners/
    │   ├── stepLifecycle.listener.ts
    │   └── transcriptCapture.listener.ts
    ├── slices/
    │   └── session.ts
    └── components/Markdown.tsx

docs/adr/
├── 0011-status-step-row-union.md
└── 0012-register-passive-step-ipc.md

e2e/
└── visual-diff/harness/screens.config.ts
```

**Structure Decision**: Keep the existing Electron single-project layout. Smart containers remain under `src/renderer/components/` and are the only new components that use store hooks or RTK Query hooks. Presentational step/viewer components receive props only. Main-process IPC and Step Contract logic stays in `src/main/`; renderer never imports Electron, Node built-ins, ACP, git, or filesystem code.

## Phase 0: Research

Research is complete in `research.md`, using `spec.md`, `grill.md`, `fixtures/transcript-findings.md`, `fixtures/markdown-render-findings.md`, `contract-reconciliation.md`, the constitution, `ROADMAP_DECISIONS.md`, and ADRs 0008/0009/0010.

Resolved decisions:
- Reuse ADR-0010 `StepStreamEvent` for passive steps with compact terminal manifests.
- Add the ADR-0011 `StatusStep` typed artifact/milestone/task/remediation/hang row union as a rendering model only.
- Add `registerPassiveStepIpc` for Plan/Tasks/Analyze only.
- Keep `artifacts:read`, lazy artifact read on click, and 512 KiB metadata-only guard.
- Add only `react-markdown`, `rehype-sanitize`, and `remark-gfm`.
- Rewrite Analyze contract away from `analyze.md` to bounded remediation/no-diff pass.
- Use existing `session` slice and listener middleware; no new slice.
- Add exactly 10 new visual screens.

## Phase 1: Design and Contracts

Design outputs:
- `data-model.md` defines passive attempts, stream events, status row union, artifact evidence, task details, Analyze remediation, hang notification, active feature pin, and validations.
- `contracts/passive-step-streaming.md` defines `copilot:plan`, `copilot:tasks`, `copilot:analyze`, event semantics, and exactly-one-terminal behavior.
- `contracts/artifact-read.md` defines `artifacts:read` lazy read, kind discriminator, size guard, and metadata-only behavior.
- `contracts/task-detail.md` defines `tasks:detail` parsing and validation.
- `contracts/step-contracts.md` defines Plan/Tasks/Analyze Step Contracts and the Analyze drift migration.
- `contracts/visual-contracts.md` enumerates the exact 10 new visual screens.
- `quickstart.md` defines the TDD implementation sequence and validation commands.
- `docs/adr/0011-status-step-row-union.md` and `docs/adr/0012-register-passive-step-ipc.md` capture the two new architecture decisions.

## Phase 2: Implementation Strategy for `/speckit.tasks`

Run 8 implementation must use vertical tracer bullets, not horizontal batches. Each bullet starts with one failing public-interface test, then the minimum implementation to pass, then refactor only while green.

1. Passive Plan tracer: product/e2e path starts Plan after Clarify, streams progress, validates required Plan artifacts, summarizes optional artifacts and Copilot context exception, emits one terminal pass with `commitSha`, then expands `plan.factory` seven-case coverage one RED/GREEN case at a time.
2. Passive Tasks tracer: starts Tasks after Plan, streams progress, validates `tasks.md`, exposes parsed task id/title, then grows task detail fields and `tasks.factory` seven-case coverage one RED/GREEN case at a time.
3. Passive Analyze tracer: starts Analyze after Tasks, validates no-diff empty pass without `analyze.md`, then grows allowed remediation, disallowed-target rejection, and `analyze.factory` seven-case coverage one RED/GREEN case at a time.
4. Artifact viewer tracer: clicking an evidence pill invokes `artifacts:read` lazily, renders markdown safely, then grows oversized/binary/image/PDF metadata cases.
5. Markdown renderer tracer: hostile raw HTML is stripped while GFM tables, task lists, fenced code classes, links, blockquotes, nested lists, headings, inline code, and plain text remain readable.
6. Hang notification tracer: fake-timer 20-minute ACP silence emits one visible soft notification with Cancel/Restart guidance and leaves the step in progress.
7. Duplicate terminal tracer: second terminal result is ignored/reported without changing the first accepted outcome.
8. Visual tracer: add exactly 10 Run 8 screens and verify inherited 27 screens remain stable.

## Complexity Tracking

No constitution violations are planned. No unresolved clarification markers remain.

## Post-Design Constitution Check

PASS. The design artifacts preserve the eight-slice lock, disk-as-truth, strict factories, lifecycle hooks, ADR-0010 streaming, ADR-0008 step states, ADR-0009 listener-owned cross-domain coordination, and Run 8 locked decisions. ADR-0011 explicitly keeps status rows orthogonal to step lifecycle states; ADR-0012 limits the shared IPC helper to Plan/Tasks/Analyze and forbids broad Specify/Clarify refactoring.
