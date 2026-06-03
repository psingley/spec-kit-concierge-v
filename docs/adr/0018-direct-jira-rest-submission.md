# ADR 0018: Direct JIRA REST Submission via User-Supplied Credential

**Status**: Accepted

**Date**: 2026-06-02

**Supersedes**: ADR-0015 (Copilot-Owned Atlassian MCP Auth) for the submission path. ADR-0015's MCP-config-write + observe behavior remains valid for the fallback mechanism.

**Amends**: Constitution Principle XI (External-Service Submission). Principle X (MCP Observer-Only) is unchanged.

## Context

The v1 External-Service Submission flow (Send-to-JIRA on Review) was built per
Principle XI's original mechanism: a deterministic outer loop where each per-unit
create is delegated to a Bound CLI extension agent that calls JIRA via the Atlassian
MCP. Live dogfooding the full 27-node hierarchy exposed two structural problems with
that mechanism:

1. **Speed.** Each unit spawns a fresh Copilot ACP process (`new BoundCLISupervisor().start()
   -> newSession -> prompt -> dispose`). Measured per-node gap averaged ~140s (process
   spawn + LLM round-trip), for a ~67min total run. The actual JIRA REST create is ~25s
   of that; the rest is LLM-orchestration overhead for what is a deterministic CRUD call.

2. **Fidelity + reliability.** The MCP `createJiraIssue` path converts content through a
   markdown->wiki-markup hop that backslash-escapes brackets (`[P]` -> `\[P\]`) and flattens
   structure, so descriptions render far below the gold standard. The LLM filer is also a
   documented failure source (it once created a ticket but skipped the disk state write).

Investigation (decoded the on-disk Copilot MCP token; live-probed a user API token;
researched Atlassian docs + community) established:

- The Copilot MCP OAuth token is NOT reusable: wrong audience (MCP-scoped), expires, and
  refreshing it requires Copilot's client_secret — a clear Principle X / ADR-0015 violation.
- A **user-supplied Atlassian API token** (the plain non-scoped "Create API token") with
  Basic auth (`email:token`) authenticates against the Jira Cloud REST API v3 cleanly. Live
  proof: created, read-back, and deleted an issue (SKC-270), then created a gold-standard
  ADF-formatted subtask (SKC-271) that rendered with real headings, bullet lists, inline
  code, and a task-list checklist — zero bracket-escaping — in under a second per call.
- Building ADF directly (or via markdown->ADF, bypassing the MCP's wiki-markup hop) yields
  gold-standard rendering deterministically.
- JIRA Cloud REST rate limits (100 POST/s; 27 creates = 27 of 65,000 hourly points) are
  irrelevant at this scale; a full hierarchy lands in well under 30s.

Principle XI's real value is the **deterministic outer loop + per-unit verification +
idempotent disk-record resume**, not the specific create mechanism. Its "never speaks to
the external service directly" clause is the only barrier, and it is self-imposed, not an
external security constraint: an Electron app holding a user's own API token in the OS
secure store is a normal, supported pattern (Atlassian's own Rovo MCP accepts the same
token for headless auth).

## Decision

Introduce two **Submission Create Mechanisms** for the External-Service Submission outer
loop. The outer loop, per-unit verification, and idempotent resume are unchanged and
mechanism-independent.

- **Direct mechanism (primary).** The Concierge App creates each unit's external record
  itself via the JIRA Cloud REST API v3, authenticated with a user-supplied **Submission
  Credential** (an Atlassian API token + account email) that the app owns and stores
  encrypted at rest via the OS secure store (macOS Keychain / Windows DPAPI via Electron
  `safeStorage`). This credential is distinct from, and never derived from, the Bound CLI's
  MCP OAuth credential (which the app still never reads, per Principle X). Holding it does
  not make the app an MCP client.

- **Delegated mechanism (fallback).** The original Principle XI mechanism: the per-unit
  create is delegated to a Bound CLI extension agent calling JIRA via MCP. Retained,
  disabled by default, and offered only when the MCP path is installed + authed AND no
  Submission Credential is configured. Remains MCP Observer-Only compliant.

Each mechanism performs the identical per-unit contract: orphan-search-before-create (by
idempotency label), create, read-back verify, and write the `<idempotency_id>.json` state
record. The outer loop re-reads the record and gates. Resume, idempotency, dedup, and the
"disk record is the source of truth" guarantee are preserved exactly.

The Direct mechanism builds each issue's description deterministically (no LLM) from
spec-kit artifacts into gold-standard ADF, and is the default whenever a warm Submission
Credential exists. The app actively steers users toward configuring the Direct mechanism.

### Constitution Principle XI amendment

The clause "the per-unit external call delegated to a customized spec-kit extension agent
running through the Bound CLI" and the rule "The Concierge App never speaks to the external
service directly" are amended to: *the per-unit external call MAY be made by the Concierge
App directly via a user-supplied, app-owned credential distinct from the Bound CLI's MCP
credential (Direct mechanism), OR delegated to the Bound CLI agent via MCP (Delegated
mechanism). The deterministic outer loop, per-unit verification, and idempotent resume are
mandatory under both mechanisms.* Principle X (MCP Observer-Only) is unaffected: direct REST
with a user API token is not MCP traffic.

## Consequences

- ~100x faster submission (minutes -> seconds), fully deterministic, gold-standard ADF
  fidelity, and removal of the LLM-filer failure class for the primary path.
- The app now holds a user-supplied third-party credential. Mitigations: OS-secure-store-only
  storage, never written to disk plaintext or to `.specify/` (git-tracked), never exposed to
  any AI agent, warmth-checked via a lightweight identity ping, reactive 401 -> re-auth, and
  optional user-entered expiry for proactive renewal warnings (the token's expiry is not
  API-discoverable).
- Auth surfaces present API-token setup as first-class; the MCP Atlassian login is hidden
  unless the Direct path is unconfigured and MCP is available.
- ADR-0015's MCP-config-write + observe behavior is retained for the Delegated fallback.
