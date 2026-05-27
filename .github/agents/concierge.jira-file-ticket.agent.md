---
description: File one Jira ticket deterministically — idempotent create + read-back verify + state-record write. Invoked per-ticket by the concierge-jira outer agent.
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

This agent files exactly one Jira issue from a JSON payload and writes a
per-ticket state record for the Concierge JIRA outer loop.

Invoke this custom agent with `/agent concierge.jira-file-ticket`, not as a
slash-command prompt file. The prompt pointer only routes humans toward this
agent; the model and tool frontmatter are honored on the custom-agent path.

## Prerequisites

1. Atlassian MCP server configured as `atlassian`
2. Jira configuration file exists: `.specify/extensions/concierge-jira/jira-config.yml`
3. A JSON payload is provided in `$ARGUMENTS`

## User Input

$ARGUMENTS

The input must be a JSON object with:

- `idempotency_id`
- `state_dir`
- `project_key`
- `issue_type`
- `summary`
- `description`
- `labels`
- `parent_key`
- optional `relationship_field`

`idempotency_id` and every caller-supplied label must match
`[a-zA-Z0-9_-]+`. Caller-supplied `labels` are base labels only; reject any
incoming label beginning with `skc-idem-` because this agent derives that label
after hashing.

## Steps

### 0. Write Entry Trace (debugging)

Before doing ANY other work, write a debug trace line to
`{state_dir}/_filer.debug.log` (use `{state_dir}` derived from the input
JSON if parseable, else `/tmp/concierge-filer.debug.log` as fallback):

```
[ISO-8601 timestamp] FILER_ENTRY idempotency_id={raw idempotency_id} arg_length={length of $ARGUMENTS}
```

Use `mkdir -p` + atomic append. This proves the filer started executing.

### 1. Parse, Validate, Normalize, And Hash Payload

Parse `$ARGUMENTS` as JSON. Reject the payload if any required field is
missing, if `labels` is not an array, if `idempotency_id` fails
`[a-zA-Z0-9_-]+`, or if any label fails `[a-zA-Z0-9_-]+`.

If validation fails, abort before constructing any JQL string and return a
single-line JSON object with `status: "create_failed"` and explanatory error
detail. If a safe state file can already be addressed, write the same
`create_failed` status atomically.

Normalize the payload before adding any generated idempotency label:

1. sort object keys recursively for every nested object
2. preserve array order exactly as provided
3. NFC-normalize every string value
4. serialize as compact JSON with no insignificant whitespace and no trailing
   whitespace

Compute `payload_hash` as SHA-256 of that normalized payload. Then derive:

```bash
state_file="{state_dir}/{idempotency_id}.json"
idempotency_label="skc-idem-${payload_hash:0:12}"
```

Add `idempotency_label` to the Jira submission labels only after computing
`payload_hash`. The generated label must not be included in the hash input.
The label format is `skc-idem-<hash12>`: a hyphen-separated `skc-idem-`
prefix plus the first 12 characters of `payload_hash`, never a colon and never
derived from `idempotency_id`. Jira labels have a 255-character limit. The
`skc-idem-<hash12>` format uses 18 characters total (9 prefix + 12 hash), well
within the limit.

### 2. Capture Agent Metadata

Every state record must include:

- `agent_model`: `gpt-5-mini`
- `agent_effort`: the current effort level if available, otherwise `null`
- `copilot_session_id`: `$COPILOT_SESSION_ID` if set; otherwise the latest
  directory under `~/.copilot/session-state/` that matches session start time;
  otherwise `null`
- `cost_multiplier`: use the current model multiplier table below.

| Model | Multiplier |
|---|---:|
| `gpt-5-mini` | 0 |
| `gpt-4.1` | 0 |
| `gpt-5.4-mini` | 0.33 |
| `claude-haiku-4.5` | 0.33 |
| `gpt-5.4` | 1 |
| `gpt-5.3-codex` | 1 |
| `gpt-5.2-codex` | 1 |
| `gpt-5.2` | 1 |
| `claude-sonnet-4.5` | 1 |
| `claude-sonnet-4.6` | 1 |
| `gpt-5.5` | 7.5 |
| `claude-opus-4.7` | 15 |

If `copilot_session_id` cannot be found, preserve `null` as an honest
observability gap.

### 3. Atomic State Write Helper

For every state transition:

1. run `mkdir -p "{state_dir}"`
2. write the complete JSON record to a unique temporary file in the same
   directory, for example `{state_file}.tmp.{pid}.{timestamp}`
3. atomically rename the temporary file to `state_file`

Use this helper for `creating`, retry updates, `verified`, and every terminal
failure status.

### 4. Read Existing State

**IMPORTANT:** `state_file` not existing is the NORMAL case for a fresh ticket. If a view/read of the state file returns "file not found" or any equivalent error, this is a fresh idempotency_id with NO prior state. **DO NOT halt or return create_failed.** Skip ahead to Step 5 (orphan check), then Step 6 (write creating state), then Step 7 (create the Jira issue). Treat the absence of a state file as the expected first-call condition.

If `state_file` DOES exist, read it from disk before calling Jira.

If the existing state has `status == "verified"` and its `payload_hash`
matches the incoming `payload_hash`, do not call Jira. Return exactly one
single-line JSON object:

```json
{"idempotency_id":"...","status":"already_verified","live_key":"...","live_url":"...","attempts":0,"error":null}
```

If the existing state has the same `idempotency_id` but a different
`payload_hash`, atomically write a terminal `payload_hash_mismatch` record
with an error naming the mismatch. Return exactly one single-line JSON object
with `status: "payload_hash_mismatch"`.

### 5. Recover Partial Creating State

If the existing state has `status == "creating"`, query Jira for possible
orphaned issues before creating anything new. Validate `idempotency_id` before
constructing the JQL string.

```jql
project = '{project_key}' AND labels = '{idempotency_label}'
```

Use `searchJiraIssuesUsingJql` with that exact JQL. **Always pass `cloudId` from `atlassian_cloud_id` in `.specify/extensions/concierge-jira/jira-config.yml` as a required parameter on every Atlassian MCP call (createJiraIssue, getJiraIssue, searchJiraIssuesUsingJql). Do NOT rely on auto-resolve — it fails in sub-agent runtimes.**

If exactly one issue is found, call `getJiraIssue` for that key and verify it
using Step 8. If verification passes, write `verified` and return a single-line
JSON summary. If verification fails, write `verify_mismatch` and stop.

If more than one issue is found with the same label, log a warning listing the
candidate keys, choose the issue with the latest `created` date, and verify
that candidate with Step 8. If no issue is found, continue to create.

### 6. Write Creating State

Before calling `createJiraIssue`, atomically write `state_file` with:

```json
{
  "idempotency_id": "...",
  "status": "creating",
  "live_key": null,
  "live_url": null,
  "payload_hash": "...",
  "attempts": 0,
  "started_at": "ISO-8601 timestamp",
  "verified_at": null,
  "agent_model": "gpt-5-mini",
  "agent_effort": null,
  "copilot_session_id": null,
  "cost_multiplier": 0,
  "error": null
}
```

### 7. Create Jira Issue With Retry

Call `createJiraIssue` with the base labels plus `idempotency_label`:

```text
Tool: atlassian/createJiraIssue
Parameters:
  - cloudId: {atlassian_cloud_id from jira-config.yml}
  - projectKey: {project_key}
  - issueTypeName: {issue_type}
  - summary: {summary}
  - description: {description}
  - additional_fields: {
      "labels": {labels plus idempotency_label},
      [parent linkage per branching rules below — see Relationship branching]
    }

**CRITICAL:** Labels MUST be passed inside additional_fields, NOT as a top-level
parameter. Top-level labels are silently dropped by the Atlassian MCP for at
least Epic issue types (verified empirically: SKC-2 created with top-level
labels parameter returned labels:[]; SKC-3 created with additional_fields.labels
returned all 4 labels attached). Same rule for parent linkage — every parent
field goes inside additional_fields.
```

Relationship branching (CORRECTED 2026-05-27 from empirical failure diag of phase-1 story):

The Atlassian MCP's `createJiraIssue` has a TOP-LEVEL `parent` parameter (string,
issue key). Use it for direct Jira parent linkage on BOTH Subtasks and
Stories-under-Epics in team-managed projects. Do NOT pass `"Parent"` (capital P)
as a key inside `additional_fields` — that gets interpreted as a custom field
name and Jira rejects with "Field 'Parent' cannot be set" (verified empirically:
SKC-10 Epic verified; phase-1 Story create_failed with this exact error when
filer wrote `additional_fields: {"Parent": "SKC-10"}`).

1. If `parent_key` is `null`, omit `parent` from the top-level call and omit
   any parent-related fields from `additional_fields`.
2. If `issue_type` is `Sub-task` or `Subtask`, pass `parent_key` as the
   TOP-LEVEL `parent` parameter (string value, e.g. `"parent": "SKC-10"`).
   Do NOT pass anything for parent inside `additional_fields`.
3. If `issue_type` is `Story` (or other non-Subtask) AND `relationship_field`
   is null/absent AND `parent_key` is not null, pass `parent_key` as the
   TOP-LEVEL `parent` parameter (same as Subtask case). This is the team-managed
   Story-under-Epic linkage and is the path SKC uses.
4. If `relationship_field` is the literal string `"Epic Link"` (company-managed
   legacy projects) AND `parent_key` is not null, set the Epic Link custom field
   inside `additional_fields`. Use `customfield_10014` unless the caller passed
   a different configured field id. Do NOT also set the top-level `parent`.
5. If `relationship_field` is any other value (`"Relates"`, `"Blocks"`,
   `"Implements"`, `"is child of"`, `"none"`), the filer does NOT set parent
   linkage at create time — these are post-create issue links and are out of
   scope for this filer protocol.

Attempt creation at most five total times.

On Jira 429 responses, back off and retry `createJiraIssue` directly. The wait
before the next retry is:

```text
min(2^attempt + jitter, 60s)
jitter = random() * 0.5
```

After each failed attempt, atomically update `attempts` and `error` in
`state_file`. After five 429 attempts, write `rate_limit_exhausted` and return
one single-line JSON summary.

On Jira 5xx responses, network errors, or ambiguous responses such as timeout
or no response, run the JQL orphan search from Step 5 using the derived
`idempotency_label` before retrying creation. If exactly one orphan is found,
call `getJiraIssue`, verify it with Step 8, and proceed from the verification
result. If multiple orphans are found, choose the issue with the latest
`created` date, verify that candidate with Step 8, and proceed from the
verification result. If no orphan is found after a 5-second settle period, retry
`createJiraIssue`. After five total attempts, write `create_failed` and return
one single-line JSON summary.

On Jira 4xx responses other than 429, write terminal `create_failed` and return
one single-line JSON summary. Do not retry.

### 8. Verify Live Jira Issue

After creation, or after recovering an orphan from Step 5, call `getJiraIssue`
for the live issue key.

Before declaring a duplicate or a verified create, require the found issue and
its key to be non-null and non-empty.

Verify only all of the following before writing `verified`:

1. the live description field is non-null and non-empty
2. the live summary matches `summary`
3. the live parent key matches `parent_key` whenever `parent_key` is not null
4. the live labels array includes `idempotency_label`

Do not compare the live description content byte-for-byte; only verify that it
exists and is non-empty. If any required check fails, write `verify_mismatch`
with a concise error explaining the mismatch. Return one single-line JSON
summary and do not claim success.

### 9. Write Final State Record

On successful verification, atomically write:

```json
{
  "idempotency_id": "...",
  "status": "verified",
  "live_key": "PROJ-123",
  "live_url": "https://your-jira.atlassian.net/browse/PROJ-123",
  "payload_hash": "...",
  "attempts": 1,
  "started_at": "ISO-8601 timestamp",
  "verified_at": "ISO-8601 timestamp",
  "agent_model": "gpt-5-mini",
  "agent_effort": null,
  "copilot_session_id": null,
  "cost_multiplier": 0,
  "error": null
}
```

Return exactly one single-line JSON object:

```json
{"idempotency_id":"...","status":"verified","live_key":"PROJ-123","live_url":"https://your-jira.atlassian.net/browse/PROJ-123","attempts":1,"error":null}
```

## Notes

- This agent handles one ticket only.
- The caller owns DAG ordering, parent-key substitution, relationship selection,
  and `jira-mapping.json` compilation.
- Disk state is authoritative. Do not rely on stream prose as proof.
- Never create a duplicate when a matching verified state record already
  exists.
- The cost rollup is a model-multiplier estimate, not true Premium request
  cost; the filer cannot reliably capture token counts.
