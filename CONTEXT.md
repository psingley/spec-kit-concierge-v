# Context Glossary — Spec-Kit Concierge

A glossary of the ubiquitous language. Terms only. No implementation details.

## External-Service Submission

A Concierge-orchestrated outer loop that creates external records (the v1 instance
is Send-to-JIRA on the Review stage) one unit-of-work at a time, with per-unit
verification and idempotent resume. The deterministic loop, per-unit verification,
and idempotency are mandatory and mechanism-independent (Principle XI).

## Submission Create Mechanism

The means by which a single unit's external record is created inside the outer loop.
Two mechanisms exist:

- **Direct mechanism** — the Concierge App creates the record itself via the
  external service's REST API, authenticated with a user-supplied, app-owned
  credential. Distinct from the Bound CLI's MCP credential. (Primary path.)
- **Delegated mechanism** — the Concierge App delegates the per-unit create to a
  Bound CLI extension agent, which calls the external service via MCP. (Fallback
  path for users without a direct credential.) This is the original Principle XI
  mechanism and remains MCP Observer-Only compliant.

The choice of mechanism never changes the outer loop, verification, or idempotency.

## Submission Credential

A user-supplied API token the Concierge App owns and stores, used only by the Direct
mechanism. Distinct from, and never derived from, the Bound CLI's MCP OAuth
credential (which the app never reads, per Principle X). Holding a Submission
Credential does not make the app an MCP client.

## Submission Credential (refined)

A user-supplied Atlassian API token (the plain non-scoped "Create API token" variant)
plus the account email, used by the Direct mechanism via Basic auth. Stored encrypted
at rest via the OS secure store (macOS Keychain / Windows DPAPI). Must persist across
app restarts. Never exposed to any AI agent.

- **Warmth** — whether the stored credential still authenticates. Determined by a
  lightweight identity ping; a 200 means warm, a 401 means expired/revoked/logged-out.
  The token's expiry date is NOT discoverable via API; it is optionally captured at
  entry (the user can read it from the Atlassian token page) for a proactive renewal
  warning. A 401 on any call is the authoritative reactive signal.

## Repo→Board Mapping

A per-repository association between the local repository and the JIRA project the
repository's tickets are created in. Owned by the app (per-machine, not committed to
the repo), seeded from the repository's jira-config.yml project key when present, and
remembered per repository. Surfaced and editable in the top bar for the active repo,
and in settings. The app suggests a likely board from the user's own recent JIRA
project activity.

## Submission State Record

The per-unit `<idempotency_id>.json` file on disk that is the visible source of truth
for both UI and crash-recovery (Principle XI). Identical under both mechanisms: each
unit's create — whether Direct (app REST) or Delegated (agent MCP) — performs
orphan-search-before-create, creates the record, read-back-verifies, and writes the
state record with id/payload-hash/idempotency-label/issue-key/issue-url/status. The
outer loop re-reads it and gates. The Direct mechanism additionally enables fine-grained
live per-unit progress (creating → verifying → verified) because the app owns each step.

## Ticket Document

The structured description rendered onto a JIRA issue, built deterministically from the
spec-kit artifacts (no LLM). The app parses spec.md/tasks.md (and optionally plan.md)
into a typed intermediate model with warnings — every extraction optional, never crashing,
never producing an empty body — then renders gold-standard sections (Contributes-to,
Acceptance Criteria, Affected files, Done when, etc.) as markdown and converts to ADF via
marklassian for the Direct mechanism. Build tags (`[P]`, `[USn]`) are stripped from prose.
Every created issue is read-back-verified.
