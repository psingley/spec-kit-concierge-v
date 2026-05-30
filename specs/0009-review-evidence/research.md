# Research: Run 9 Review & Evidence Vertical

## Decision: `review:evidence` is a main-process disk/git aggregation capability

**Rationale**: The constitution makes disk/git the state of record. Existing `readConciergeStepHistory()` already reads committed `Concierge-Step:` trailers from git history, while `steps:read` only parses caller-supplied commit messages. A main-process Review aggregator can combine trailers, feature artifacts, app-owned evidence, task metadata, and warnings without asking the renderer to perform I/O or trust volatile session state.

**Alternatives considered**:
- Renderer assembly from session slices and existing endpoints: rejected because it fails restart/crash scenarios and violates Disk-Is-Truth.
- Extending `steps:read`: rejected because trailer parsing would become mixed with Review-specific artifact, task, and report concerns.
- Hybrid memory-first display: rejected by locked decision; session memory may influence navigation affordances but not evidence authority.

## Decision: Review evidence bodies are lazy-read through the Review evidence capability

**Rationale**: The Review summary must remain metadata-first and fast. Body reads for markdown artifacts and app-owned reports happen only when the developer selects an evidence item, using the same main-process trust boundary and safe-read limits. This also avoids preloading large artifacts and gives explicit read-failure UI states.

**Alternatives considered**:
- Preload every markdown/report body into the summary: rejected for startup performance and large-file risk.
- Use only `artifact:read`: rejected because app-owned Analyze reports live outside the feature artifact contract and need the same evidence ID/warning semantics as the summary.
- Preload only small files: rejected because inconsistent body availability would complicate Review expectations.

## Decision: Clarifications are parsed from committed `spec.md`

**Rationale**: Run 7 and Run 8 specs use a stable `## Clarifications` / `### Session YYYY-MM-DD` / `- Q: ... -> A: ...` shape. Parsing committed `spec.md` keeps Review restart-proof and prevents same-session clarification memory from becoming authoritative evidence.

**Alternatives considered**:
- Use `session.clarifyCompletion`: rejected because it is volatile and can disagree with committed spec contents.
- Merge session details when a commit SHA matches: deferred as enrichment; Run 9 locks disk-only evidence for Review.

## Decision: Plan optional artifacts are manifest optional entries plus disk discovery

**Rationale**: `data-model.md`, `quickstart.md`, and files under `contracts/` are legitimate Plan outputs but not always present. The manifest should declare optional discovery targets, and disk scanning should include present files as optional evidence while absent files do not block Plan completion, Step Commit validation, passive summaries, or Review status.

**Alternatives considered**:
- Keep optional discovery only in Review: rejected because passive summaries would remain incomplete and inconsistent.
- Make all optional artifacts required: rejected because it contradicts the locked optional-if-produced behavior.
- Treat `contracts/*` as a literal file: rejected because contracts is a directory with zero or more files.

## Decision: Analyze report capture is app-owned evidence with a feature/commit index

**Rationale**: Analyze is read-only with optional remediation and allowed empty commits. Capturing the terminal Analyze Markdown report as app-owned evidence gives Review restart-proof context without asking the Analyze agent to author `analyze.md` or changing the feature artifact contract. Existing app-owned runtime files already use `userData`, including in-flight markers. Because Review's durable proof is the committed `analyze:pass` trailer, the report must also be discoverable from disk after restart without relying on an in-memory ACP session id.

**Decision details**: Store the report body under `userData/evidence/{featureKey}/{sessionId}/analyze-report.md` and write an app-owned index under `userData/evidence/{featureKey}/analyze-report-index.json`. The index maps `featureDir` and `analyzeCommitSha` to the captured `sessionId`, report path, size, mtime, and extraction status. Review first resolves the `analyze:pass` commit SHA from git history, then reads this app-owned index to find the report. If the index entry is missing, Review keeps Analyze completion when trailer proof exists and emits `ANALYZE_REPORT_MISSING`.

**Alternatives considered**:
- Ask Analyze to write `analyze-report.md` under the feature directory: rejected because it violates the read-only Analyze contract and feature artifact manifest.
- Store the report only in renderer activity/session state: rejected because it vanishes on restart.
- Store only a session-scoped report path with no feature/commit index: rejected because Review cannot reliably rediscover the report from committed disk proof after restart when no session id is available.
- Treat an empty Analyze pass as a warning: rejected because Analyze empty commits are valid completion proof.

## Decision: Analyze terminal Markdown extraction is deterministic and warning-first

**Rationale**: Current ACP prompt results expose `stopReason` and updates, while the passive adapter discards the prompt result. Run 9 must not pretend a final assistant text field already exists. The app should derive report text from known ACP update records and fail visibly when extraction cannot be proven.

**Decision details**: After the ACP prompt completes, collect updates for that prompt in order. Concatenate `agent_message_chunk` text chunks into assistant message candidates, treating tool-call output and thought chunks as non-report context. Prefer the final non-empty assistant message candidate after the last tool-call update. If no candidate exists, fall back to the persisted prompt transcript and apply the same rule. If multiple final candidates cannot be ordered or the selected candidate is empty, do not write invented content; write index metadata with `extractionStatus: missing | ambiguous` and let Review show `ANALYZE_REPORT_MISSING` or `ANALYZE_REPORT_AMBIGUOUS`.

**Alternatives considered**:
- Use tool-call raw output as report text: rejected because it can be command output rather than Analyze's report.
- Store the entire transcript as the report: rejected because Review needs the structured Analyze report, not mixed protocol noise.
- Require the Analyze agent to write a report file: rejected by the read-only Analyze contract.

## Decision: ACP stream silence threshold is 40 minutes with fine-grained stream activity reset

**Rationale**: Existing code uses 20 minutes and copy that says the agent appears hung. Run 8 forensics show legitimate Plan activity can exceed that. The Run 9 rule is silence-based, not runtime-based: any ACP stream activity resets the clock; after 40 minutes with no activity the UI shows "still working / no recent output" and never auto-fails, cancels, retries, or asserts a hang.

**Alternatives considered**:
- Wall-clock runtime threshold: rejected because it repeats the false-alarm failure mode.
- App progress events only: rejected because coarse progress can miss active ACP text/tool streaming.
- Auto-retry or auto-cancel: rejected by the constitution and locked decision.

## Decision: Review is not a canonical Step Agent and writes no Review Step Commit

**Rationale**: Constitution and roadmap define Review as a Concierge app surface for evidence review and later JIRA extension invocation, not a spec-kit agent. Run 9 must not add `copilot:review`, must not create a Review artifact, and must not write `Concierge-Step: review:pass`.

**Alternatives considered**:
- Empty Review Step Commit for stepper symmetry: rejected because it contradicts roadmap and would confuse the later JIRA slice.
- `copilot:review` agent invocation: rejected because Run 9 is inspection UI, not agent execution.

## Decision: Review UI derives state through RTK Query and existing slices, not a ninth Redux slice

**Rationale**: The active renderer slice catalog is fixed at eight. RTK Query is the constitutional read API for IPC, and Review selection state can be component-local. Existing selectors provide workspace, step, and session navigation context; evidence content comes from `review:evidence`.

**Alternatives considered**:
- Add a `review` slice: rejected by locked decision and roadmap inventory.
- Store evidence in `session`: rejected because it would invite session-memory authority.
- Use ad-hoc component effects with preload calls: rejected because RTK Query owns IPC lifecycle.

## Decision: Resume target uses running step first, then first incomplete canonical step, without a multi-pending warning

**Rationale**: The locked Run 9 decision says no defensive multi-pending warning. The deterministic fallback is sufficient for display: if a step is currently running, Resume targets it; otherwise it targets the first incomplete step in canonical order.

**Alternatives considered**:
- Add a multi-pending warning: rejected by locked decision.
- Use latest pending trailer state: rejected because pending may be in-flight and not committed.
- Disable Resume when ambiguous: rejected because it creates a dead end.

## Decision: Real StatusStep visual retrofit is in Run 9 scope

**Rationale**: Current visual passive fixtures inject synthetic markup instead of driving shipped components. Run 9 must make passive contracts trustworthy by exercising the real StatusStep path, including status counts/tags, evidence subtitles, and artifact action state.

**Alternatives considered**:
- Add Review visual contracts only: rejected because the Run 8 visual-contract honesty gap would remain.
- Keep synthetic passive markup as a design placeholder: rejected because it cannot detect regressions in shipped component behavior.

## Decision: Two ADRs are needed

**Rationale**: `review:evidence` aggregation and app-owned Analyze report capture are durable architecture seams that future Run 10 HTTP API and Run 12 JIRA work will reuse. Recording them prevents later work from re-litigating disk authority, channel ownership, and source-artifact boundaries.

**Alternatives considered**:
- Keep decisions only in plan/spec: rejected because these seams outlive Run 9 implementation tasks.
- One combined ADR: rejected because evidence aggregation and report capture have separate contexts and consequences.
