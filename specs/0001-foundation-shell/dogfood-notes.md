# Dogfood Notes — Run 1

> Observations captured while driving Run 1's spec-kit pipeline. These
> feed into the design of the Concierge App's spec-kit step runners
> (Run 3 ACP Adapter, Run 5 Step Lifecycle, Run 6+ Vertical slices).
> Treat as findings, not decisions.

## DF-001 — Copilot CLI non-interactive mode requires `--allow-all-tools`

**Observed:** `copilot -p "<prompt>" --add-dir <path>` (without
`--allow-all-tools`) ran the full spec-authoring task internally
(read grill.md, constitution, ROADMAP, template, drafted three
artifact files) but then failed every single file write with
"Permission denied and could not request permission from user."
Cost: 0.33 Premium requests, 1.5M tokens, 5m 13s, zero artifacts
produced.

**Cause:** Copilot CLI's default permission posture in non-interactive
mode asks the user (interactively) to approve each tool use. With no
TTY for prompting, every approval fails. `--add-dir` grants directory
*scope*, not *tool* permission. The two flags solve different things.

**Fix:** Add `--allow-all-tools` for non-interactive scripted use.

**Implication for Concierge App (Principle III mandate):**
- Constitution Principle III already says "The Bound CLI runs with
  `--allow-all-tools` (or the ACP-equivalent permission grant)."
  This dogfood run confirms that's not an arbitrary choice — it's
  the *only* viable posture for unattended CLI driving.
- The ACP Adapter (Run 3) must establish the equivalent permission
  grant at session-start, not per-tool. Per-tool prompting in the
  ACP layer would replicate this exact failure mode.
- The Concierge App UI may still surface MCP tool calls in the
  activity stream (Principle X observer-only) — that's display, not
  approval gating.
- The "permission denied without ability to request" failure is
  the cheapest possible signal that the wrong posture is in effect.
  Worth detecting at session start: if the Bound CLI is launched
  without `--allow-all-tools`, the Concierge App should refuse to
  start the session rather than waste cycles on a doomed run.

**Cost-of-misconfiguration calibration:** 0.33 Premium requests +
5m 13s + 1.5M tokens for one failed spec authoring. At ~13
spec-kit pipeline runs across the v1 roadmap, with multiple steps
per run, this kind of soft-fail in production is real money. The
fail-fast detection above is worth a few lines of session-start
code.

---

## DF-002 — Step status drift: Copilot sets "Ready for Planning"

**Observed:** `/speckit.specify` produced `spec.md` with
`**Status**: Ready for Planning` rather than the template default
of `**Status**: Draft`. Clarify hadn't run yet at that point.

**Implication for Concierge App:**
- The status field is a Step State surface (`pending` →
  `complete`) per Principle VII; the Bound CLI should not be
  authoring step-lifecycle status directly.
- The Concierge App should compute Status from the `steps` slice
  (state derived from `Concierge-Step:` git trailers per Disk Is
  Truth), not from a parsed spec.md frontmatter field.
- Alternative: treat the Bound CLI's "Ready for Planning" hint as
  advisory only, and overwrite to canonical status during the
  `after_<step>` hook factory pass.
- The Step Contract factory (Principle VIII) for Specify could
  normalize the Status field to a known value as part of its
  validation pass. Cheap defense.

---

## DF-003 — Hook discovery and announce-without-execute on optional pre-hooks

**Observed:** `/speckit.clarify` read `.specify/extensions.yml`
correctly, surfaced the `before_clarify` git auto-commit hook as
"**Optional Pre-Hook**: git", and then *did not execute* it because
there were no outstanding changes. The hook was discovered,
announced, and intelligently skipped.

**Implication for Concierge App:**
- The pre-hook *announcement* posture from the Step Agent is what
  the UI should mirror — "About to run /speckit.clarify; optional
  pre-hook git/auto-commit detected; skipping (no pending changes)."
- Required hooks (`optional: false`) should be elevated to blocking
  UI affordances. The spec-validate `before_implement` hard gate is
  the canonical example.
- The hook-discovery contract (read extensions.yml, filter by
  enabled, skip non-empty condition expressions, leave to
  HookExecutor) is already canonized in
  `speckit.specify.agent.md:23-44` and equivalents. The Concierge
  App's HookExecutor in Run 5 should match that contract exactly.

---

## DF-004 — Clarify-as-no-op when grilling has done the work upstream

**Observed:** `/speckit.clarify` produced "No clarifications
needed." 41 seconds, 0.33 Premium, 9/9 categories marked Clear.
Spec.md unchanged.

**Implication for Concierge App:**
- Empty-clarify is a valid Step Contract output, distinct from
  failure or pending. Principle VIII's strictness is about
  *malformed questions when questions exist*, not about whether
  questions had to exist at all.
- The UI for the Clarify step needs an explicit "no questions
  needed" affordance, not just "questions list is empty." User
  acknowledgment of the empty-clarify result should be the
  unlock condition before Plan becomes available.
- This is a strong signal that the upstream grill-with-docs
  cadence (Principle XVI) is working: rigorous grilling reduces
  clarify surface area. Cost translates directly:
  - Run 1 grilling: ~30 min of human time, conversational
  - Run 1 clarify: 41s, 0.33 Premium → "no questions"
  - Without grilling: clarify would have surfaced 6+ questions,
    each requiring a roundtrip, and likely produced lower-quality
    spec because clarify is single-pass.

---

## DF-005 — `/speckit.tasks` first run dumped to stdout, did not write file

**Observed:** Initial `/speckit.tasks` invocation produced the full
task breakdown (Phases 3-7 visible in stdout, Phases 1-2 truncated
from the buffer) but never wrote `tasks.md` to disk. Exit code 0.
0.33 Premium burned. The agent treated the response as "answer the
user" rather than "persist the artifact."

Second invocation (same `-p` form) with an explicit imperative
("CRITICAL: Write the complete output to specs/.../tasks.md as a
file on disk. Do NOT just print it to stdout.") succeeded on the
first try. Cost a second 0.33 Premium.

**Implication for Concierge App:**
- The Step Contract factory (Principle VIII) for the Tasks step
  MUST verify the artifact exists on disk before the
  `after_<step>` hook marks the step complete. "Agent claimed
  success" is not enough — the disk-truth invariant (Principle II)
  is the actual gate.
- The Concierge App's Bound CLI driver should include an artifact-
  existence check between the CLI returning success and the Step
  Commit firing. If the artifact is missing, route through the
  Step Escape Hatch with a clear "expected file not produced"
  failure category.
- This is the canonical example of why "Disk Is Truth" matters: a
  successful exit code from the CLI is NOT step completion.
- For the spec-kit pipeline runners, expected output paths should
  be encoded into the step agent contract (already partially done
  via `handoffs:` frontmatter in
  `.github/agents/speckit.tasks.agent.md`). The Concierge App's
  HookExecutor for Run 5 should read those expected paths and
  verify them.
- The fact that this happens with the *current* spec-kit step
  agent (not a bespoke Concierge step) means it's an upstream
  fragility we have to defend against, not a Concierge-only bug.

**Open question for Run 3 (ACP Adapter):** does this failure mode
manifest the same way over ACP/JSON-RPC, or is it specific to the
`-p` mode prompt protocol? Worth a transcript capture during Run 3
to find out.

---

## DF-006 — No rtk leakage in shipped artifacts (verified)

**Observed:** Across all four spec-kit steps (specify, clarify,
plan, tasks), Copilot's internal tool calls used `rtk git`, `rtk
ls`, etc. (per the user-level `~/.copilot/copilot-instructions.md`
preference). But none of the shipped artifacts — `spec.md`,
`plan.md`, `research.md`, `tasks.md`, `ADR-0001`, `ADR-0002`,
`.github/copilot-instructions.md` — contain any `rtk` references.

Verified via: `grep -rn "rtk" specs/0001-foundation-shell/ docs/
.github/copilot-instructions.md` → 0 matches.

**Why this matters:**
- `rtk` is a machine-local user optimization installed on the
  developer's machine. Not all future contributors will have it.
- The Concierge App ships to users without rtk. If shipped
  artifacts hardcoded `rtk` commands, those users would get
  "command not found" errors.
- The dogfood signal here is structural: Copilot CLI correctly
  treats rtk as a working-session helper, not a project
  convention. The boundary held without explicit instruction.

**Implication for Concierge App:**
- The ACP Adapter (Run 3) launch command for the Bound CLI MUST
  NOT include `rtk` prefixes. Plain `copilot ...` only.
- Any npm scripts, CI workflows, and shipped tooling stay plain.
  rtk is the user's choice, not the project's.
- The Concierge App could optionally detect rtk's presence at
  launch and surface a "Token-optimization helper detected:
  rtk" diagnostic — but that's post-v1 polish.

---

