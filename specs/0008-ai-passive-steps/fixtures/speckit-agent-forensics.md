# Spec-kit Agent Forensics: Run 7 + Run 8

Date: 2026-05-29  
Scope: forensic read of existing git history, ACP transcript fixtures, Copilot CLI process logs, and codex companion job logs. No new spec-kit agent runs were started for this report.

## Executive Verdict

The empirical pattern does **not** support treating passive steps as broken just because they lack a fast terminal prompt result. Run 7 and Run 8 live Copilot CLI sessions routinely ran for minutes, shut down cleanly, and wrote/validated artifacts near their matching commit windows. The captured Run 8 ACP fixtures show the real hazard: Plan and Tasks can keep emitting progress after useful artifact work, and the harness can time out or SIGTERM before a `session/prompt` terminal result appears.

The production app should call a step complete only after the ACP prompt result reports `stopReason: "end_turn"` **and** post-step artifact/lifecycle validation succeeds, or after an app-owned step terminal event is produced from that validation. It should not require usage/cost metadata. It should not auto-fail on long runtime if stream activity continues.

## Evidence Inventory

- Git commit windows were anchored from:
  - Run 7: `git log --oneline --format='%H %ci %s' 5fca4d8..6572861`
  - Run 8: `git log --oneline --format='%H %ci %s' 6572861..a47bb50`
- Copilot CLI logs are flat files under `~/.copilot/logs/`, not per-session directories. Session IDs appear inside files as `Registering foreground session` or `Created ACP session`. Example Run 7-like foreground session start: `/Users/psingley/.copilot/logs/process-1780060623749-96695.log:61`; graceful shutdown: same file `:219-221`.
- The codex companion job log directory did **not** contain stable literal `copilot --agent speckit.<step>` command lines for the completed Run 7/8 executions. It did contain current investigation chatter and one other companion job, so command-line-level attribution from those logs is incomplete. Therefore, live Run 7/8 step mapping below is timestamp-correlated against commit windows, and agent-specific labels are used only when the Copilot log itself names the custom agent.

## Per-step Summary

| Step type | Observed runs | Duration range | Terminal signal observed | Ever killed early? | What it did |
|---|---:|---:|---|---|---|
| specify | 2 live, timestamp-correlated | ~3m13s to ~6m52s | Live CLI graceful shutdown, no ACP fixture terminal captured for specify | Not found | Created or updated feature specs before `spec:` commits. Mapping is inferred from commit windows, not explicit agent label. |
| clarify | 2 live + 1 fixture | ~3m13s to ~6m24s live; fixture 72 JSONL lines | Fixture ended with `stopReason: "end_turn"`; live CLI graceful shutdown | Not found | Asked/encoded clarification text; Run 7 fixture is message-only, no tool calls. |
| plan | 2 live + 1 controlled fixture | ~3m04s to ~8m38s live; fixture timed out at 20m | Fixture timed out without `session/prompt`; live CLI graceful shutdown | Yes, controlled fixture timeout | Read repo/spec artifacts and wrote plan design artifacts plus `.github/copilot-instructions.md`. |
| tasks | 2 live + 1 controlled fixture | ~8m02s to ~8m42s live; controlled fixture SIGTERM | Live logs explicitly show `speckit.tasks` finished idle; fixture ended with `agent-exit` `SIGTERM` | Yes, controlled fixture manual stop/SIGTERM | Read plan/spec/contracts; generated task workplans in live runs. Fixture kept reading/searching and did not reach clean prompt result before stop. |
| analyze | 2 live + 1 controlled fixture | ~5m41s to ~17m33s live; fixture 3341 JSONL lines | Fixture ended with `stopReason: "end_turn"`; live Run 7 log shows `speckit.analyze` finished idle | Not found in controlled fixture; live no kill found | Non-destructive cross-artifact analysis: searched prerequisite/spec/constitution files, counted artifacts, inspected spec/plan/tasks consistency. |

## Live Timing Distribution

The clean live session durations below use Copilot log session start/shutdown lines, then correlate to the nearest Run 7/8 step commit.

| Run | Step | Evidence | Approx duration | Bucket |
|---|---|---|---:|---|
| Run 7 | specify | Session start `/Users/psingley/.copilot/logs/process-1780060623749-96695.log:61`; shutdown `:219-221`; nearest commit `5dafe8d` at 2026-05-29 09:24:37 -0400 | 6m52s | medium |
| Run 7 | clarify | Session start `/Users/psingley/.copilot/logs/process-1780061084955-17303.log:61`; shutdown `:204-206`; nearest commit `f5ea753` at 2026-05-29 09:31:31 -0400 | 6m24s | medium |
| Run 7 | plan | Session start `/Users/psingley/.copilot/logs/process-1780061806023-48135.log:61`; shutdown `:98-100`; nearest commit `65ec1cf` at 2026-05-29 09:39:45 -0400 | 2m38s | fast |
| Run 7 | tasks | Session start `/Users/psingley/.copilot/logs/process-1780061991625-63776.log:61`; shutdown `:276-278`; nearest commit `79f89f0` at 2026-05-29 09:48:54 -0400 | 8m40s | medium |
| Run 7 | analyze | Session start `/Users/psingley/.copilot/logs/process-1780062540215-82017.log:61`; explicit `speckit.analyze` selection `:119-123`; idle notification `:738-742`; shutdown `:759-760`; nearest commit `4a64ead` at 2026-05-29 10:07:58 -0400 | 17m33s to shutdown; 16m13s to idle | medium |
| Run 8 | clarify | Session start `/Users/psingley/.copilot/logs/process-1780073381305-32972.log:58`; shutdown `:142`; nearest commit `9f0cc23` at 2026-05-29 12:53:06 -0400 | 3m11s | fast |
| Run 8 | plan | Session start `/Users/psingley/.copilot/logs/process-1780073593937-39988.log:56`; shutdown `:263`; nearest commit `982b34b` at 2026-05-29 13:02:14 -0400 | 8m35s | medium |
| Run 8 | tasks | Session start `/Users/psingley/.copilot/logs/process-1780074141398-81542.log:58`; explicit `speckit.tasks` selection `:114-118`; idle notification `:396-400`; shutdown `:423-424`; nearest commit `b06ae40` at 2026-05-29 13:10:35 -0400 | 8m00s to idle; 8m00s to shutdown after start window | medium |
| Run 8 | analyze | Session start `/Users/psingley/.copilot/logs/process-1780074640746-97245.log:58`; shutdown `:190`; nearest commit `970229f` at 2026-05-29 13:19:20 -0400 | 5m39s | medium |

Run 8 specify mapping is less certain because the 12:49 commit has adjacent setup/capture sessions. The most plausible live specify candidate is the 16:43:22Z to 16:49:24Z Copilot log around commit `4bfd6d6` at 12:49:36 -0400, but I did not find an explicit `speckit.specify` label in that process log. Treat it as timestamp-correlated only.

Observed live buckets:

- Fast, under 5 minutes: Run 7 plan, Run 8 clarify, likely Run 8 specify.
- Medium, 5 to 20 minutes: Run 7 specify, clarify, tasks, analyze; Run 8 plan, tasks, analyze.
- Slow, over 20 minutes: none among clean live runs. Controlled Plan fixture exceeded 20 minutes while still progressing.

## ACP Terminal Signals

Clean fixture terminations:

- Run 7 Clarify fixture initialized ACP, opened a session, and ended with `{"stopReason":"end_turn"}` at `specs/0007-clarify-vertical/fixtures/clarify-transcript.jsonl:1-3` and `:72`.
- Run 8 Analyze fixture searched prerequisites/spec/constitution first (`specs/0008-ai-passive-steps/fixtures/analyze-transcript.jsonl:38-45`), later collected artifact counts and status (`:2982-2987`), and ended with `{"stopReason":"end_turn"}` at `:3341`.

Non-clean fixture terminations:

- Run 8 Plan fixture was still active after useful artifact work. It made initial repo/spec reads at `specs/0008-ai-passive-steps/fixtures/plan-transcript.jsonl:31-35`, later showed a diff stat for `.github/copilot-instructions.md`, `contracts/clarify-api.md`, `data-model.md`, `plan.md`, `quickstart.md`, and `research.md` at `:692`, emitted `Verifying artifacts` at `:693`, then the harness wrote `harness timeout after 20 minutes; no session/prompt result captured` at `:694`.
- Run 8 Tasks fixture read worktree and plan context at `specs/0008-ai-passive-steps/fixtures/tasks-transcript.jsonl:31-34`, was still reading `contracts/clarify-api.md` near the end at `:290-291`, then recorded `{"direction":"agent-exit","code":null,"signal":"SIGTERM"}` at `:292`.

Conclusion: the consistent **ACP done standard** for clean completion is the `session/prompt` response result with `stopReason: "end_turn"`. `agent-exit` with `SIGTERM` is not a success signal. CLI process graceful shutdown is useful process evidence, but it is too coarse to be the app-level completion contract.

## Tool-call Pattern by Step

- Specify: no dedicated fixture in the inspected Run 7/8 set. Live behavior is inferred from commit sequence: it created/updated feature specs before the `spec:` commits.
- Clarify: the Run 7 fixture has no tool calls; it streams answer/question text chunks and reaches `end_turn` (`specs/0007-clarify-vertical/fixtures/clarify-transcript.jsonl:67-72`). Live commits show clarify wrote spec decisions.
- Plan: heavy read/write agent. The controlled fixture read repo guidance/spec files (`plan-transcript.jsonl:31-35`), wrote/modified six artifacts and `.github/copilot-instructions.md` (`:692`), and continued into verification (`:693`) before timeout.
- Tasks: read-heavy plus generation in live runs. Controlled fixture read current feature state and TDD guidance (`tasks-transcript.jsonl:31-34`), repeatedly searched/read contracts near the end (`:290-291`), then was externally terminated (`:292`).
- Analyze: non-destructive audit. It searched for prerequisite scripts, specs, and constitution (`analyze-transcript.jsonl:38-45`), counted line totals/files/tasks/requirements (`:2982-2987`), and ended cleanly (`:3341`).

## Impatience Hypothesis

Verdict: **2 of 2 controlled "hung/no-terminal" passive-step cases were slow or externally interrupted while evidence of progress existed.**

- Plan was not idle at the point the harness labeled it timed out. It had just produced a multi-file diff stat and emitted `Verifying artifacts`; the timeout note immediately follows those records (`plan-transcript.jsonl:692-694`).
- Tasks was not proven stalled. It was still issuing reads/searches at lines `284-291`, then the process recorded SIGTERM at `tasks-transcript.jsonl:292`. That is an external stop signal, not an agent-declared terminal condition.

I did not find evidence in the inspected logs that a clean live Run 7/8 step was killed by the driving codex agent. The SIGTERM evidence belongs to the controlled Tasks fixture, and the Plan case is a harness timeout note, not a Copilot clean terminal.

## Production Recommendation

Completion detection:

1. Treat ACP `session/prompt` result `stopReason: "end_turn"` as the primary agent-complete signal.
2. After `end_turn`, run step-specific artifact/lifecycle validation before emitting the app-level terminal `done/pass`.
3. Treat `agent-exit` with `SIGTERM`, process exit without `end_turn`, or harness timeout as incomplete unless artifact validation and an app-owned recovery rule explicitly prove completion.
4. Track progress from `session/update` event activity, especially `tool_call`, `tool_call_update`, `agent_message_chunk`, and `agent_thought_chunk`; text-only streaming is insufficient.
5. Do not require usage/cost metadata for completion; the fixtures did not expose a reliable total usage field.

Timeouts:

- Use a visible "long-running" warning after 20 minutes of wall time, but only if recent stream activity is absent or low value; otherwise show "still working".
- Use a hard operator-intervention threshold of 45 minutes for Plan and Tasks, because Plan exceeded 20 minutes while still doing useful work.
- Use 30 minutes for Specify, Clarify, and Analyze based on observed clean live maxima under 20 minutes, with Analyze's Run 7 live session reaching about 17.5 minutes.
- The app should never auto-fail, auto-cancel, or auto-retry solely because 20 minutes elapsed.

## Open Limits

- The codex companion logs did not provide the requested exact `copilot --agent speckit.<step>` command lines for every Run 7/8 invocation. Where Copilot logs do not explicitly name the custom agent, this report labels the mapping as timestamp-correlated.
- Copilot logs give process/session timing and some custom-agent labels, but the ACP fixture JSONL is the better source for terminal-signal semantics.
- No Run 7/8 specify ACP transcript fixture was found in the requested fixture paths, so specify behavior is characterized from commit/log correlation rather than transcript-level tool calls.
