# ADR-0013: Aggregate Review evidence in main through `review:evidence`

**Status:** Accepted

## Context

Run 9 adds the terminal Review surface. The constitution says disk is truth: step completion is proven by git history, `Concierge-Step:` trailers, and on-disk artifacts, never renderer memory or ACP prose. Current code has disk trailer helpers, artifact reads, and task parsing, but no single Review evidence capability that joins those facts.

Review also needs metadata-first summaries, read-on-click evidence bodies, optional Plan artifact discovery, committed clarifications, Analyze report evidence, and warnings for malformed or missing proof. Future Run 10 HTTP evidence endpoints should be able to reuse the same aggregation seam.

## Decision

Add a main-process `review:evidence` IPC capability with two request variants:

1. `kind: 'summary'` aggregates git trailer proof, feature artifact metadata, committed `spec.md` clarifications, app-owned Analyze report metadata, task metadata, pending navigation display data, and warnings.
2. `kind: 'body'` reads a selected evidence body by ID/path after the summary has returned it.

The renderer accesses this capability through preload and RTK Query. Review UI stores no authoritative evidence in Redux slices and does not use renderer session memory as evidence input.

Review remains a Concierge app surface. Run 9 does not add `copilot:review`, does not write a Review artifact, and does not write a Review Step Commit.

## Rationale

A main-process aggregator preserves the IPC boundary and Disk-Is-Truth while giving Review a single, testable contract. Keeping body reads behind the same evidence capability prevents app-owned Analyze reports from leaking into the feature artifact contract and keeps the initial Review load small.

The design also creates a reusable seam for the future HTTP API without forcing Run 9 to finalize external endpoint contracts.

## Consequences

- Add main and renderer factories for the `review:evidence` payloads.
- Add co-located tests for malformed trailers, missing required artifacts, absent optional artifacts, missing Analyze report, body read failure, and restart-stable summary output.
- `artifact:read` remains available for feature artifacts, but Review body reads go through `review:evidence` so feature artifacts and app-owned reports share evidence IDs and warnings.
- Review UI must make warnings visible without claiming unsupported completion.
- Any future Review/JIRA commit semantics require a new ADR or ADR update.

## References

- `specs/0009-review-evidence/spec.md`
- `specs/0009-review-evidence/plan.md`
- `specs/0009-review-evidence/contracts/review-evidence-ipc.md`
- `.specify/memory/constitution.md` Principles I, II, VI, VII, XVI
- `ROADMAP_DECISIONS.md` Review & Evidence Vertical and per-step artifact manifest
