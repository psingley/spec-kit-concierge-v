---
description: "Create Jira hierarchy from spec and tasks"
tools: ['read', 'search', 'edit', 'bash']
---

# Create Jira Issues from Spec and Tasks

This command is the outer orchestrator for Concierge Jira. It reads local spec-kit artifacts, builds a Jira submission DAG, then delegates each single-ticket create/verify/write operation to `/speckit.concierge-jira.file-ticket` through a bash shell-out.

> [!WARNING]
> ANTI-PATTERN — do not use an in-session `task` tool to invoke `file-ticket`. Always use bash shell-out so each filer runs isolated with `gpt-5-mini` and writes disk truth independently.

## Prerequisites

1. Jira config exists at `.specify/extensions/concierge-jira/jira-config.yml`.
2. Config includes `atlassian_cloud_id` and `project.key`.
3. Specification directory contains `spec.md` and `tasks.md`.
4. `/speckit.concierge-jira.file-ticket` is installed from `commands/file-ticket.md`.

## User Input

$ARGUMENTS

Accepts optional `--spec <name>`. If omitted, detect from current spec directory, current git branch, or the only available `specs/<name>` directory.

## Orchestrator Flow

### 1. Detect Inputs

Resolve `spec_name`, `spec_dir`, `spec.md`, `tasks.md`, and `.specify/extensions/concierge-jira/jira-config.yml`. Read `project.key`, `atlassian_cloud_id`, artifact mappings, relationship mappings, default labels, and custom fields.

Use `project.key` as the `project_key` for every filer payload. Generated idempotency labels must use `<project_key>-idem-<hash12>`; never use a hardcoded project prefix.

### 2. Parse Source Artifacts

Read `spec.md` and extract the spec title, scope summary, outcomes, constraints, and acceptance highlights. Read `tasks.md` and extract phases, task IDs, checkbox status, task text, file paths, user-story hints, goals, independent tests, and acceptance-criteria bullets.

### 3. Dry-Run Preview

Before any filer invocation, render a read-only dry-run preview of the hierarchy and pause for explicit operator approval. The preview must include the Epic, Phase issues, task/subtask issues, expected parent relationships, and warnings for thin ticket bodies. Do not write `jira-mapping.json` during dry run.

### 4. Build Submission DAG

Build a deterministic DAG in this order:

```text
Spec issue -> Phase issues -> Task issues
```

Each DAG node must include:

- `idempotency_id` matching `[a-zA-Z0-9_-]+`
- `state_dir`, normally `specs/<spec-name>/jira-submission-state`
- `project_key`
- `issue_type`
- `summary`
- `description`
- rendered `labels`, including the app-derived idempotency label
- `parent_key`, initially null for children until parent state is read from disk
- app-computed `payload_hash`
- app-derived `idempotency_label`
- optional `relationship_field`

In 2-level mode, omit task issue nodes and embed tasks in Phase descriptions.

### 5. Delegate Each Ticket via Bash

For each DAG node, write or construct one compact JSON payload and invoke the filer through bash shell-out. The exact shell command depends on the host agent runtime, but it must start a fresh command/agent process for each ticket. Example shape:

```bash
PAYLOAD='<one-ticket-json>'
claude -p "/speckit.concierge-jira.file-ticket ${PAYLOAD}"
```

Do not call Atlassian MCP tools from this orchestrator. Do not use an in-session `task` tool. Do not proceed based on filer stdout alone.

### 6. Disk-Truth Gate

After every filer invocation, read `{state_dir}/{idempotency_id}.json` from disk before claiming success or advancing child nodes.

A ticket can advance the DAG only when the state file exists and `status` is `verified` or `duplicate`. For `orphaned`, surface the recovered issue and require an operator decision before continuing unless the run policy explicitly allows orphan adoption. For `failed`, `skipped`, `invalid`, missing file, malformed JSON, payload-hash mismatch, or missing issue key, halt the run and print the state file contents.

Before claiming a ticket was filed successfully, the disk-truth gate must verify `status = "verified"` or `status = "duplicate"` from the state file itself.

### 7. Parent Threading

For child nodes, read the parent node's state file and take the parent Jira key from `issue_key` (or compatible `live_key` if present). Inject that value into the child payload as `parent_key` only after the parent passes the disk-truth gate.

Use top-level `parent` semantics in the filer for team-managed Jira. For company-managed Epic Link relationships, pass the configured `relationship_field` or `customfield_10014` for the filer to place inside `additional_fields`.

### 8. Mapping Write

After all requested nodes pass disk truth, compile `specs/<spec-name>/jira-mapping.json` from state files, not from intended payloads. Include the mode, issue keys, URLs, parent keys, summaries, task IDs, and metadata rollup.

### 9. Cost and Observability Rollup

After all tickets are filed, output a summary table with:

| ticket key | state-file status | issue key | orphan JQL match |
|---|---|---|---|
| `<idempotency_id>` | `<status>` | `<issue_key>` | `<orphan_match>` |

Also include a metadata summary with filer model, effort, session IDs when present, and `cost_multiplier`. Per-ticket filer cost is `gpt-5-mini = 0x Premium tokens`; report this as a multiplier rollup, not a true token count.

## Protocol Rules Propagated to the Filer

- Atomic state writes: `mkdir -p <state_dir>`, write `<state_dir>/<ticket>.tmp`, rename to `<state_dir>/<ticket>.json`.
- Missing state file on first call is normal and must not be treated as an error.
- Step 0 entry trace appends one line to `{state_dir}/_filer.debug.log` at filer start.
- Five-check verification predicate: issue key returned, issue fetchable via `getJiraIssue`, summary matches, parent matches when `parent_key` is not null, and labels include the supplied idempotency label. Do not compare descriptions byte-for-byte.
- Idempotency label format is `<project_key>-idem-<hash12>`, derived by the app from the app-computed `payload_hash`, validated against `[a-zA-Z0-9_-]+`, and limited to 255 chars. The filer echoes the supplied `payload_hash` and `idempotency_label` verbatim; it must not recompute a hash.
- Terminal statuses are exactly `verified`, `duplicate`, `failed`, `skipped`, `orphaned`, and `invalid`; `creating` is the only transient status. `created` is NOT a terminal status; the filer writes `verified` (pass) or `verify_mismatch` (fail) as the terminal outcome of Step 8.
- Retry policy: on 5xx, network error, or ambiguous response, wait 2s, retry once, then run `project = <project_key> AND labels = "<project_key>-idem-<hash12>" ORDER BY created DESC` to detect a created orphan.
- All Atlassian MCP calls use literal `atlassian/<tool>` tool syntax and explicit `cloudId`.
- `createJiraIssue` labels live in `additional_fields.labels`. Subtask-to-Story linkage uses top-level `parent` (string). Story-to-Epic linkage in team-managed Jira uses `additional_fields.parent` as an object `{"key": "<epic_key>"}` — not the top-level `parent` string and not `customfield_10014`.
