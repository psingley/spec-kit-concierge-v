# Quickstart: Run 7 Clarify Vertical

## Preconditions

- Branch: `spec/0007-clarify-vertical`.
- Specify can complete and mark Clarify pending.
- Copilot CLI ACP manifest verified against 1.0.55.
- Shared `StepStreamEvent` factory and generic `subscribeStepStream(channel)` are present.

## Development Loop

1. Write failing tests first for the next vertical behavior.
2. Implement the narrowest production change.
3. Run the focused test.
4. Repeat until the vertical path reaches completion proof.

## Focused Verification

```bash
npm test -- src/main/domain/factories/clarify.factory.test.ts
npm test -- src/renderer/listeners/stepLifecycle.listener.test.ts
npm test -- src/main/ipc/copilotClarify.test.ts
npm test -- src/renderer/components/ClarifyStep.test.tsx
```

## Visual Verification

```bash
npm run vd:generate-contract -- clarify-question
npm run vd:generate-contract -- clarify-ask-another
npm run vd:generate-contract -- clarify-malformed-reask
npm run vd:dev -- clarify-question
npm run vd:dev -- clarify-ask-another
npm run vd:dev -- clarify-malformed-reask
npm run vd:loop
```

Expected: the three Clarify contracts pass and the existing 24 screens remain pass.

## Final Verification

```bash
rm -rf .vite/build && npm run typecheck && npm run lint && npm test && npm run e2e
```

Expected: all commands pass, test count stays flat or increases from the current 804, and Clarify completion emits `artifactPath`, `commitSha`, and parsed questions/answers summary.
