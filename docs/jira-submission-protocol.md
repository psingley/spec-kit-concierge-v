# Jira Submission Protocol

This protocol defines the deterministic per-ticket filer used by the
Concierge JIRA outer loop. It follows the constitution's disk-truth
and outer-loop rules: the orchestrator owns ordering and reads disk
between units; the filer owns one external-service call, verification,
and one state record.

## Filer Input Contract

The filer receives one JSON object as `$ARGUMENTS`:

```json
{
  "idempotency_id": "0001-foundation-shell-epic",
  "state_dir": "specs/0001-foundation-shell/jira-submission-state",
  "project_key": "KCKB",
  "issue_type": "Epic",
  "summary": "Foundation Shell & Boundaries",
  "description": "Standalone Jira body...",
  "labels": ["spec-kit", "KCKB-idem-0123456789ab"],
  "parent_key": null,
  "relationship_field": null,
  "payload_hash": "0123456789abcdef...",
  "idempotency_label": "KCKB-idem-0123456789ab"
}
```

Required fields:

| Field | Meaning |
|---|---|
| `idempotency_id` | Stable local unit id. Must match `[a-zA-Z0-9_-]+` before it is used in any filename or JQL path. |
| `state_dir` | Directory for per-ticket state records. |
| `project_key` | Jira project key. |
| `issue_type` | Jira issue type name. |
| `summary` | Expected live Jira summary. |
| `description` | Expected live Jira description. |
| `labels` | App-rendered Jira labels to apply, including `idempotency_label`. Every label must match `[a-zA-Z0-9_-]+`. |
| `parent_key` | Expected parent issue key, or `null` when no parent is expected. |
| `relationship_field` | Optional custom field id for company-managed Epic Link relationships. Use `customfield_10014` unless `jira-config.yml` specifies a different field. |
| `payload_hash` | Runner-supplied canonical SHA-256 digest for this node payload. The app is the single hash authority. |
| `idempotency_label` | Runner-supplied label derived from `payload_hash` as `<project_key>-idem-<hash12>`. |

The app computes `payload_hash` and `idempotency_label`; the filer echoes both
values verbatim into every state record and must not recompute a hash from the
wrapper, rendered labels, or Jira request body. `hash12` is the first 12
characters of `payload_hash`; the label is computed from the hash, not from
`idempotency_id`, and uses a hyphen, not a colon. Jira labels have a
255-character limit.

## State Record Contract

The filer writes exactly one state record per idempotency id:

`specs/<spec-name>/jira-submission-state/<idempotency_id>.json`

```json
{
  "idempotency_id": "0001-foundation-shell-T001",
  "status": "verified",
  "live_key": "KCKB-123",
  "live_url": "https://example.atlassian.net/browse/KCKB-123",
  "payload_hash": "sha256...",
  "idempotency_label": "KCKB-idem-abcdef123456",
  "attempts": 1,
  "started_at": "2026-05-26T12:00:00Z",
  "verified_at": "2026-05-26T12:00:12Z",
  "agent_model": "gpt-5-mini",
  "agent_effort": null,
  "copilot_session_id": null,
  "cost_multiplier": 0,
  "error": null
}
```

`live_key`, `live_url`, `verified_at`, `agent_effort`,
`copilot_session_id`, and `error` may be `null` while the record is in
progress or failed.

`payload_hash` is the SHA-256 the app computed from its normalized intended
payload before the idempotency label was added. The runner ordering is strict:

1. validate `idempotency_id` and caller-supplied labels against
   `[a-zA-Z0-9_-]+`
2. normalize the payload
3. compute `payload_hash`
4. derive `idempotency_label = "<project_key>-idem-" + payload_hash[:12]`
5. add `idempotency_label` to the Jira submission labels

The filer receives the completed app-rendered payload plus the app-authored
`payload_hash` and `idempotency_label`. It verifies shape and echoes those
values; it does not repeat the normalization or hashing step.

## State Machine

```text
not_started -> creating -> verified
                         -> rate_limit_exhausted
                         -> verify_mismatch
                         -> payload_hash_mismatch
                         -> create_failed
```

`not_started` is represented by a missing state record. The filer writes
`creating` before calling Jira. Terminal status values surfaced by the filer are:

- `verified`
- `payload_hash_mismatch`
- `create_failed`
- `rate_limit_exhausted`
- `verify_mismatch`
- `already_verified`

The outer loop treats only `verified`, `duplicate`, or `already_verified` with
the matching app-intended `payload_hash`, matching `idempotency_label`, and
matching `idempotency_id` as advanceable. Every other state halts the current
run and surfaces the state directory plus the failed `idempotency_id`.

## Idempotency

The filer compares the app-supplied incoming `payload_hash` to any existing state
record before calling Jira.

- If `status == "verified"` and `payload_hash` matches, the filer
  returns a single-line JSON summary with `status: "already_verified"`
  and does not call Jira.
- If a state record exists for the same `idempotency_id` with a
  different `payload_hash`, the filer writes `payload_hash_mismatch` and
  does not create a second ticket.
- If `status == "creating"`, the filer performs partial-state recovery
  before creating anything new.

Partial-state recovery uses this JQL orphan-detection query:

```jql
project = '{project_key}' AND labels = '{idempotency_label}'
```

If exactly one issue is found, the filer reads it back with
`getJiraIssue`, verifies the live fields, and writes `verified`. If
multiple issues are found with the same idempotency label, the filer logs
a warning and uses the issue with the latest `created` date as the
candidate for read-back verification. If the candidate issue is empty,
missing a key, has a null or empty description field, or does not match the
expected summary, parent, and idempotency label, the filer writes
`verify_mismatch` and stops.

Before constructing this or any future JQL string, the filer validates
`idempotency_id` against `[a-zA-Z0-9_-]+`. If validation fails, it writes
`create_failed` with explanatory validation error detail and returns without
calling Jira.

## Relationship Field Semantics

The outer agent passes `relationship_field` from `jira-config.yml` when the
configured relationship is company-managed `"Epic Link"`. If the config does
not provide a field for `"Epic Link"`, use `customfield_10014`.

The filer applies relationship fields in this order:

1. if `parent_key` is `null`, omit parent and relationship fields
2. if `issue_type` is `Sub-task` or `Subtask`, set the direct Jira parent and
   omit Epic Link / `relationship_field` entirely
3. if `relationship_field` is present, set that custom field to `parent_key`
4. otherwise set the direct Jira parent from `parent_key`

## Read-Back Verification

Before declaring a duplicate recovery or a fresh create verified, the filer
requires a non-null, non-empty found issue and issue key. Verification checks
only:

1. live description field is non-null and non-empty
2. live summary equals the expected `summary`
3. live parent equals `parent_key` when `parent_key` is not `null`
4. live labels array includes `idempotency_label`

The filer must not compare description content byte-for-byte. It verifies only
that the description field exists and is non-empty.

## Retry Policy

The filer attempts creation at most five total times.

On Jira 429 responses, the filer retries `createJiraIssue` directly. The
backoff for attempt `n` is:

```text
min(2^attempt + jitter, 60s)
jitter = random() * 0.5
```

After five 429 attempts, write `rate_limit_exhausted` with the last error
message and return a single-line JSON summary.

On Jira 5xx responses, network errors, or ambiguous responses such as timeout
or no response, run the JQL orphan search using the supplied idempotency label
before retrying creation:

```jql
project = '{project_key}' AND labels = '{idempotency_label}'
```

If exactly one orphan is found, read it with `getJiraIssue`, verify it using
the read-back checks, and proceed from that result. If multiple orphans are
found, choose the issue with the latest `created` date, verify that candidate,
and proceed from that result. If no orphan is found after a 5-second settle
period, retry `createJiraIssue`. After five total attempts, write
`create_failed` with the last error message and return a single-line JSON
summary.

On Jira 4xx responses other than 429, write terminal `create_failed` with the
last error message and return a single-line JSON summary. Do not retry.

## Filesystem Semantics

The filer must write every state record atomically so future parallelism is
safe across separate ticket IDs:

1. create the state directory with `mkdir -p`
2. write the complete JSON record to a unique `.tmp` file in the same
   directory
3. atomically rename the `.tmp` file to the final `state_file`

The same tmp-and-rename invariant applies to `creating`, retry updates,
terminal failures, and `verified` records.

## Cost And Session Metadata

Every state record includes filer telemetry metadata:

| Field | Meaning |
|---|---|
| `agent_model` | Model declared or observed for the filer agent, normally `gpt-5-mini`. |
| `agent_effort` | Effort level when available, otherwise `null`. |
| `copilot_session_id` | Session identifier when discoverable, otherwise `null`. |
| `cost_multiplier` | Estimate multiplier for rollup accounting. |

Model multiplier table:

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

To populate `copilot_session_id`, try `$COPILOT_SESSION_ID` first. If it
is not set, scan `~/.copilot/session-state/` for the latest directory that
matches the filer session start time. If neither source yields a value,
write `null` and preserve that as an honest observability gap.

The cost rollup is a model-multiplier-sum estimate, not true Premium
request cost. True cost requires token counts the filer cannot reliably
capture.

## Model And Effort Overrides

GitHub Copilot CLI supports custom agents through repository files in
`.github/agents`, direct `--agent=<agent>` invocation, and model
selection in custom-agent frontmatter. The current public CLI docs also
document session-wide `COPILOT_MODEL` and subagent depth/concurrency
environment variables.

The docs found during this implementation do not document a per-call
effort-level override, and they do not document passing arbitrary
model/effort overrides inline for one nested custom-agent invocation.
Therefore, per-call model or effort settings in this protocol are
advisory only. The deterministic contract is the file-based handoff:
write a complete JSON payload, invoke the filer as one unit, then read
the state record from disk before advancing.

## Invocation Caveats

Two invocation paths, picked by caller type:

### Human interactive selection

```text
/agent concierge.jira-file-ticket
```

Honors frontmatter `model` and `effort`. Suitable for ad-hoc human-driven
single-ticket diagnostics.

### Outer-agent orchestration (the actual production path)

The outer `speckit.concierge-jira.specstoissues` agent uses **`bash` to shell
out** to a fresh Copilot process per ticket:

```bash
PAYLOAD='{"idempotency_id":"...","state_dir":"...","project_key":"...","issue_type":"...","summary":"...","description":"...","labels":["..."],"parent_key":null,"relationship_field":null}'
copilot --agent=concierge.jira-file-ticket --allow-all-tools -p "$PAYLOAD"
```

Each invocation spawns a fresh Copilot session at `gpt-5-mini` + `effort: low`
(0x pricing per call). Filer writes its state file, returns single-line JSON
on stdout, exits.

### Anti-pattern: in-session sub-agent invocation

DO NOT use Copilot's in-session `task` tool or write inline prose like "invoke
the filer" to delegate. Empirically verified failure mode: in-session sub-agent
delegation produced SKC-8 in Jira but **no state file on disk** because the
sub-agent skipped the Step 0 entry trace and Step 9 final write while
completing the middle Atlassian calls. The shell-out pattern at
`scripts/diag-filer-run.sh` produced SKC-9 with both the Jira ticket AND the
state file written every time. Use shell-out only.

### Prompt-pointer caveat

Do not use the prompt pointer as a slash command. The prompt pointer exists
only to route humans toward the custom agent; model and tool frontmatter
are honored by the `/agent` custom-agent path and by `--agent=` shell
invocation, not by treating the prompt file itself as the executable command.

For custom-agent `tools:` frontmatter, MCP tools are referenced with the
configured server name followed by `/` and the tool name, for example
`atlassian/createJiraIssue`. Template placeholders are not valid frontmatter
syntax.

## Disk-Truth Reading Pattern

1. The outer loop builds the full DAG from the dry-run preview and
   source artifacts.
2. For each ticket, the outer loop passes one JSON payload to the filer.
3. The filer writes
   `specs/<spec-name>/jira-submission-state/<idempotency_id>.json`.
4. The filer writes every state transition with tmp-and-rename semantics.
5. The outer loop reads that exact file after the filer returns.
6. The outer loop advances only when the status is terminal-pass and
   `payload_hash` matches the app-intended payload hash it sent.
7. The terminal success UI and `jira-mapping.json` are compiled from
   verified disk records, not from stream prose.

## Constitutional References

- Principle II, Disk Is Truth: stateful external-service records are
  durable disk truth; stream prose and memory are not proof.
- Principle IV, Factory-First Data Transformation: the input and state
  JSON records are trust-boundary payloads and must be parsed,
  normalized, and verified before use.
- Principle XI, External-Service Submission via
  Concierge-Orchestrated Outer Loop: Concierge owns deterministic
  iteration and disk verification; the filer owns one external-service
  call and one state-record write.
