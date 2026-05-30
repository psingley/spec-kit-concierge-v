# Implementation Plan: Run 9 Review & Evidence Vertical

**Branch**: `spec/0009-review-evidence` | **Date**: 2026-05-30 | **Spec**: `specs/0009-review-evidence/spec.md`

**Input**: Feature specification from `specs/0009-review-evidence/spec.md`; locked inputs from `grill.md`, `fixtures/pre-spec-probes.md`, `ROADMAP_DECISIONS.md`, ADR-0009, ADR-0010, ADR-0012, and `.specify/memory/constitution.md`.

**Note**: This plan stops after Spec Kit Phase 2 planning. `/speckit.tasks` creates implementation tasks.

## Summary

Run 9 adds the terminal Concierge Review surface and closes the evidence gaps needed for restart-proof review: a main-process `review:evidence` read capability aggregates committed `Concierge-Step:` trailers, on-disk artifacts, committed clarifications, app-owned Analyze reports, parsed tasks, and non-blocking warnings. The design keeps Review disk/git authoritative, keeps evidence bodies lazy-read on click, does not create a Review Step Commit or Review agent, and folds in the locked Run 8 fixes for optional Plan artifact discovery, Analyze report capture, 40-minute ACP stream silence semantics, and real StatusStep visual contracts.

## Technical Context

**Language/Version**: TypeScript 5.7 strict, Node 22+, React 18, Electron 33.

**Primary Dependencies**: Electron, React, Redux Toolkit + RTK Query, `@agentclientprotocol/sdk`, pino, `react-markdown` + `rehype-sanitize`; no runtime dependency additions for Run 9.

**Storage**: Disk/git are authoritative: `Concierge-Step:` trailers from git history, feature artifacts under `specs/0009-review-evidence/`, and app-owned evidence under `userData/evidence/{featureKey}/{sessionId}/analyze-report.md` plus `userData/evidence/{featureKey}/analyze-report-index.json`. Renderer session memory is not a Review evidence source.

**Testing**: Vitest + React Testing Library for co-located unit/component tests; Playwright/Electron and the existing visual-diff harness for end-to-end and visual contracts; `npm run typecheck`, `npm run lint`, `npm run test`, targeted `npm run vd:*` commands.

**Target Platform**: Electron desktop app, Windows shipping target with macOS developer support.

**Project Type**: Desktop application with main/renderer/preload split and IPC trust boundaries.

**Performance Goals**: Review summary loads metadata only; artifact/report bodies are read only after selection and use existing 512 KiB safe-read behavior. ACP stream silence checks remain 30-second interval based and emit one notice per silence marker.

**Constraints**: Disk-only Review evidence; no session-memory authority; new `review:evidence` main-process channel; no Review commit; no `copilot:review`; no defensive multi-pending warning; Analyze report is app-owned outside the spec artifact contract; Plan optional artifacts are additive disk discoveries; 40-minute ACP stream silence threshold; real StatusStep visual retrofit; no runtime deps; no ninth Redux slice.

**Scale/Scope**: One vertical app slice across main IPC/domain/data-layer, preload bridge, renderer RTK Query/components/selectors, passive-step infrastructure, visual harness, and two ADRs.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate Result | Plan Response |
|-----------|-------------|---------------|
| I. Layered Architecture | PASS | Review evidence aggregation and body reads live in main-process IPC/data-layer; renderer reaches them only through preload + RTK Query. |
| II. Disk Is Truth | PASS | Completion proof comes only from git trailers and disk artifacts. Renderer session state is not a Review evidence source. |
| III. ACP-Only Bound CLI | PASS | Analyze report capture reuses the existing ACP data-layer/session pipeline; no non-ACP CLI path is added. |
| IV. Factory-First Data Transformation | PASS | Add main IPC factory and renderer factory for `review:evidence` payloads; extend passive summary factories for optional/analyze report metadata. |
| V. Scoped Functional Programming | PASS | Pure parsers/assemblers receive injected disk facts; effectful filesystem/git reads remain in main data-layer/IPC files. |
| VI. State Management | PASS | Review uses RTK Query endpoints and local component selection state; no ninth Redux slice, no thunks, and no ad-hoc event bus. |
| VII. Step Lifecycle and Recovery | PASS | Analyze still commits with `--allow-empty`; Review writes no Step Commit. Optional Plan artifacts do not gate Plan completion. |
| VIII. Step Contracts | PASS | Plan optional discovery expands evidence without changing required Plan contract; Tasks detail reuses the existing parser contract. |
| XII/XIII. Smart/Dumb + Effects | PASS | `ReviewStepContainer` owns queries/selectors; `ReviewStep` and modal/list components receive props. Effects are limited to RTK Query lifecycle/subscriptions. |
| XIV. Accessibility | PASS | Review evidence lists, task modal, read failures, and passive silence notices use semantic buttons/dialog/status regions and keyboard paths. |
| XV. Structured Observability | PASS | IPC/body read/report capture paths log structured success/failure without raw tokens or PII. |
| XVI. Spec-kit Discipline | PASS | This plan creates Spec Kit Phase 0/1 artifacts and ADRs before implementation. |

No constitution violations require complexity justification.

## Project Structure

### Documentation (this feature)

```text
specs/0009-review-evidence/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── analyze-report-capture.md
│   ├── review-evidence-ipc.md
│   └── visual-contract-fixtures.md
└── tasks.md                  # created later by /speckit.tasks

docs/adr/
├── 0013-review-evidence-aggregation.md
└── 0014-analyze-report-capture.md
```

### Source Code (repository root)

```text
src/main/
├── data-layer/
│   ├── evidence/             # new app-owned Analyze report read/write helpers
│   └── git/gitCommand.ts     # existing trailer history reader reused
├── domain/
│   ├── reviewEvidence.ts     # new pure aggregation/parsing helpers
│   └── reviewEvidence.test.ts
├── hooks/
│   ├── manifest.ts           # Plan optional artifact entries/discovery support
│   └── *.test.ts
├── ipc/
│   ├── reviewEvidence.ts     # new review:evidence handler
│   ├── reviewEvidence.factory.ts
│   ├── reviewEvidence*.test.ts
│   ├── passiveStepIpc.ts     # optional artifact/analyze report summary
│   └── copilotPassiveAgent.ts
├── data-layer/acp/
│   ├── supervisor.ts         # fine-grained ACP update forwarding/report extraction
│   └── types.ts
└── index.ts                  # register review:evidence IPC

src/preload/
└── index.ts                  # expose concierge.review.evidence

src/renderer/
├── api/
│   ├── reviewEvidence.endpoint.ts
│   ├── reviewEvidence.factory.ts
│   └── reviewEvidence*.test.ts
├── components/
│   ├── ReviewStep.tsx
│   ├── ReviewStepContainer.tsx
│   ├── ReviewTaskModal.tsx
│   ├── WorkspaceContainer.tsx
│   ├── PassiveStep.tsx
│   └── StatusStep.tsx
├── listeners/
│   ├── transcriptCapture.listener.ts
│   └── transcriptCapture.listener.test.ts
└── slices/
    └── existing selectors/slices only; no review slice

e2e/visual-diff/harness/
└── screens.config.ts         # Review states and real passive StatusStep setup
```

**Structure Decision**: Keep the existing Electron main/preload/renderer layout and PascalCase smart/dumb component convention. Main owns Review evidence I/O and aggregation; renderer owns presentation through RTK Query and props-only components. No new state slice or runtime package is introduced.

## Phase 0: Research

Research is complete in `research.md`. All planning unknowns are resolved from the requested source inputs and current code probes:

- `review:evidence` is a new main-process read channel with summary and body-read request variants.
- Review evidence is disk/git authoritative; renderer session memory is excluded from the evidence model.
- Plan optional artifacts use manifest optional entries plus disk discovery for `data-model.md`, `quickstart.md`, and `contracts/*`.
- Analyze report capture writes app-owned disk evidence under `userData/evidence/{featureKey}/{sessionId}/analyze-report.md` and indexes it by feature directory plus Analyze commit SHA for restart lookup.
- Analyze report extraction is deterministic: prefer final assistant `agent_message_chunk` text from the completed prompt, fall back to the prompt transcript, and warn rather than inventing text when extraction is missing or ambiguous.
- Passive hang UX is redefined as 40 minutes of ACP stream silence, not runtime duration.
- Review and passive visual contracts must exercise real shipped component paths.

## Phase 1: Design & Contracts

Design artifacts are complete:

- `data-model.md` defines Review Evidence Summary, Step Proof, Artifact Evidence, Clarification Answer, Analyze Report Evidence, Task Detail, Pending Navigation State, Passive Silence Notice, and Visual Fixture State.
- `contracts/review-evidence-ipc.md` defines the `review:evidence` request/response and read-on-click body contract.
- `contracts/analyze-report-capture.md` defines app-owned Analyze report capture, storage, and passive summary integration.
- `contracts/visual-contract-fixtures.md` defines Review and passive visual fixture obligations.
- `quickstart.md` defines implementation and verification entry points.
- ADR-0013 and ADR-0014 record the durable architecture decisions for Review evidence aggregation and Analyze report capture.

## Implementation Approach

1. Add `review:evidence` main IPC and factories. The handler validates request payloads, reads trailer history through existing git helpers, discovers feature/app-owned evidence on disk, parses committed `spec.md` clarifications, reads task metadata through the existing tasks detail parser, and returns warnings instead of inventing completion.
2. Add lazy evidence body reads through the same `review:evidence` capability. Body requests resolve only IDs/paths returned by the summary and use safe read limits for both feature artifacts and app-owned Analyze reports.
3. Add app-owned Analyze report capture. The passive Analyze adapter extracts terminal assistant Markdown from prompt updates/transcripts, writes it to `userData/evidence/{featureKey}/{sessionId}/analyze-report.md`, records an app-owned index entry keyed by feature directory plus Analyze commit SHA, and includes metadata/no-diff explanation in passive and Review summaries.
4. Update Plan optional artifact discovery. The manifest distinguishes required files from optional discovered files, expands `contracts/*` by disk scan, and marks optional rows as non-gating in passive and Review evidence.
5. Implement Review UI. `ReviewStepContainer` calls RTK Query and existing selectors; `ReviewStep` renders completion proof, artifacts, warnings, clarifications, Analyze report status, tasks, read failures, and `Resume {pending}`. Per-task expansion reuses existing `ParsedTask` data.
6. Implement read-only and resume behavior. Completed non-Review steps get view-only mutation treatment while artifact/evidence inspection stays active; Review remains interactive. Resume targets a running step first, then first incomplete step in canonical order, with no multi-pending warning.
7. Update passive stream silence behavior. Fine-grained ACP updates reset the silence clock; the threshold becomes 40 minutes; copy changes to "still working / no recent output"; no auto-fail/cancel/retry is added.
8. Retrofit StatusStep and visual contracts. Passive visual contracts drive the real shipped `StatusStep` path and assert counts/tags, evidence subtitles, and artifact action behavior. Review visual contracts cover unavailable, partial, populated, read-only/bounce, resume target, selected evidence, read failure, and task-modal states.

## Post-Design Constitution Check

| Gate | Result |
|------|--------|
| Disk-Is-Truth maintained | PASS: Review summary and body reads originate from main-process disk/git aggregation only. |
| IPC boundary maintained | PASS: new evidence capability is typed and factory-validated on both sides of preload. |
| State inventory maintained | PASS: RTK Query endpoint plus local component state; zero Redux slice additions. |
| Step lifecycle maintained | PASS: Review does not commit; Analyze remains read-only with app-owned capture outside feature artifacts. |
| Dependency policy maintained | PASS: no new runtime dependency is planned. |
| Accessibility/test policy maintained | PASS: plan includes semantic Review/task modal surfaces, co-located tests, and visual contracts. |

No gate failures or unresolved clarifications remain.

## Complexity Tracking

No constitution violations. The only complexity is intentional cross-surface scope from locked Run 9 requirements: Review evidence aggregation, app-owned Analyze report capture, optional Plan discovery, passive silence semantics, and real visual contracts must land together because each affects whether Review evidence is trustworthy.
