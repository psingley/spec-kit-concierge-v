# Run 7 Clarify Vertical - Specify Prompt

Create `specs/0007-clarify-vertical/spec.md` for the Clarify Vertical. Use the existing project constitution and spec-kit templates. This is a product specification, not implementation code.

## Required Inputs

- Branch: `spec/0007-clarify-vertical`.
- Base reference: `c21bcc0086785a65d30848b897c11d4011f113c5`.
- Grill decisions and inheritance audit: `specs/0007-clarify-vertical/grill.md`.
- Constitution: `.specify/memory/constitution.md`, especially Principle VIII strict Step Contracts and the eight-slice state constraint.
- Streaming pattern: `docs/adr/0010-streaming-mutation-pattern.md`.
- Re-ask listener pattern: `docs/adr/0009-clarify-reask-listener.md`.
- Copilot ACP transcript fixture: `specs/0007-clarify-vertical/fixtures/clarify-transcript.jsonl`.
- Pre-spec refactor already landed on this branch: shared `StepStreamEvent` factory and generic preload `subscribeStepStream(channel)`.
- Visual-fidelity standing discipline: all new user-visible states need explicit visual contracts and must not regress the existing 24 screens.

## Locked User Decisions

1. Re-ask context: malformed question text, position, category, and well-formed question ids/text as read-only context.
2. Partial rendering: render well-formed and visibly malformed cards simultaneously.
3. Answer retention: preserve answers keyed by stable question ids through rewrite cycles.
4. Retry semantics: allow 3 actual rewrite attempts; exhaust on the 4th failed validation. The current `>= 3` exhaust-on-third bug must be fixed.
5. `askAnother`: reuse the same ACP session.
6. Commit timing: only after all questions have selected choices, factory validates, and Step Commit SHA is returned.
7. Short-answer contract: persisted agent output need only have choices; UI always supplies the textarea.
8. Malformation log: write a global audit stream at `userData/clarify-malformations.jsonl`.
9. Clarify state home: extend the existing `session` slice; no ninth slice.
10. `done/pass` payload: include `artifactPath`, `commitSha`, and parsed questions/answers summary.
11. Navigation during re-ask: allow navigation and answering unaffected questions; disable Finish and only the in-flight malformed card.
12. Visual contracts: require exactly these three Clarify visual-diff screens: `clarify-question`, `clarify-ask-another`, `clarify-malformed-reask`.

## Scope

Specify the user-facing Clarify vertical after Specify completes:

- Clarify body UI: `ClarifyStep.tsx` and `ClarifyStepContainer.tsx`.
- Main-process streaming `copilot:clarify` handler and transport event `copilot:clarify:event`.
- Preload bridge reuse of generic step stream subscription.
- Renderer RTK Query endpoint and `clarifyApi` behaviors.
- `session` slice extension for Clarify questions, answers, active question, ask-another, and re-ask state.
- `clarify.factory.ts` hardening and seven-case test restructure.
- Listener body completion: malformed action dispatches ACP rewrite, preserves context, re-validates through the factory, and applies retry semantics.
- Malformation log writer.
- Finish/commit flow through `afterClarifyHook`, Step Contract validation, and Step Commit trailer.
- Three Clarify visual contracts plus non-regression of existing 24 visual screens.

## Non-Goals

- No ninth Redux slice.
- No new runtime dependencies.
- No Plan/Tasks/Analyze/Review bodies.
- No JIRA sync UI beyond final submission artifacts later in the pipeline.
- Do not revisit the locked decisions from `grill.md`.

## Acceptance Emphasis

The spec must be concrete enough for `/speckit.clarify`, `/speckit.plan`, `/speckit.tasks`, `/speckit.analyze`, and `/speckit.implement` to produce a TDD-friendly vertical plan. Requirements must distinguish UI behavior, IPC/ACP behavior, factory strictness, disk/audit behavior, accessibility/WCAG expectations, visual-diff contracts, and exact completion proof.
