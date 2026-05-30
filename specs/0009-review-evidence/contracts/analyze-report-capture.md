# Contract: Analyze Report Capture

## Purpose

Capture the Analyze agent's terminal Markdown report as app-owned disk evidence so Review can show Analyze findings even when Analyze produces no source diff.

## Storage

```text
userData/evidence/{featureKey}/{sessionId}/analyze-report.md
userData/evidence/{featureKey}/analyze-report-index.json
```

This path is outside `specs/<feature>/` and outside the spec-kit artifact contract.

## Capture source

The passive Analyze pipeline derives the report from terminal assistant Markdown contained in ACP prompt updates or the recorded transcript. If terminal Markdown cannot be derived, Analyze completion remains valid when the `Concierge-Step: analyze:pass` trailer exists, and Review shows an `ANALYZE_REPORT_MISSING` or `ANALYZE_REPORT_AMBIGUOUS` warning.

Extraction rules:

1. Collect prompt updates in order for the completed Analyze prompt.
2. Treat `agent_message_chunk` text as assistant report candidates.
3. Treat `tool_call`, `tool_call_update`, and `agent_thought_chunk` as activity/provenance, not report body text.
4. Prefer the final non-empty assistant message candidate after the last tool-call update.
5. If prompt updates do not contain a candidate, read the persisted prompt transcript and apply the same rule.
6. If no candidate exists, mark extraction `missing`; if candidates cannot be ordered deterministically, mark extraction `ambiguous`.
7. Never invent report text from tool output or renderer state.

## Passive summary extension

```ts
type AnalyzePassiveSummary = PassiveStepSummary & {
  analyzeReport?: {
    id: string;
    path: string;
    source: 'app-owned-evidence';
    kind: 'markdown';
    available: boolean;
    sizeBytes?: number;
    mtimeMs?: number;
    noDiff: boolean;
    analyzeCommitSha?: string;
    extractionStatus: 'captured' | 'missing' | 'ambiguous';
    missingReason?: string;
  };
};
```

## Write behavior

1. Run Analyze through the existing passive IPC helper and ACP supervisor.
2. Extract final Markdown after ACP terminal completion.
3. Write to `userData/evidence/{featureKey}/{sessionId}/analyze-report.md` through a typed main-process helper when extraction succeeds.
4. After `after_analyze` returns the Step Commit SHA, update `userData/evidence/{featureKey}/analyze-report-index.json` with the feature directory, session id, analyze commit SHA, report path, capture timestamp, metadata, and extraction status.
5. Log the target path, index path, session id, analyze commit SHA, step, and write result.
6. Do not add the report path or index path to the Analyze Step Commit diff scope.

## No-diff behavior

When Analyze has no remediation diff:

- The `after_analyze` hook may still write an empty Step Commit with `Concierge-Step: analyze:pass`.
- Review treats the pass trailer as valid completion proof.
- Review resolves the pass trailer SHA through the app-owned index and pairs the proof with report evidence when available, otherwise with an explicit no-diff explanation plus missing/ambiguous-report warning.

## Invariants

- Analyze remains read-only with respect to feature artifacts except allowed remediation files `spec.md`, `plan.md`, and `tasks.md`.
- The app, not the Analyze agent, owns report persistence.
- No `analyze.md` or `analyze-report.md` feature artifact is required or requested.
- No runtime dependency is added for Markdown extraction.
- Review report lookup is disk-only: git trailer proof plus app-owned index, never renderer session memory.
