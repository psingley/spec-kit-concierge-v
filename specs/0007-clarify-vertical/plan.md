# Implementation Plan: Run 7 Clarify Vertical

**Branch**: `spec/0007-clarify-vertical` | **Date**: 2026-05-29 | **Spec**: `specs/0007-clarify-vertical/spec.md`
**Input**: Feature specification from `specs/0007-clarify-vertical/spec.md`

## Summary

Implement the Clarify vertical after Specify completion. The vertical adds a real Clarify body, `copilot:clarify` streaming execution, Clarify question/answer state inside the existing `session` slice, same-session Ask Another, bounded malformed-question Re-ask, global malformation audit logging, in-place `spec.md` Clarifications persistence, Step Commit proof, and three Clarify visual-diff contracts.

The design reuses ADR-0010 for streaming mutations and ADR-0009 for listener-mediated Clarify Re-ask. No new runtime dependency, Redux slice, or step-stream shape is introduced.

## Technical Context

**Language/Version**: TypeScript in Electron main/preload/renderer, React renderer components, Redux Toolkit/RTK Query state and API patterns
**Primary Dependencies**: Existing Electron IPC bridge, ACP data layer, step lifecycle hooks, Step Contract factories, Redux Toolkit, RTK Query, Vitest, Playwright, visual-diff harness
**Storage**: Clarify answers are written in-place to the feature `spec.md` Clarifications section; malformation audit entries append to `userData/clarify-malformations.jsonl`
**Testing**: Vitest unit/contract tests, renderer component tests, listener tests, main IPC tests, Playwright e2e, visual-diff contracts
**Target Platform**: Desktop Electron app
**Project Type**: Single desktop app with main/preload/renderer boundaries
**Performance Goals**: Clarify happy path completes in under 3 minutes for a two-question session; stream emits exactly one terminal `done`; activity history remains capped at 256 entries
**Constraints**: Constitution v1.0.4, no ninth renderer slice, no runtime dependencies, Pure/Effect boundary, renderer no Node/Electron imports, WCAG 2.1 AA, no color-only state, no hidden malformed questions, no duplicate terminal stream events
**Scale/Scope**: One new vertical, five Clarify API operations, one streaming IPC handler, one session-slice state extension, three new visual screens, existing 24 visual screens non-regressed

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Layered Architecture**: PASS. Main owns ACP, git, filesystem, and `userData` writes; renderer reaches them through preload/RTK Query only.
- **Disk Is Truth**: PASS. Clarify completion is proven by in-place `spec.md` artifact validation plus `Concierge-Step: clarify:pass` Step Commit SHA.
- **ACP-Only Bound CLI**: PASS. `copilot:clarify` and Ask Another reuse the existing ACP supervisor/session path.
- **Factory-First Data Transformation**: PASS. Clarify question parsing, stream events, IPC requests, API responses, and malformation records pass through factories.
- **Scoped Functional Programming**: PASS. Pure parsing/validation stays in factories/selectors; effects stay in IPC handlers, data-layer modules, RTK Query, and listener middleware.
- **State Management**: PASS. Clarify UI state extends `session`; no ninth slice, no thunks, no component-level stream subscriptions.
- **UI Architecture**: PASS. `ClarifyStepContainer` owns data/API wiring; `ClarifyStep` is presentational.
- **Step Contract Strictness**: PASS. Clarify factory remains the strictest boundary and returns partial malformed-question results before escape.
- **Accessibility and Visual Fidelity**: PASS. Clarify states get explicit WCAG behaviors and visual-diff contracts.

## Project Structure

### Documentation

```text
specs/0007-clarify-vertical/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── clarify-api.md
├── spec.md
├── grill.md
└── fixtures/
    └── clarify-transcript.jsonl
```

### Source Code

```text
src/main/
├── ipc/
│   ├── copilotClarify.ts
│   ├── copilotClarify.factory.ts
│   └── stepStreamEvent.factory.ts
├── domain/factories/
│   └── clarify.factory.ts
├── data-layer/fs/
│   └── clarifyMalformationLog.ts
└── hooks/
    └── manifest.ts

src/preload/
└── index.ts

src/renderer/
├── api/
│   ├── clarify.endpoint.ts
│   ├── clarify.factory.ts
│   └── stepStreamEvent.ts
├── components/
│   ├── ClarifyStep.tsx
│   └── ClarifyStepContainer.tsx
├── listeners/
│   └── stepLifecycle.listener.ts
└── slices/
    └── session.ts

e2e/visual-diff/
├── contracts/
├── harness/screens.config.ts
└── artifacts/
```

**Structure Decision**: Keep Clarify in the existing main/preload/renderer architecture. Add files only at existing seam types. Do not introduce a `clarify` Redux slice.

## Phase 0: Outline & Research

Research resolves how to reuse the existing Specify streaming path, correct the Clarify artifact target, represent partial malformed results, and verify visual states. See `research.md`.

## Phase 1: Design & Contracts

Design artifacts:

- `data-model.md`: Clarify questions, choices, answers, malformed records, audit entries, stream summary.
- `contracts/clarify-api.md`: IPC/API request, stream, and completion payload contracts.
- `quickstart.md`: End-to-end verification path and visual-diff commands.

ADRs:

- Reuse `docs/adr/0010-streaming-mutation-pattern.md`.
- Reuse `docs/adr/0009-clarify-reask-listener.md`.
- No new ADR is required unless implementation discovers a new cross-run architectural decision.

## Phase 2: Task Planning Approach

Tasks must be vertical tracer bullets, not horizontal slicing:

1. Failing e2e for completing Clarify from a completed Specify session.
2. Failing factory/listener tests for in-place `spec.md` artifact, partial malformed rendering, and retry semantics.
3. Minimal main/preload/renderer stream path for initial questions.
4. Minimal session state and UI for answering/navigating questions.
5. Ask Another same-session path.
6. Malformed re-ask listener body, log writer, and factory re-validation.
7. Finish/commit path with `artifactPath`, `commitSha`, and parsed summary.
8. Visual contracts and non-regression verification.

## Complexity Tracking

No constitution violations are accepted. If implementation proposes a ninth slice, runtime dependency, component-level stream listener, or separate `clarifications.md`, stop and patch back to the plan.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| None | N/A | N/A |

## Progress Tracking

**Phase Status**:

- [x] Phase 0: Research complete
- [x] Phase 1: Design complete
- [x] Phase 2: Task planning approach complete
- [ ] Phase 3: Tasks generated
- [ ] Phase 4: Implementation
- [ ] Phase 5: Verification

**Gate Status**:

- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [ ] Tasks generated
