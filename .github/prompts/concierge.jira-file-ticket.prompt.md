---
agent: concierge.jira-file-ticket
model: gpt-5-mini
---

# Concierge Jira Filer Prompt Pointer

This file is a pointer to the `concierge.jira-file-ticket` custom agent.
`docs/jira-submission-protocol.md` is the authoritative protocol document.

## Invocation

Recommended invocation form:

```text
/agent concierge.jira-file-ticket
```

Do not invoke this pointer as a slash command such as
`/concierge.jira-file-ticket`. Slash-command prompt files do not honor custom
agent frontmatter model or effort overrides; use the `/agent` form so the filer
agent's `model`, `effort`, and Atlassian MCP tool frontmatter are used.

## Input JSON

Provide exactly one JSON object with all 9 fields:

| Field | Description |
|---|---|
| `idempotency_id` | Stable local unit id. Must match `[a-zA-Z0-9_-]+`. |
| `state_dir` | Directory for per-ticket state records. |
| `project_key` | Jira project key. |
| `issue_type` | Jira issue type name. |
| `summary` | Expected live Jira summary. |
| `description` | Jira issue body. Verification only checks that the live field is non-null and non-empty. |
| `labels` | Base Jira labels. Do not include `skc-idem-*`; the filer derives that label. |
| `parent_key` | Expected parent issue key, or `null`. |
| `relationship_field` | Optional custom field id for company-managed Epic Link relationships, or `null`. |

`idempotency_id` validation regex: `[a-zA-Z0-9_-]+`.

## Idempotency Label

The filer computes `payload_hash` from the normalized payload before adding
the generated label. It then derives:

```text
skc-idem-<hash12>
```

`hash12` is the first 12 characters of `payload_hash`. The label is computed
from the hash, not from `idempotency_id`. It is hyphen-separated, uses no
colon, and is Jira-safe. Jira labels have a 255-character limit. The
`skc-idem-<hash12>` format uses 18 characters total (9 prefix + 12 hash), well
within the limit.

## Output JSON

Return exactly one single-line JSON object:

```json
{"idempotency_id":"...","status":"verified","live_key":"PROJ-123","live_url":"https://example.atlassian.net/browse/PROJ-123","attempts":1,"error":null}
```

Terminal status values surfaced by this pointer are:

- `verified`
- `payload_hash_mismatch`
- `create_failed`
- `rate_limit_exhausted`
- `verify_mismatch`
- `already_verified`

## State Record

State-record location:

```text
<state_dir>/<idempotency_id>.json
```

Every state write uses the atomic tmp-and-rename pattern: write the complete
JSON record to a unique temporary file in the same directory, then rename it to
the final state-record path.

The outer `speckit.concierge-jira.specstoissues` agent is responsible for
preparing the payload and reading the resulting state record from disk.
