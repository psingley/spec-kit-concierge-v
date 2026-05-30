# ADR-0014: Capture Analyze reports as app-owned evidence outside feature artifacts

**Status:** Accepted

## Context

Analyze is a read-only source-review step that may remediate `spec.md`, `plan.md`, or `tasks.md`, and may commit with `--allow-empty` when no changes are needed. Without report capture, an empty Analyze pass can be technically valid but visually barren in Review. Asking Analyze to author `analyze.md` would violate the locked source artifact contract.

Existing app-owned runtime files already live under Electron `userData`, including in-flight markers. ACP prompt results and transcripts contain enough terminal update material to derive report text without adding a runtime dependency.

## Decision

Capture the terminal Analyze Markdown report as app-owned evidence at:

```text
userData/evidence/{featureKey}/{sessionId}/analyze-report.md
userData/evidence/{featureKey}/analyze-report-index.json
```

The passive Analyze pipeline writes this file after ACP terminal completion, then records an app-owned index entry after `after_analyze` returns the Analyze Step Commit SHA. The file and index are not part of the feature directory, not included in the Analyze Step Commit diff scope, and not required by the spec-kit artifact contract.

Report extraction is deterministic and warning-first. The app prefers the final non-empty assistant `agent_message_chunk` text candidate from the completed Analyze prompt, falls back to the persisted prompt transcript using the same rule, ignores tool/thought chunks as report body text, and records `missing` or `ambiguous` extraction status instead of inventing report text.

Review displays Analyze pass proof from git trailers, resolves that commit SHA through the app-owned report index, and pairs it with the report when available. If the report or index entry is missing, Review keeps Analyze completion when disk proof exists and shows an explicit missing-report/no-diff warning.

## Rationale

This preserves Analyze's read-only contract while making Analyze findings restart-proof and inspectable. App-owned evidence belongs to Concierge because it is captured by the application from the agent stream, not authored by the step agent as a feature artifact.

## Consequences

- Add a typed main-process helper for app-owned evidence writes/reads with structured logging.
- Add a typed app-owned report index keyed by feature directory and Analyze commit SHA so Review can rediscover reports after restart without renderer session memory.
- Extend passive Analyze summary metadata to include app-owned report evidence.
- Update Review aggregation to discover the app-owned report by committed Analyze proof SHA through the index.
- Tests must cover report capture success, missing/ambiguous extraction with pass trailer, empty Analyze pass, restart lookup without session memory, and no feature artifact writes.
- Future retention/cleanup policy for `userData/evidence/` is deferred.

## References

- `specs/0009-review-evidence/spec.md`
- `specs/0009-review-evidence/fixtures/pre-spec-probes.md`
- `specs/0009-review-evidence/contracts/analyze-report-capture.md`
- `docs/adr/0012-register-passive-step-ipc.md`
- `.specify/memory/constitution.md` Principles II, VII, XV
