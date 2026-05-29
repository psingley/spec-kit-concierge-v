# Run 8 Passive-Step Termination Root Cause

Investigation date: 2026-05-29

Scope: empirical ACP rerun only. No source code was changed. The only repository change from this investigation is this findings document.

## Method

I reread the prior Run 8 fixture summary and transcripts:

- `specs/0008-ai-passive-steps/fixtures/transcript-findings.md`
- `specs/0008-ai-passive-steps/fixtures/plan-transcript.jsonl`
- `specs/0008-ai-passive-steps/fixtures/tasks-transcript.jsonl`
- `specs/0008-ai-passive-steps/fixtures/analyze-transcript.jsonl`

The prior fixture used a disposable worktree plus a pinned `.specify/feature.json` so detached HEAD could resolve `specs/0007-clarify-vertical`. I reused that shape with separate disposable worktrees:

- Plan: `/tmp/run8-acp-fixture-60-plan`
- Tasks: `/tmp/run8-acp-fixture-60-tasks`
- Analyze: `/tmp/run8-acp-fixture-60-analyze`

Each worktree had:

```json
{
  "feature_directory": "specs/0007-clarify-vertical"
}
```

Each ACP capture launched:

```bash
copilot --allow-all-tools --acp
```

Each prompt was given a 60-minute cap. Full annotated JSONL captures were written outside the repo:

- `/tmp/run8-acp-rootcause-output/plan-60-transcript.jsonl`
- `/tmp/run8-acp-rootcause-output/tasks-60-transcript.jsonl`
- `/tmp/run8-acp-rootcause-output/analyze-60-transcript.jsonl`

## Results

| Step | Terminal reached? | Wall time to terminal | Terminal signal | Expected artifact writes |
|---|---:|---:|---|---|
| Plan | yes | 38m 13.297s | `session/prompt` result with `stopReason: "end_turn"` | `plan.md` rewritten 3m 06s before terminal |
| Tasks | yes | 8m 27.343s | `session/prompt` result with `stopReason: "end_turn"` | `tasks.md` rewritten 3m 06s before terminal |
| Analyze | yes | 5m 48.916s | `session/prompt` result with `stopReason: "end_turn"` | no feature artifact writes |

All three steps reached a real ACP terminal event inside 60 minutes. None exceeded the cap.

## Per-Step Evidence

### Plan

Terminal event:

```json
{"ts":"2026-05-29T19:33:33.370Z","elapsedMs":2293297,"seq":717,"direction":"agent->client","method":"session/prompt","result":{"stopReason":"end_turn"}}
```

Last event before terminal:

```json
{"ts":"2026-05-29T19:33:31.812Z","elapsedMs":2291739,"seq":716,"direction":"agent->client","method":"session/update","params":{"sessionId":"4cef784f-01ab-40bc-ac60-7831bf8e7b94","update":{"content":{"text":".","type":"text"},"sessionUpdate":"agent_message_chunk"}}}
```

Artifact evidence:

- `specs/0007-clarify-vertical/plan.md` mtime: `2026-05-29T15:30:27-0400`
- Terminal timestamp: `2026-05-29T15:33:33.370-0400`
- Write occurred about 3m 06s before terminal.
- Worktree status after run also showed `.github/copilot-instructions.md`, `.specify/feature.json`, and `specs/0007-clarify-vertical/plan.md` modified.

The prior 20-minute cap would have been too short for this run. At 20 minutes this rerun was still in active workflow/tool activity; it did not terminal until 38m 13s.

### Tasks

Terminal event:

```json
{"ts":"2026-05-29T19:42:27.753Z","elapsedMs":507343,"seq":1590,"direction":"agent->client","method":"session/prompt","result":{"stopReason":"end_turn"}}
```

Last event before terminal:

```json
{"ts":"2026-05-29T19:42:26.614Z","elapsedMs":506204,"seq":1589,"direction":"agent->client","method":"session/update","params":{"sessionId":"f0a3bd53-d3ed-4079-b2ac-d4ed9164c0a3","update":{"content":{"text":".","type":"text"},"sessionUpdate":"agent_message_chunk"}}}
```

Artifact evidence:

- `specs/0007-clarify-vertical/tasks.md` mtime: `2026-05-29T15:39:21-0400`
- Terminal timestamp: `2026-05-29T15:42:27.753-0400`
- Write occurred about 3m 06s before terminal.
- Worktree status after run showed `.specify/feature.json` and `specs/0007-clarify-vertical/tasks.md` modified.

This rerun disproves the stronger "Tasks has no terminal event" claim for the controlled fixture. It reached the same `session/prompt` terminal result shape as Plan and Analyze.

### Analyze

Terminal event:

```json
{"ts":"2026-05-29T19:39:49.355Z","elapsedMs":348916,"seq":4490,"direction":"agent->client","method":"session/prompt","result":{"stopReason":"end_turn"}}
```

Last event before terminal:

```json
{"ts":"2026-05-29T19:39:48.715Z","elapsedMs":348276,"seq":4489,"direction":"agent->client","method":"session/update","params":{"sessionId":"06859638-4f29-437b-bbe9-1a9e360b1f35","update":{"content":{"text":".","type":"text"},"sessionUpdate":"agent_message_chunk"}}}
```

Artifact evidence:

- No `specs/0007-clarify-vertical` feature artifact was modified during Analyze.
- Worktree status after run showed only the intentionally pinned `.specify/feature.json` change.

Analyze was again a clean terminal case, consistent with the prior Run 8 fixture.

## Terminal Signal Characterization

For these ACP spec-kit passive steps, the real terminal signal is the ACP `session/prompt` JSON-RPC result. In all three reruns, the result shape was:

```json
{"stopReason":"end_turn"}
```

`agent-exit` is not the correct normal completion signal. It can appear when the process is disposed, cancelled, or externally killed, but it is not the semantic "the prompt completed" signal. The prior Tasks fixture's `agent-exit` after manual stop was therefore not proof of clean task completion; the 60-minute rerun shows the actual clean terminal shape.

## Verdict

The Run 8 "no terminal event" conclusion was not a proven Copilot CLI defect. For this fixture, it was a too-short or interrupted capture artifact:

- Plan needed 38m 13s and therefore could not prove terminal behavior under a 20-minute cap.
- Tasks reached a clean terminal result in 8m 27s when allowed to run normally.
- Analyze reached a clean terminal result in 5m 49s, matching the old clean result.

The user's hypothesis is supported: heavy Plan/Tasks steps can need more wall-clock than the previous impatient probe allowed, and the normal terminal event exists.

## passiveStepIpc.ts Assessment

`src/main/ipc/passiveStepIpc.ts` currently waits for `agentAdapter(...)` to resolve before running `afterHook(...)`, then emits `done/pass` only after lifecycle/artifact validation and Step Commit proof:

```ts
await agentAdapter({ ...request, step, sessionId, featureDir, signal: controller.signal });
const after = await afterHook(hookContext);
if (!after.ok || after.commit?.commitSha === undefined) {
  throw new Error(after.ok ? 'missing commit sha' : after.escapeHatchReason);
}
terminal({ type: 'done', step, sessionId, status: 'pass', commitSha: after.commit.commitSha, summary: summaryForStep(step) });
```

That is directionally correct because the app should not mark a passive step complete merely because Copilot stopped talking. Disk validation and Step Commit proof are still the product completion contract.

But the implementation should not treat "no terminal event" as the normal production model. The adapter already awaits `session.prompt(...)`, and this investigation shows `session.prompt(...)` can return a real terminal result for Plan, Tasks, and Analyze when timeout policy is generous enough. Disk-is-truth is correct as the acceptance gate; ACP terminal is still the correct lifecycle gate that says the agent turn is over and the after-hook may safely run.

## Recommendation

Production completion detection should use a two-gate model:

1. Wait for the ACP `session/prompt` result as the agent-turn terminal signal.
2. After that terminal signal, validate disk artifacts/remediation and write/read the Step Commit before emitting product `done/pass`.

Recommended timeout policy:

- Do not use a 20-minute hard failure for Plan/Tasks.
- Use at least a 60-minute per-step watchdog for Plan and Tasks.
- Analyze can use the same 60-minute watchdog for simplicity and consistency, or a shorter soft-warning threshold with the same hard cap.
- Add progress/no-output warnings before timeout, but do not fail while ACP is still streaming real `session/update` activity.
- If a step exceeds 60 minutes, report `exceeded 60 min` with the last ACP events and artifact mtimes. Do not label it "hung" without evidence.

Recommended app behavior:

- Honor `session/prompt` result with `stopReason: "end_turn"` as the normal ACP completion signal.
- Keep disk/artifact validation and Step Commit proof as required product completion gates.
- Preserve the one-terminal-event guard in `passiveStepIpc.ts`.
- Surface long-running state in UI, but avoid implying Copilot has no terminal event unless a generous cap has actually expired.
