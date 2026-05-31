# Session Audit — 2026-05-31 (Opus 4.8)

Comprehensive record of work done this session, for retention across context reset.
Baseline at session start: main `d22aabf` (Run 11 merged). End: main `9874b66`.

## What shipped (6 PRs merged to main)

| PR | Merge | What | Tests after |
|----|-------|------|-------------|
| #13 | `fb14e71` | **Frontend shell layout fix** — window containment (`100vw`→`100%`), activity rail docked as real grid column (was `position:fixed` overlay), duplicate titlebar toggle removed, added `workspace-shell-layout` whole-window visual contract | — |
| #14 | `9b62ccc` | **GitHub CLI auth** — status-first detection (`gh auth status --active` → instant success for already-authed), `gh auth login --web` device flow only if needed, `gh api user` identity. Fixed the infinite "Signing in..." hang | 884 |
| #15 | `8ace511` | **Copilot CLI auth** — fixed wrong subcommand (`copilot auth login` → `copilot login`), added already-authed detection via macOS keychain (`security find-generic-password -s copilot-cli`), env-token path | 887 |
| #16 | `6db5318` | **Repo picker** — real collette-travel org repos via gh CLI (was hardcoded). `src/main/data-layer/repositories/repoList.ts` + `src/main/ipc/repos.ts` | 894 |
| #17 | `6ceb19a` | **Activity stream** — real event flow (removed hardcoded demo entries) | — |
| #18 | `9874b66` | **Titlebar cluster** — live auth-status dropdown (incl real Atlassian mcp:config:check 3-state), real Copilot model picker, working gear-menu modals (Customize/About/Request) | 904 |

Combined integration verified: typecheck + lint + **904 tests** green on merged main.

## Key technical findings (verified, durable)

### Auth methodology (the correct pattern, now established for all 3 providers)
- **GitHub:** `gh auth status --active --hostname github.com` for detection, `gh auth login --web` for login, `gh api user` for identity. Multi-account aware (psingley + psingley_collette).
- **Copilot:** NO `copilot auth status` command exists — it's `copilot login` (not `copilot auth login`). Detection via macOS keychain `security find-generic-password -s copilot-cli -a https://github.com:<login>` (presence = authed) OR env token (`COPILOT_GITHUB_TOKEN`/`GH_TOKEN`/`GITHUB_TOKEN`). Copilot auth rides on GitHub auth (requires gh logged in first).
  - **WINDOWS GAP (Run 13 smoke):** the keychain detection is macOS-only. On Windows the env-token path covers it, but where copilot stores its token on Windows for detection is UNVERIFIED. Must smoke-test on real Windows.
- **Atlassian:** Run 11 — Concierge writes the MCP config entry, Copilot owns OAuth (browser/device, tokens in `~/.copilot/mcp-oauth-config/`). Detection: config presence + oauth-metadata exact-serverUrl match + token-file presence (never read token contents — Observer-Only).
- **All three use the OS-boundary adapter pattern** (CONCIERGE_TEST_*_ADAPTER for test determinism, real CLI in prod, NEVER a test branch in production code).

### The JIRA filer root cause (Task #6 backlog)
Codex live-reproduced (created SKC-237 direct + SKC-238 via filer): the concierge-jira `specstoissues` wrapper shells out to a FRESH COPILOT PROCESS PER TICKET (~85s + many LLM turns each) and the agent IMPROVISES AD-HOC PYTHON to write state records (non-deterministic — wrote `completed_at==started_at`). Timeouts/MCP-warmup/prompt-loop-wobble kill bulk runs partway (Run 7's "21 then died on T014"). NOT JIRA/MCP/JQL/file-locking. Fix if pursued: delete nested shell-out fan-out, replace with deterministic main-process loop. **Run 12 decision: accept direct Atlassian MCP (proven 5×), backlog the filer.**

## Critical workflow lessons banked this session (in project memory)

1. **PARALLEL CODEX MUST USE GIT WORKTREES.** Dispatching 3 codex jobs to the same working dir caused a collision (titlebar's edits landed on repo-picker's branch; activity's branch never created). Fix: `git worktree add /tmp/<name> -b <branch> main` + dispatch with `--cwd <worktree>` + poll status with the same `--cwd` (job enrolls under a cwd-derived project-id hash). Read-only investigations can share the dir; any WRITE fan-out needs worktrees.

2. **METHODOLOGY PIVOT — synthetic UI harness vs real-behavior integration.** The visual-diff harness is great for INSTANTIATION/BASELINING (look 1:1 with design) but COUNTERPRODUCTIVE for functional debugging once baselined: it hardcodes/stubs data to render screenshots, masking real wiring. The repo-picker/model-picker/gear-menu/activity-stream all "passed" the synthetic harness while being non-functional — the user only found them by RUNNING the app. **PIVOT: Phase A = synthetic harness to baseline look. Phase B = STOP harness loops, switch to live shadowed walkthrough (user clicks real app + reports, assistant checks/improves the constitutional logging suite to be robust enough to debug real behavior).** Don't re-run vd:loop end-to-end per change once baselined — it's a regression gate, not a dev loop.

3. **Recursion guard for /speckit.implement** (from Run 9): codex's implement subagent can re-spawn a nested companion job carrying the whole prompt (~2h waste). Always tell codex to run implement directly. Verify completion via git truth (gh pr view / git log), NOT the job tracker (which can zombie).

## Where the app actually stands (functional reality, not just "looks right")

WORKING (verified by user running the app):
- Shell layout contained + responsive, rail docked, single toggle.
- GitHub sign-in (instant, psingley).
- Copilot sign-in (instant).

NEEDS LIVE VERIFICATION (merged but not yet user-confirmed functional):
- Auth-status dropdown showing real live status (PR #18).
- Real model picker (PR #18).
- Gear-menu modals opening (PR #18).
- Real activity stream events (PR #17).
- Real repo picker list (PR #16) — user last saw hardcoded BEFORE #16 merged.

## Roadmap status

- **Done:** Runs 1-9 + 6.5 + 11 (full user-facing pipeline + Atlassian MCP). Task #7 (vertical slices) 5/5 complete.
- **Remaining:** Run 12 (JIRA submission — direct-MCP accepted, decision banked), Run 13 (Windows packaging).
- **Deferred to Run 10:** single-step-running invariant guard (Task #1 — Resume affordance depends on it).
- **Backlog:** filer rewrite (Task #6, root-caused), Figma harness (docs written: `docs/figma-harness-proposal.md` + `docs/ui-fidelity-harness-runbook.md`).

## Docs produced this session
- `docs/ui-fidelity-harness-runbook.md` — the visual-fidelity methodology, reusable.
- `docs/figma-harness-proposal.md` — Figma bidirectional feasibility (MEDIUM/high-value; Figma REST API + official Dev Mode MCP map to the verify layers; ~2-3 day MVP).
- `docs/session-audit-2026-05-31.md` — this file.

## Opus 4.8 / workflows (researched)
Dynamic Workflows = type "workflow" → Claude writes a JS orchestration script fanning out dozens-to-hundreds of parallel subagents (16 concurrent, 1000 cap), plan lives in code not context. `/effort ultracode` = auto-orchestration. Opus 4.8: 1M context, ~4× less likely to overlook its own code flaws, fast mode 3× cheaper. Relevant for us: design-fidelity fan-out, multi-reviewer audit panels, per-file codex review — but our pipeline is codex-based (workflows spawn Claude agents, can't drive codex). Use workflows for parallel Claude-side verification/review, not for the codex build pipeline.

## NEXT SESSION should
1. Do a LIVE SHADOWED WALKTHROUGH of the app (the pivot) — user clicks each surface, assistant verifies real behavior + the diagnostic/logging surfaces, fixes what's actually broken (not what synthetically renders).
2. Then Run 12 (JIRA, direct-MCP) + Run 13 (Windows packaging) to ship v1.
