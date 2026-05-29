# Run 8 ACP Transcript Findings

Pre-spec Action 1 used a detached disposable worktree at `/tmp/run8-acp-fixture` so real Plan/Tasks/Analyze agent writes could not mutate the Run 8 branch. The fixture feature was the pinned existing spec-kit feature directory `specs/0007-clarify-vertical`.

## Captured Fixtures

| Step | Fixture | ACP result | Parsed event shape |
|---|---|---:|---|
| Plan | `fixtures/plan-transcript.jsonl` | Timed out after 20 minutes without `session/prompt` result | `initialize`, `session/new`, `available_commands_update`, text chunks, thought chunks, `tool_call`, `tool_call_update` |
| Tasks | `fixtures/tasks-transcript.jsonl` | Manually stopped after repeated no-terminal streaming | `initialize`, `session/new`, `config_option_update`, `available_commands_update`, text chunks, thought chunks, `tool_call`, `tool_call_update`, `agent-exit` |
| Analyze | `fixtures/analyze-transcript.jsonl` | Reached `stopReason: "end_turn"` | `initialize`, `session/new`, text chunks, thought chunks, `tool_call`, `tool_call_update`, terminal prompt result |

## Findings

- ACP `session/update` is richer than assistant text. Passive-step UI should expect tool-call lifecycle events as first-class progress evidence, not only text chunks.
- Plan wrote real artifacts in the fixture worktree, including `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/clarify-api.md`, and `.github/copilot-instructions.md`.
- The Plan agent did update the Copilot context file between the SPECKIT markers as documented. Run 8 Plan validation must keep the context-file exception.
- Plan terminal shape was not captured: the agent continued streaming past artifact writes and the harness timed out before a `session/prompt` result. Do not assume terminal usage/cost metadata is always available from ACP.
- Tasks did not reach a clean terminal result in the controlled ACP probe before manual stop. It streamed config/command updates plus tool calls, but did not write a new `tasks.md` during the observed window.
- Analyze reached `stopReason: "end_turn"` and remained non-destructive. It repeatedly searched for prerequisite/spec/constitution files before producing the report text.
- No transcript exposed a reliable total token cost field in the captured ACP JSONL. Usage/cost display in Run 8 should be opportunistic, not required for pass state.
- Detached HEAD caused scripts to rely on the pinned `.specify/feature.json` override to resolve `specs/0007-clarify-vertical`. Run 8 should not infer active feature solely from branch name when `feature.json` is present.

## Contract Implications

- `done/pass` payloads should remain compact and not depend on full transcript replay.
- Passive-step status should include a visible long-running/no-terminal state and should avoid auto-fail; this supports the locked hang-notification decision.
- Artifact summaries should be read from disk after lifecycle validation, because ACP terminal text is not a sufficient artifact manifest.
- The implementation should capture terminal-event-once behavior explicitly in tests because real ACP sessions may stream repeated setup/tool activity before or instead of a terminal result.
