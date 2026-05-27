---
description: File one Jira ticket deterministically with idempotent create plus read-back
  verify plus state-record write. Invoked per-ticket by the speckit.concierge-jira.specstoissues
  outer agent via bash shell-out to a fresh Copilot process.
model: gpt-5-mini
effort: low
tools:
- read
- edit
- bash
- atlassian/createJiraIssue
- atlassian/searchJiraIssuesUsingJql
- atlassian/getJiraIssue
---


<!-- Extension: concierge-jira -->
<!-- Config: .specify/extensions/concierge-jira/ -->
# File One Jira Ticket

File exactly one Jira issue from a JSON payload. This command is invoked by `/speckit.concierge-jira.specstoissues` through a bash shell-out so every ticket runs in an isolated `gpt-5-mini` process.

## Prerequisites

1. Atlassian MCP server is registered as `atlassian`.
2. Config exists at `.specify/extensions/concierge-jira/jira-config.yml`.
3. The config contains `atlassian_cloud_id` and `project.key`.
4. `$ARGUMENTS` is one JSON object for one ticket.

## Input Contract

Required JSON fields:

- `idempotency_id`
- `state_dir`
- `project_key`
- `issue_type`
- `summary`
- `description`
- `labels`
- `parent_key`
- optional `relationship_field`

`idempotency_id`, `project_key`, and every caller-supplied label must match `[a-zA-Z0-9_-]+`. Caller labels are base labels only; reject incoming labels matching `[A-Z0-9]+-idem-[a-fA-F0-9]{12}` because this command derives the idempotency label after hashing.

## Protocol

### 0. Entry Trace

Before doing any other work, derive `state_dir` from the input JSON if possible, otherwise use `/tmp/concierge-jira-filer`. Run `mkdir -p <state_dir>` and append exactly one line to `{state_dir}/_filer.debug.log`:

```text
[ISO-8601 timestamp] FILER_ENTRY idempotency_id=<raw idempotency_id> arg_length=<length of $ARGUMENTS>
```

### 1. Validate, Normalize, Hash

Parse `$ARGUMENTS` as JSON. If parsing or validation fails, return one single-line JSON summary with `status: "invalid"`; if a safe state path is available, write the same invalid state atomically.

Normalize the payload before generated labels are added:

1. sort object keys recursively
2. preserve array order
3. NFC-normalize strings
4. serialize compact JSON without trailing whitespace

Compute `payload_hash = sha256(normalized_payload)`. Let `hash12` be the first 12 hex characters. Derive `idempotency_label = <project_key>-idem-<hash12>` where `project_key` comes from `jira-config.yml` `project.key`. Validate the derived label matches `[a-zA-Z0-9_-]+` and is no longer than 255 chars. The generated label is excluded from the hash input and then appended to Jira labels.

### 2. State Record Shape

Terminal statuses are exactly `verified`, `duplicate`, `failed`, `skipped`, `orphaned`, and `invalid`. The only transient status is `creating`. Note: `created` is NOT a terminal status; it is a legacy label for the intermediate state between create call and verification. After Step 8 passes, the status is `verified`.

Every state record includes:

```json
{
  "idempotency_id": "...",
  "status": "creating",
  "issue_key": null,
  "issue_url": null,
  "payload_hash": "...",
  "idempotency_label": "PROJ-idem-abcdef123456",
  "attempts": 0,
  "started_at": "ISO-8601 timestamp",
  "completed_at": null,
  "agent_model": "gpt-5-mini",
  "agent_effort": "low",
  "copilot_session_id": null,
  "cost_multiplier": 0,
  "orphan_jql": null,
  "orphan_match": null,
  "error": null
}
```

### 3. Atomic Writes

For every state transition:

```bash
mkdir -p "${state_dir}"
write complete JSON to "${state_dir}/${idempotency_id}.tmp"
mv "${state_dir}/${idempotency_id}.tmp" "${state_dir}/${idempotency_id}.json"
```

Use a unique temp suffix when needed, but the final state file is always `{state_dir}/{idempotency_id}.json`.

### 4. Existing State

State-file absence on first call is normal. If `{state_dir}/{idempotency_id}.json` does not exist, continue. Do not return an error.

If the file exists and `payload_hash` matches with status `verified`, `duplicate`, or `orphaned`, return `duplicate` without creating a new Jira issue. If the existing hash differs, atomically write `invalid` and return a single-line JSON summary explaining the mismatch.

### 5. Orphan Search Before Create

Before creating, and again after any 5xx/network/ambiguous response, run JQL orphan detection using the generated label:

```jql
project = <project_key> AND labels = "<project_key>-idem-<hash12>" ORDER BY created DESC
```

Call `atlassian/searchJiraIssuesUsingJql` with `cloudId` from `atlassian_cloud_id`. If a candidate exists, call `atlassian/getJiraIssue` with the same `cloudId` and verify it using Step 8. If verified, write `orphaned` with `orphan_match` and return.

### 6. Creating State

Before `createJiraIssue`, atomically write `creating` with attempts `0`, `issue_key: null`, `issue_url: null`, `agent_model: "gpt-5-mini"`, `agent_effort: "low"`, and `cost_multiplier: 0`.

### 7. Create Jira Issue

Call `atlassian/createJiraIssue` with explicit `cloudId`:

```json
{
  "cloudId": "<atlassian_cloud_id>",
  "projectKey": "<project_key>",
  "issueTypeName": "<issue_type>",
  "summary": "<summary>",
  "description": "<description>",
  "parent": "<parent_key — used only for Sub-task/Subtask direct parent linkage>",
  "additional_fields": {
    "labels": ["<base labels>", "<project_key>-idem-<hash12>"],
    "parent": {"key": "<epic_key — used only for Story-under-Epic in team-managed Jira>"}
  }
}
```

Labels must be inside `additional_fields.labels`, never a top-level `labels` parameter. Subtask-to-Story parent linkage uses top-level `parent` (string). Story-to-Epic parent linkage in team-managed Jira uses `additional_fields.parent` as an object `{"key": "<epic_key>"}` — not the top-level `parent` string parameter and not `customfield_10014`.

Relationship branching:

1. `parent_key == null`: omit `parent` and parent-related additional fields.
2. `issue_type` is `Sub-task` or `Subtask`: set top-level `parent` (string) to `parent_key`.
3. non-subtask (e.g. Story) with `relationship_field == null` and `parent_key != null`: merge `{"parent": {"key": parent_key}}` into `additional_fields`; do **not** set top-level `parent` and do **not** use `customfield_10014`. This handles team-managed Jira Story-under-Epic linkage. Evidence: live SKC validation (SKC-15..SKC-19) confirmed top-level `parent` string is silently ignored for Story-under-Epic in team-managed projects.
4. `relationship_field == "Epic Link"` or a configured custom field id: set the Epic Link custom field in `additional_fields`; do not also set top-level `parent`.
5. other relationship values are out of scope for this filer; create the issue without parent linkage and let the orchestrator handle links if supported.

Retry policy: on 5xx, network error, or ambiguous response, wait 2 seconds, retry once, then run the JQL orphan search. On 4xx validation/configuration errors, write `invalid`. If no verified issue exists after retry and orphan search, write `failed`.

### 8. Four-Check Verification

After create or orphan recovery, call `atlassian/getJiraIssue` with `cloudId` and verify exactly these four checks:

1. issue key was returned
2. issue is fetchable via `getJiraIssue`
3. summary matches expected summary exactly
4. status is present and is not `undefined`

Do not compare description byte-for-byte.

If all four checks pass, write the terminal state record with `status: "verified"`. If any check fails, write the terminal state record with `status: "verify_mismatch"` and include the failing check details in the `error` field. Do not write `status: "created"` as a terminal status.

### 9. Return Contract

Write terminal state atomically and return exactly one single-line JSON object:

```json
{"idempotency_id":"...","status":"verified","issue_key":"PROJ-123","issue_url":"https://example.atlassian.net/browse/PROJ-123","attempts":1,"orphan_match":null,"error":null}
```