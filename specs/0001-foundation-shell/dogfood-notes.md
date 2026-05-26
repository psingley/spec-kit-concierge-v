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
