# ADR-0018: JIRA submission via app-driven deterministic loop, not a per-ticket LLM filer

**Status:** Accepted (2026-06-02)

## Context

The "Send to JIRA" action (the terminal action on the Review step — see the
`JIRA Submission` glossary entry in `CONTEXT.md`) creates a Jira issue
hierarchy from `spec.md` + `tasks.md`. The `concierge-jira` spec-kit extension
(`.specify/extensions/concierge-jira/`) ships an orchestrator,
`speckit.concierge-jira.specstoissues`, whose documented design delegates each
ticket's create/verify/write to a per-ticket LLM sub-agent
(`speckit.concierge-jira.file-ticket`, `gpt-5-mini`) via a fresh shell-out
process per ticket. The earlier `JIRA Submission` glossary entry described this
per-ticket-agent model.

Production history contradicts that design. Across Runs 1, 7, 8, 9, and 11 the
team filed 200+ Jira issues (SKC-25..236), and a live audit of the SKC project
plus the on-disk submission records surfaced the following evidence:

- **The per-ticket filer is unreliable at scale.** Run 7 (`0007-clarify-vertical`)
  died mid-run — the filer shells out a fresh Copilot process per ticket
  (~85s + many LLM turns each) and the agent *improvised ad-hoc Python* to write
  state records non-deterministically (observed `completed_at == started_at`).
  Timeouts / MCP warmup / prompt-loop wobble killed the bulk run partway
  ("21 then died on T014"). Root cause was never Jira/MCP/JQL/file-locking — it
  was an LLM losing discipline across many sequential turns.
  (`docs/session-audit-2026-05-31.md:28-29`.)
- **An in-session `task`-tool delegation skips the disk write entirely** — ticket
  created in Jira, no state record on disk (the SKC-8 anti-pattern). This is the
  invisible-dupe failure mode: a live ticket with no local truth.
  (`docs/jira-submission-protocol.md:305-313`.)
- **Live duplicates exist that on-disk records cannot see.** The SKC project
  holds three duplicate "Foundation Shell & Boundaries" Epics (SKC-10, SKC-15,
  SKC-20) with duplicate T001/T002/T003 subtasks — re-creates from early filer
  test runs that left no surviving local record. A per-spec on-disk audit
  reports "0 dupes" while the live project has ~21 throwaway tickets in
  SKC-1..24.
- **Dropping the filer for direct-MCP loops degraded ticket bodies.** Filer-era
  tickets (SKC-25, SKC-33) have rich, templated descriptions
  (Contributes-to / Work / Done-when, file paths, acceptance criteria). The
  inline direct-MCP runs (SKC-132, SKC-176, SKC-218) collapsed to one-line stubs
  restating the summary. The filer's per-ticket LLM was authoring real bodies;
  the inline loops skipped that.
- **Idempotency labels were inconsistent across runs** — `SKC-idem-41a0a054ddf2`
  (Run 1, the mandated `<project_key>-idem-<hash12>` format),
  `SKC-idem-run8-task-T020` (Run 8, human-readable), `skc-idem-run9t011`
  (Run 9, lowercase). Only Run 1 followed the protocol, so JQL orphan recovery
  could not dedupe the transient-failure re-creates (SKC-10/15/20).
- **Native parenting broke when tasks were filed as `Task` instead of `Subtask`.**
  Run 11 tickets (SKC-209..236) are issue-type `Task` with the parent recorded
  only in description text ("Phase story: SKC-203"), not the native parent field —
  so they float in Jira's hierarchy. Runs 8/9 used `Subtask` under `Story` and
  parent cleanly.

Principle X (Observer-Only) and ADR-0015 lock a hard constraint: **the Concierge
App never speaks to Atlassian directly.** The Bound CLI (Copilot) is the only MCP
host and the only owner of Atlassian OAuth credentials.

## Decision

JIRA submission is an **app-driven deterministic create loop in main-process
application code**, not a per-ticket LLM filer sub-agent.

1. **Deterministic loop owns iteration and truth.** The Concierge App parses
   `spec.md` + `tasks.md` into a Spec → Phase → Task DAG and iterates it in
   real TypeScript. The app owns the disk-truth gate (advance a node only when
   its state record shows `verified` or `duplicate`, with a matching payload
   hash and a fetchable issue key), parent threading, and resume.

2. **The Bound CLI makes every MCP call — one bounded turn per ticket.** For each
   DAG node the app fires a *single, single-purpose* Bound CLI turn that makes
   exactly one `createJiraIssue` call from a Concierge-supplied pre-rendered
   payload and writes one state record. This respects Principle X / ADR-0015
   (the app never calls Atlassian MCP itself) while keeping the LLM on a short
   leash — one create, not a multi-turn improvising agent. The per-ticket
   `file-ticket` filer sub-agent is **not** used.

3. **Ticket bodies are rendered deterministically by the app**, recovering the
   filer-era quality (Epic/Story/Subtask with acceptance criteria and file
   context) without an LLM authoring them per ticket.

4. **Hierarchy is Subtask-under-Story** using the native parent field (proven
   clean in Runs 8/9); not `Task`-with-text-parent (broken in Run 11).

5. **One canonical idempotency-label format**, `<project_key>-idem-<hash12>`,
   validated against `[a-zA-Z0-9_-]+`, so JQL orphan recovery can detect and
   adopt a transient-failure re-create instead of producing a live dupe with no
   local record.

6. **A mandatory dry-run preview gates creation.** Clicking "Send to JIRA"
   renders the full hierarchy it will create (Epic + Stories + Subtasks + parent
   links + thin-body and already-exists warnings) and pauses for explicit
   operator confirmation before any `createJiraIssue` call. This is the direct
   antidote to the duplicate-Epic class found in the audit.

7. **v1 scope is create-only.** Status-sync (`sync-status`) is deferred.

## Consequences

- The valuable parts of the `concierge-jira` protocol are retained — the
  Spec→Phase→Task DAG, dry-run preflight, disk-truth gate, idempotency labels,
  JQL orphan recovery, atomic `tmp`+rename state writes, and the four-check
  verification predicate. Only the per-ticket LLM filer (step 5's shell-out) is
  replaced by deterministic app code driving one bounded CLI turn per ticket.
- Reliability at scale improves: the bulk-run failure mode (LLM losing
  discipline across dozens of sequential turns) is removed because iteration and
  state are deterministic application code.
- Ticket-body quality is preserved without a per-ticket LLM, because the app
  renders rich descriptions itself.
- The invisible-dupe risk is bounded by enforcing one idempotency-label format
  and JQL orphan recovery; the dry-run gate adds a human checkpoint.
- Principle X / ADR-0015 remain satisfied: every Atlassian MCP call is made by
  the Bound CLI; the Concierge App orchestrates and verifies but never calls
  Atlassian directly.
- The `CONTEXT.md` `JIRA Submission` glossary entry was updated to match this
  decision (the prior per-ticket-agent wording was contradicted by the evidence
  above).
- The pre-existing throwaway tickets in SKC-1..24 (3 duplicate Foundation Epics
  + smoke/diagnostic tickets) are out of scope for this feature; cleanup, if
  desired, is a separate manual action.
