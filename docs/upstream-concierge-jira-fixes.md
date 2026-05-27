# Upstream → psingley/concierge-jira: fixes and architecture from Run 1 dogfood

> This file records what to push back to `psingley/concierge-jira` based on the
> empirical validation of Run 1's per-ticket filer delegation pattern in
> `~/spec-kit-concierge-v` on 2026-05-26 / 27.
>
> Status: drafting — open a PR when ready. Not yet open.

## Empirical evidence captured this session

- SKC-1 (Task, smoke single-shot): verified, labels attached.
- SKC-2 (Epic, top-level `labels` parameter): created with `labels: []`. Bug.
- SKC-3 (Epic, `additional_fields.labels`): verified, all labels attached.
  Diagnostic confirming the labels-go-in-additional_fields fix.
- SKC-4 / SKC-5 / SKC-6 (Epic / Story / Subtask, sub-agent flavor smoke):
  all verified.
- SKC-7 (Epic from first scoped real run): verified.
- SKC-8 (Story via in-session sub-agent delegation): created in Jira, no
  state record on disk. Anti-pattern signal.
- SKC-9 (Task via direct shell-out from `scripts/diag-filer-run.sh`): both
  Jira ticket and state record written reliably.
- SKC-10..14 (Epic + Story + 3 Subtasks via outer-agent shell-out to filer):
  5/5 verified. Architecture proof.

## Bucket A — bug fixes to upstream `commands/specstoissues.md` and `commands/sync-status.md`

### A1. Top-level `labels` parameter is silently dropped for Epic issue types

**Bug:** upstream sets `labels` as a top-level parameter on `createJiraIssue`.
Atlassian MCP at v1 (`https://mcp.atlassian.com/v1/mcp`) attaches labels for
Task issue types but silently drops them for Epics (and likely other types).

**Evidence:** SKC-2 created with top-level `labels: [...]` returned
`labels: []`. SKC-3 created with `additional_fields: {labels: [...]}` returned
all 4 labels.

**Fix:** in every `createJiraIssue` call, pass labels inside `additional_fields`:

```jsonc
{
  "additional_fields": {
    "labels": ["..."]
  }
}
```

**File:** `commands/specstoissues.md` Step 7 (or equivalent create call).

### A2. Parent linkage must use top-level `parent` parameter, not `additional_fields.Parent`

**Bug:** when setting parent for Stories-under-Epics or Subtasks-under-Stories
in team-managed Jira, the upstream protocol implies `additional_fields:
{"Parent": "SKC-10"}` (capital P). Jira rejects this with "Field 'Parent'
cannot be set. It is not on the appropriate screen, or unknown." even when
the Parent field is on the Story work-type screen.

**Evidence:** SKC-11 attempt (first scoped real run) failed with this exact
error. Filer's event log showed `additional_fields: {"Parent": "SKC-10"}`.
After protocol fix to use top-level `parent: "SKC-10"` (string), SKC-11
verified on the retry.

**Fix:** the Atlassian MCP `createJiraIssue` schema has a top-level `parent`
parameter (`type: string`, description "Parent for subtasks") that handles
both Subtasks-under-Stories AND Stories-under-Epics in team-managed Jira.
Use it. Do not pass `"Parent"` (capital P) as a key in `additional_fields`.

Branching:

1. `parent_key == null`: omit `parent` and any parent-related fields.
2. `issue_type` is Sub-task/Subtask: top-level `parent: "SKC-10"`.
3. `issue_type` is Story-under-Epic AND `relationship_field` is null/absent:
   top-level `parent: "SKC-10"` (team-managed path).
4. `relationship_field == "Epic Link"` (company-managed legacy): set
   `additional_fields.customfield_10014` (or configured field id). Do NOT
   also set top-level `parent`.
5. Any other `relationship_field` value: filer does NOT set parent at create
   time; out of scope.

**File:** `commands/specstoissues.md` Step 7 / 8 relationship branching.

### A3. Tool string syntax for `tools:` frontmatter

**Bug:** earlier Codex-generated content referenced tools as
`{mcp_server}/createJiraIssue` — a template placeholder that never resolves
in Copilot CLI 1.0.54.

**Fix:** use `<server>/<tool>` literally:

```yaml
tools:
- atlassian/createJiraIssue
- atlassian/searchJiraIssuesUsingJql
- atlassian/getJiraIssue
```

**File:** `commands/*.md` frontmatter where applicable.

### A4. cloudId is required on every Atlassian MCP call

**Bug:** upstream assumes Atlassian MCP auto-resolves cloudId from session
context. In sub-agent runtimes (Copilot CLI custom-agent invocations), the
auto-resolve fails with "Failed to fetch cloud ID for: atlassian" because
the sub-agent receives "atlassian" as a literal string rather than the
configured MCP server reference.

**Evidence:** First post-MCP-config diag run produced this error before
cloudId was hardcoded in `jira-config.yml`.

**Fix:** add an `atlassian_cloud_id` field to `jira-config.template.yml`
with a clear comment that it must be resolved once via
`getAccessibleAtlassianResources` and pinned. Every Atlassian MCP call in
the command bodies must pass `cloudId` explicitly.

**File:** `jira-config.template.yml` + `commands/*.md` MCP call sites.

## Bucket B — protocol improvements for upstream `commands/specstoissues.md`

### B1. Atomic state-record writes (tmp file + rename)

**Why:** resume safety. Crashes mid-write must not leave partial JSON.

**Pattern:**

```bash
mkdir -p "{state_dir}"
write to "{state_dir}/{idempotency_id}.json.tmp.<pid>.<ts>"
rename to "{state_dir}/{idempotency_id}.json"
```

**File:** new section "Filesystem semantics" in `commands/specstoissues.md`.

### B2. State-file absence is the NORMAL first-call condition

**Bug:** earlier protocol's Step 4 read "If state_file exists, read it...".
gpt-5-mini at low effort interpreted a missing state file as a halt
condition and returned `create_failed` without ever calling Jira.

**Fix:** explicit guard at Step 4:

> IMPORTANT: state_file not existing is the NORMAL case for a fresh ticket.
> If view returns "file not found", proceed to Step 5 / 6 / 7. DO NOT
> halt or return create_failed.

**File:** `commands/specstoissues.md` Step 4.

### B3. Step 0 entry trace (debug log)

**Why:** when a sub-agent invocation fails, you need ground truth on whether
the filer even started executing. The entry trace proves it did.

**Pattern:** before any other work, atomically append a single line:

```
[ISO-8601 timestamp] FILER_ENTRY idempotency_id=<id> arg_length=<n>
```

to `{state_dir}/_filer.debug.log`.

**File:** `commands/specstoissues.md` new Step 0.

### B4. Verification predicate is 4 explicit checks, not byte-for-byte description compare

**Why:** Jira may transform markdown → ADF or normalize whitespace; byte-level
compares produce false-negative `verify_mismatch` results.

**Fix:** require exactly these 4 checks before declaring `verified`:

1. live `description` is non-null AND non-empty (existence only)
2. live `summary` matches `summary` exactly (string match)
3. live `parent.key` matches `parent_key` when `parent_key` is not null
4. live `labels` array contains the derived `<project>-idem-<hash12>` label

Do NOT compare description content byte-for-byte.

**File:** `commands/specstoissues.md` verification step.

### B5. Idempotency label format (`<project>-idem-<hash12>`)

**Why:** enables JQL orphan recovery via `labels = "<project>-idem-<hash12>"`
after partial-write or transient-error scenarios. The label is derived from
the first 12 chars of `payload_hash`, not from `idempotency_id`, so caller
behavior doesn't influence the recovery anchor.

**Constraint:** hyphen-separated, no colons (some Jira instances reject `:`
in labels), fits Jira's 255-char label limit (we use 18 chars: 9 prefix + 12
hash).

**Generalization for upstream:** our local label format is `skc-idem-<hash12>`
because SKC is our project key. The upstream extension should derive the
prefix from the configured `project.key` field: `<project_key>-idem-<hash12>`
or similar. Validate that the resulting label is `[a-zA-Z0-9_-]+` and ≤ 255
chars before construction.

**File:** `commands/specstoissues.md` Step 1 (hash + label derivation).

### B6. State machine: 6 terminal statuses + `creating` transient

**Terminal:** `verified`, `already_verified`, `payload_hash_mismatch`,
`create_failed`, `rate_limit_exhausted`, `verify_mismatch`.
**Transient:** `creating` (filer wrote state before calling Jira; recovery
flow keys off this).

`already_verified` returns when the state record on disk matches the
incoming payload hash and was previously verified — idempotent no-op, no
Jira call.

**File:** new section "State Machine" in `commands/specstoissues.md`.

### B7. Retry policy with JQL orphan search on 5xx/network/ambiguous

**Why:** transient errors can leave Jira tickets created with no response
returned. Re-trying the create would duplicate. Instead, on any non-429
non-success response, run a JQL orphan search using the idempotency label
BEFORE retrying.

**State machine:**

- 429 (rate limit): backoff `min(2^attempt + jitter, 60s)` where
  `jitter = random() * 0.5`, retry. Max 5 attempts → terminal
  `rate_limit_exhausted`.
- 5xx / network error / ambiguous (timeout, no response): JQL orphan search
  via idempotency label first. If exactly one orphan: verify it (Step 8),
  succeed. If multiple: pick latest-created and verify. If none after 5s
  settle: retry create. Max 5 attempts → terminal `create_failed`.
- 4xx other than 429: terminal `create_failed`, do NOT retry.

**File:** `commands/specstoissues.md` Step 7 retry block.

## Bucket C — architecture: per-ticket filer delegation via shell-out

This is the bigger contribution. It changes the upstream extension from a
"one big agent that does everything" into a "thin orchestrator + per-ticket
deterministic worker."

### C1. Why split

**Empirical finding:** the single-agent approach degrades at scale. gpt-5-mini
at low effort can correctly run the per-ticket protocol (create + verify +
state-record write) in isolation but loses discipline when threading 26
tickets sequentially in one context. Specific failure modes observed:

- Agent claims success without writing state file (SKC-8 in-session
  delegation case)
- Agent re-derives payloads instead of reading from disk between tickets
- Agent fans out instead of serializing per-Phase

The split fixes all three by making the per-ticket work a discrete,
deterministic unit run in a fresh process. Each invocation:

- Receives ONE JSON payload
- Runs the 9-step protocol
- Writes ONE state record
- Returns ONE single-line JSON summary
- Exits

The orchestrator's job becomes the disciplined work: parse source artifacts,
build the DAG, sequence filer invocations, thread parent keys from disk
state, halt-on-failure with audit trail.

### C2. Two files instead of one

Upstream restructure:

- `commands/specstoissues.md` (existing) — outer orchestrator. Does NOT call
  Atlassian MCP directly anymore. Reads source artifacts, builds DAG,
  delegates each ticket to the filer via bash shell-out, reads state file
  back from disk to advance.
- `commands/file-ticket.md` (NEW) — per-ticket filer. Frontmatter pins
  `model: gpt-5-mini` + `effort: low`. Implements the 9-step protocol from
  this fork's `concierge.jira-file-ticket.agent.md`.

The orchestrator's `tools:` frontmatter is `read, search, edit, bash` (NOT
`agent` — the in-session task tool produces the SKC-8 failure mode).

The filer's `tools:` frontmatter is `read, edit, bash,
atlassian/createJiraIssue, atlassian/searchJiraIssuesUsingJql,
atlassian/getJiraIssue`.

### C3. Delegation via bash shell-out

Outer agent invokes the filer per ticket:

```bash
PAYLOAD='{"idempotency_id":"...","state_dir":"...","project_key":"...","issue_type":"...","summary":"...","description":"...","labels":["..."],"parent_key":null,"relationship_field":null}'
copilot --agent=<filer-agent-name> --allow-all-tools -p "$PAYLOAD"
```

Each filer call spawns a FRESH Copilot process. State file is the source of
truth, NOT the filer's stdout return.

### C4. Anti-pattern: in-session sub-agent delegation

The upstream extension's `commands/specstoissues.md` historically used the
Copilot CLI in-session `task` tool to invoke sub-flows. This pattern is
unreliable in Copilot CLI 1.0.54: in-session sub-agents silently skip the
filer's state-file writes (Step 0 entry trace + Step 6 creating-state + Step
9 final-state) even when they correctly complete the Atlassian MCP calls.

**Evidence:** SKC-8 created via in-session delegation appeared in Jira but
no state file existed on disk. Reproduced consistently. The outer agent's
disk-truth gate (read state record after every filer invocation) catches
this correctly and halts, but the cost is wasted Jira tickets without
local trace.

**Fix:** in the upstream extension, replace any `task` tool usage with
`bash` shell-out to a fresh Copilot process.

### C5. Disk-truth gate (Principle II)

After every filer invocation, the outer agent MUST read
`{state_dir}/{idempotency_id}.json` from disk and confirm:

1. file exists
2. `status == "verified"`
3. `payload_hash` matches the payload it sent
4. `live_key` is populated

If any check fails: halt the run, surface the failed `idempotency_id` and
state-record contents, do NOT proceed to later DAG nodes, do NOT compile
`jira-mapping.json`. The next safe action is either retry this single
idempotency_id with corrected payload OR inspect the live Jira issue.

### C6. Cost / observability metadata in every state record

Every state record (both `creating` and terminal) includes:

- `agent_model`: e.g. `"gpt-5-mini"` — read from agent frontmatter
- `agent_effort`: e.g. `"low"` — read from agent frontmatter (may be null
  if Copilot CLI doesn't propagate)
- `copilot_session_id`: filer's own session id when discoverable
- `cost_multiplier`: from the static lookup table — `gpt-5-mini=0`,
  `gpt-5.4-mini=0.33`, etc.

At run-end the orchestrator rolls these up into `jira-mapping.json`'s
metadata block. Honest about being a model-multiplier sum, not a true
Premium cost (token counts can't be reliably captured from sub-agents).

## Bucket D — config / template updates

### D1. `jira-config.template.yml` additions

Add `atlassian_cloud_id` field with explanatory comment:

```yaml
# Atlassian Cloud ID — required on every Atlassian MCP call.
# Resolve once via the atlassian/getAccessibleAtlassianResources MCP tool
# (run this once interactively, copy the cloudId here). Hardcoded so
# per-ticket agents don't need to re-resolve at runtime — auto-resolve
# fails in sub-agent runtimes.
atlassian_cloud_id: ""  # e.g. "20a57dd3-0f9f-41ca-94d0-0def6f4ff476"
```

### D2. README install + first-run docs

Upstream README should add a "MCP setup" section:

```bash
# 1. Confirm Atlassian MCP is registered in ~/.copilot/mcp-config.json
copilot mcp list  # should show 'atlassian'

# 2. If not, add it
cat > ~/.copilot/mcp-config.json <<'JSON'
{
  "mcpServers": {
    "atlassian": {
      "type": "http",
      "url": "https://mcp.atlassian.com/v1/mcp"
    }
  }
}
JSON

# 3. First-time OAuth completes interactively
copilot -p "use atlassian MCP to call getAccessibleAtlassianResources"

# 4. Copy the returned cloudId into jira-config.yml's atlassian_cloud_id field
```

## PR strategy when ready

Open against `psingley/concierge-jira` main:

- One PR per bucket (A bug fixes, B protocol, C architecture, D config)
- A and D are non-controversial — small surgical fixes + config docs
- B is a moderate restructure of `specstoissues.md`
- C is the biggest change — new file, split commands, anti-pattern
  documentation. Most reviewable as its own PR.

Sequence: A → D → B → C. Land bug fixes first (no behavior change risk),
config docs next, protocol last, architecture restructure as the capstone.

## Open items not yet upstream-ready

- Step 0 entry trace works but the format isn't yet locked across all
  failure modes — review before upstreaming.
- The 5xx/network/ambiguous retry path is documented but only the 429
  path is exercised in our session. Real 5xx simulation requires a mock
  Jira endpoint we don't have.
- `agent_effort: null` in state records — Copilot CLI 1.0.54 doesn't
  appear to propagate the effort level to runtime; need to either
  confirm propagation works or document the gap.
- Whether `mcp-servers:` frontmatter in agent files will work in a later
  Copilot CLI version. Currently rejected at registration time.
