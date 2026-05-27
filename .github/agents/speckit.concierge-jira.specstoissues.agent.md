---
description: Create Jira hierarchy from spec and tasks
tools:
- 'read'
- 'search'
- 'edit'
- 'agent'
---


<!-- Extension: concierge-jira -->
<!-- Config: .specify/extensions/concierge-jira/ -->
# Create Jira Issues from Spec and Tasks

This command creates a complete Jira issue hierarchy from your specification and task breakdown:

- **Spec issue**: Created from SPEC.md (overall specification; default issue type: `Epic`)
- **Phase issues**: Created from Phase headers in TASKS.md (default issue type: `Story`)
- **Task issues/subtasks**: Created from task items under each Phase (default issue type depends on `mapping.task_artifact`)

## Prerequisites

1. MCP server providing Jira tools configured and running (server name configured in jira-config.yml)
2. Jira configuration file exists: `.specify/extensions/jira/jira-config.yml`
3. Specification directory with `spec.md` and `tasks.md` files in `specs/<spec-name>/`

## User Input

$ARGUMENTS

Accepts optional `--spec <name>` argument to specify which specification to use.
If not provided, auto-detects from current directory or available specs.

## Steps

### 1. Detect Specification Directory

Determine which specification to use (in order of priority):

1. `--spec <name>` argument
2. Git branch name (if matches a spec directory)
3. Current directory (if inside `specs/<name>/`)
4. Single spec (if only one exists)

Read the specification directory and validate that both `spec.md` and `tasks.md` exist.

### 2. Load Jira Configuration

Load the Jira configuration from `.specify/extensions/jira/jira-config.yml`:

**Artifact Mapping:**
- `mapping.spec_artifact`: Issue type for SPEC.md (default: "Epic")
- `mapping.phase_artifact`: Issue type for Phase headers (default: "Story")
- `mapping.task_artifact`: Issue type for task items (default: "Task"). Set to `""` or `"none"` for 2-level mode (Spec → Phases only)

**2-Level Mode:**

When `task_artifact` is empty (`""`) or `"none"`, the extension operates in 2-level mode:

- Only Spec and Phase issues are created in Jira
- Tasks are embedded as a checklist in the Phase description
- No individual Task issues are created
- Useful for simpler projects or when tasks don't need individual tracking

**Relationships:**
- `mapping.relationships.spec_phase`: How Phase links to Spec (default: "Epic Link")
- `mapping.relationships.phase_task`: How Task links to Phase (default: "Relates")
- `mapping.relationships.spec_task`: Direct Task-Spec link (default: "Epic Link")
- `mapping.relationship_field` or top-level `relationship_field`: optional custom field id for company-managed Epic Link. Use `customfield_10014` when the relationship is `"Epic Link"` and no configured field is present.

Relationship options: `"Parent"`, `"Epic Link"`, `"Relates"`, `"Blocks"`, `"Implements"`, `"is child of"`, `"none"`

When building each filer payload, pass `relationship_field` from
`jira-config.yml` for company-managed Epic Link relationships. Pass `null` for
`"Parent"`, `"Relates"`, `"Blocks"`, `"Implements"`, `"is child of"`, and
`"none"`. For task payloads whose `issue_type` is `Sub-task` or `Subtask`, pass
`null` even if a configured Epic Link field exists; subtasks must use direct
Jira parent linkage and must not receive an Epic Link field.

**Backward Compatibility:**

If old config structure is found:
- `hierarchy.epic_type` → maps to `mapping.spec_artifact`
- `hierarchy.story_type` → maps to `mapping.phase_artifact`
- `hierarchy.task_type` → maps to `mapping.task_artifact`
- `hierarchy.relationships.epic_story` → maps to `mapping.relationships.spec_phase`
- `hierarchy.relationships.story_task` → maps to `mapping.relationships.phase_task`
- `hierarchy.relationships.epic_task` → maps to `mapping.relationships.spec_task`

**Environment variable overrides:**
- `SPECKIT_JIRA_PROJECT_KEY` → `project.key`
- `SPECKIT_JIRA_SPEC_ARTIFACT` → `mapping.spec_artifact`
- `SPECKIT_JIRA_PHASE_ARTIFACT` → `mapping.phase_artifact`
- `SPECKIT_JIRA_TASK_ARTIFACT` → `mapping.task_artifact`
- `SPECKIT_JIRA_SPEC_PHASE_RELATIONSHIP` → `mapping.relationships.spec_phase`
- `SPECKIT_JIRA_PHASE_TASK_RELATIONSHIP` → `mapping.relationships.phase_task`

### 3. Parse SPEC.md

Read and parse the specification file to extract:

1. **Title**: First H1 heading (e.g., `# User Authentication System`)
2. **Summary**: Content under the first heading or "Overview" section
3. **Full content**: Entire spec for the spec issue description

Example SPEC.md structure:
```markdown
# User Authentication System

## Overview
This specification defines the implementation of...

## Goals
- Goal 1
- Goal 2
```

Extract:
- Spec issue title: "User Authentication System"
- Spec issue description: Full spec content (or truncated if too long for Jira)

### 4. Parse TASKS.md for Phases and Tasks

Read and parse the tasks file to extract the phase/task hierarchy:

1. **Phases**: H2 headings starting with "Phase" (e.g., `## Phase 1: Setup`)
2. **Tasks**: List items under each phase (e.g., `- [x] T001 Initialize pnpm workspace...`)

Example TASKS.md structure:
```markdown
# Tasks: User Authentication System

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 Initialize pnpm workspace with Nx and NestJS presets
- [x] T002 Add root tsconfig.base.json with path aliases
- [ ] T003 Configure root eslint.config.mjs

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T010 Generate libs/core scaffold
- [ ] T011 Generate libs/config scaffold
```

Extract into a structure like:
```json
{
  "phases": [
    {
      "name": "Phase 1: Setup (Shared Infrastructure)",
      "tasks": [
        {"id": "T001", "description": "Initialize pnpm workspace with Nx and NestJS presets", "status": "completed"},
        {"id": "T002", "description": "Add root tsconfig.base.json with path aliases", "status": "completed"},
        {"id": "T003", "description": "Configure root eslint.config.mjs", "status": "pending"}
      ]
    },
    {
      "name": "Phase 2: Foundational (Blocking Prerequisites)",
      "tasks": [
        {"id": "T010", "description": "Generate libs/core scaffold", "status": "completed"},
        {"id": "T011", "description": "Generate libs/config scaffold", "status": "pending"}
      ]
    }
  ]
}
```

Task status mapping:
- `[x]` → "completed"
- `[ ]` → "pending"
- `[~]` → "in_progress" (optional convention)

Also extract, when present:

1. each Phase `User story`
2. each Phase `Goal`
3. each Phase `Independent Test`
4. any explicit file paths named in each task line
5. any acceptance-criteria-style scenarios or bullets already present in the source artifacts

This additional context should be reused later to produce richer Jira issue
descriptions instead of thin pointer-style bodies. If a Phase does not contain
an explicit user story or acceptance criteria, synthesize them from the spec
summary, the Phase goal, and the independent test rather than omitting them.

### 5. Generate a dry-run preview (MANDATORY pre-flight)

Before creating or updating any Jira issue, render a dry-run preview from the
local artifacts and pause for human approval.

The dry-run preview must include:

1. proposed Epic summary and body outline using the intended section headings
2. proposed Phase issue summaries, expected parent link, story statement, acceptance criteria outline, goal, and independent test
3. proposed task issue summaries, expected parent Phase issue, affected file paths, and `Done when` criteria
4. the expected hierarchy table for the full run
5. a warning if any generated issue body is too thin to stand on its own for a
   non-engineering audience, or if it lacks story framing / acceptance-style completion criteria

The dry run is **read-only**:

- do not call `createJiraIssue`
- do not call `editJiraIssue`
- do not call `createIssueLink`
- do not write `jira-mapping.json`

In a real send, treat this dry-run output as the mandatory pre-flight. If the
operator does not explicitly approve the preview, stop here.

### 6. Check for Existing Issues

Before creating issues, check if a mapping file already exists at `specs/<spec-name>/jira-mapping.json`.

**Important:** `jira-mapping.json` is an output of this command, not a prerequisite for first-time creation.

Use this branching logic:

```bash
mapping_file="specs/$spec_name/jira-mapping.json"

if [ -f "$mapping_file" ]; then
  echo "📋 Existing Jira mapping found: $mapping_file"
  # Read and summarize the existing mapping, then ask the user whether to:
  # 1. Skip existing issues and only create missing ones
  # 2. Re-create all issues (creates duplicates)
  # 3. Abort and review existing mapping
else
  echo "ℹ️ No existing Jira mapping found at $mapping_file"
  echo "   This is expected on the first run. Proceeding to create a new Jira hierarchy."
  # DO NOT attempt to read the mapping file here.
  # DO NOT fail just because the file does not exist.
fi
```

If the mapping file exists:
1. Display existing mapping summary
2. Ask user whether to:
   - Skip existing issues and only create missing ones
   - Re-create all issues (creates duplicates)
   - Abort and review existing mapping

If the mapping file does **not** exist:
1. Treat this as a first-run creation flow
2. Continue directly to issue creation
3. Save a brand-new `jira-mapping.json` at the end of the command

### 7. Build Jira Submission DAG

Before invoking any live Jira call, build the complete creation DAG from the
approved dry-run preview and local source artifacts:

```text
Epic -> Stories -> Subtasks
```

Each node in the DAG must have a deterministic `idempotency_id`, expected
`parent_key`, issue type, summary, description, base labels, optional
`relationship_field`, and state-record path. `idempotency_id` must match
`[a-zA-Z0-9_-]+`; use hyphens instead of colons.
Use:

```bash
state_dir="specs/$spec_name/jira-submission-state"
state_file="$state_dir/$idempotency_id.json"
```

The DAG preserves the existing mode behavior:

- 2-level mode creates the Epic and Story nodes only; task checklists stay
  embedded in Story descriptions.
- 3-level mode creates the Epic, every Story, and every task as a separate Jira
  issue.

Build descriptions using the existing body contracts:

- Epic: opening summary paragraph, `## Key outcomes`,
  `## Scope constraints`, `## Acceptance highlights`
- Story: user story, behavior-facing acceptance criteria, goal,
  independent test, value summary, implementation outline
- Task: concise contribution line, concrete delivery sentence, affected files
  when known, and `Done when` criteria

Do not call `createJiraIssue`, `getJiraIssue`, or `createIssueLink` directly
from this outer agent. The outer agent owns DAG order and disk verification;
the per-ticket filer agent owns Jira create/read-back for one node.

Do not precompute or pass a `skc-idem-*` label. The filer normalizes the
payload, computes `payload_hash`, derives `skc-idem-<hash12>`, and adds that
label to the Jira submission after hashing. The label is derived from the first
12 characters of `payload_hash`, not from `idempotency_id`; it is
hyphen-separated, uses no colon, and fits Jira's 255-character label limit at
18 characters total (9 prefix + 12 hash).

### 8. Delegate Epic And Story Creation To The Filer

For each DAG node, invoke the filer with the custom-agent form:

```text
/agent concierge.jira-file-ticket
```

Then provide exactly one JSON payload. Do not invoke a slash-command prompt
file for this delegation.

```json
{
  "idempotency_id": "0001-foundation-shell-epic",
  "state_dir": "specs/0001-foundation-shell/jira-submission-state",
  "project_key": "PROJ",
  "issue_type": "Epic",
  "summary": "User Authentication System",
  "description": "structured standalone body",
  "labels": ["spec-kit"],
  "parent_key": null,
  "relationship_field": null
}
```

For Story payloads linked to an Epic with company-managed `"Epic Link"`, pass
`relationship_field` from `jira-config.yml`, defaulting to `customfield_10014`
when the config does not name one. For team-managed `"Parent"` relationships,
pass `relationship_field: null` and use `parent_key`.

After each filer invocation, read the state record from disk. Advance only when
all of these are true:

1. `status == "verified"`
2. `payload_hash` matches the payload sent to the filer
3. `live_key` is populated
4. `verified_at` is populated

Use the verified `live_key` from the Epic state record as the parent key for
Story payloads when the configured relationship uses Jira parent linkage or
company-managed Epic Link. Store each verified Story key for task creation.

If any state record is missing, malformed, not `verified`, or has a mismatched
hash, halt immediately. Surface:

- the failed `idempotency_id`
- the state directory
- the current state record content if present
- the next safe action: retry this idempotency id or inspect the live Jira issue

Do not continue to later DAG nodes after a failure.

### 9. Delegate Individual Jira Issues for EACH Task

**⚠️ SKIP THIS STEP IF 2-LEVEL MODE IS ENABLED**

If `task_artifact` is empty (`""`) or `"none"`, skip this entire step and
proceed to Step 10. In 2-level mode, tasks are already embedded in Phase
descriptions.

---

#### 3-Level Mode Only

**CRITICAL: This step is MANDATORY in 3-level mode. You MUST create a separate
Jira issue for EVERY task listed in TASKS.md.**

DO NOT skip this step in 3-level mode. DO NOT just put tasks in the Phase
description. Each `- [ ] T001 ...` line in TASKS.md becomes its own Jira issue.

Create and verify tasks for **one Phase at a time**. Do not interleave task
creation across multiple Phases. Before invoking the filer for a task, read the
verified current Phase key from that Phase's state record and confirm that the
task belongs to that Phase from `TASKS.md`.

For each task item, invoke `/agent concierge.jira-file-ticket` with one JSON
payload:

```json
{
  "idempotency_id": "0001-foundation-shell-T001",
  "state_dir": "specs/0001-foundation-shell/jira-submission-state",
  "project_key": "PROJ",
  "issue_type": "Sub-task",
  "summary": "T001: Initialize pnpm workspace with Nx and NestJS presets",
  "description": "Contributes to: ...\n\nDone when:\n- ...",
  "labels": ["spec-kit"],
  "parent_key": "PROJ-101",
  "relationship_field": null
}
```

Task/Subtask payloads must pass `relationship_field: null`; the filer will set
the direct Jira parent and omit Epic Link fields entirely.

The task payload must preserve the existing standalone body rules:

- `phase_story_summary` should stay concise and user-story-oriented
- `task_delivery_sentence` should be a direct plain-language description of the
  concrete work to perform, not metadata about local status
- `Affected files` should be populated from the exact file paths named in the
  task line whenever present; omit the section if no concrete file paths are known
- `Done when` should convert the validation slice into crisp completion criteria
  that another engineer or QA partner can verify quickly
- do not include `Status in spec-kit` in the Jira body; local task state belongs
  in `tasks.md` and `jira-mapping.json`
- do not let the task body collapse into only source metadata when the task can
  be described as a concrete deliverable

After each filer invocation, read
`specs/<spec-name>/jira-submission-state/<idempotency_id>.json` from disk and
confirm `status == "verified"` before moving to the next task. The filer
performs the live `createJiraIssue` and `getJiraIssue` calls and verifies
description existence, summary, parent, and idempotency label.

If any verification fails:

- stop the run immediately
- report the failed `idempotency_id`
- report the state directory
- report the mismatch from the state record
- do **not** continue creating additional tasks
- do **not** save or trust `jira-mapping.json` until the mismatch is resolved

**Repeat this delegation + disk-read verification for EVERY task** in the
phase before moving to the next Phase.

**IMPORTANT**: The jira-mapping.json must include ALL verified task keys and
must reflect the **verified disk state**, not just the intended local plan. If
tasks are missing from the mapping, or if a task was verified under the wrong
parent, you have not completed this step correctly.

### 10. Save Issue Mapping

Save a comprehensive mapping file at `specs/<spec-name>/jira-mapping.json`.

Before writing the mapping file, perform one final disk-truth verification pass:

1. read the Epic state record and confirm it is `verified`
2. read each created Phase state record and confirm it is `verified`, has the
   expected payload hash, and has a populated `live_key`
3. read each task state record and confirm it is `verified`, has the expected
   payload hash, and was sent with the expected Phase `parent_key`
4. collect `agent_model`, `agent_effort`, `copilot_session_id`, and
   `cost_multiplier` from every verified state record for cost rollup metadata
5. only then write `jira-mapping.json`

Use this model multiplier table as the cost rollup source of truth. Sum each
verified state record's `cost_multiplier`; if a verified state record lacks
`cost_multiplier` but has `agent_model`, derive the multiplier from this table
before summing.

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

**Include `"mode": "2-level"` or `"mode": "3-level"`** to indicate the hierarchy type used.

#### 3-Level Mode Mapping

```json
{
  "created_at": "2026-01-29T10:30:00Z",
  "updated_at": "2026-01-29T10:35:00Z",
  "spec": "001-user-auth",
  "project": "PROJ",
  "jira_base_url": "https://your-jira.atlassian.net",
  "epic": {
    "key": "PROJ-100",
    "summary": "User Authentication System",
    "url": "https://your-jira.atlassian.net/browse/PROJ-100"
  },
  "stories": [
    {
      "key": "PROJ-101",
      "summary": "Phase 1: Setup (Shared Infrastructure)",
      "url": "https://your-jira.atlassian.net/browse/PROJ-101",
      "tasks": [
        {
          "key": "PROJ-110",
          "id": "T001",
          "parent_key": "PROJ-101",
          "summary": "Initialize pnpm workspace with Nx and NestJS presets",
          "status": "completed",
          "url": "https://your-jira.atlassian.net/browse/PROJ-110"
        },
        {
          "key": "PROJ-111",
          "id": "T002",
          "parent_key": "PROJ-101",
          "summary": "Add root tsconfig.base.json with path aliases",
          "status": "completed",
          "url": "https://your-jira.atlassian.net/browse/PROJ-111"
        }
      ]
    },
    {
      "key": "PROJ-102",
      "summary": "Phase 2: Foundational (Blocking Prerequisites)",
      "url": "https://your-jira.atlassian.net/browse/PROJ-102",
      "tasks": [
        {
          "key": "PROJ-120",
          "id": "T010",
          "summary": "Generate libs/core scaffold",
          "status": "completed",
          "url": "https://your-jira.atlassian.net/browse/PROJ-120"
        }
      ]
    }
  ],
  "mode": "3-level",
  "cost_rollup": {
    "estimate_type": "model_multiplier_sum",
    "total_multiplier_units": 0,
    "by_model": {"gpt-5-mini": 0},
    "copilot_session_ids": ["session-or-null"]
  },
  "summary": {
    "total_stories": 10,
    "total_tasks": 94,
    "completed_tasks": 87,
    "pending_tasks": 7
  }
}
```

#### 2-Level Mode Mapping

```json
{
  "created_at": "2026-01-29T10:30:00Z",
  "updated_at": "2026-01-29T10:35:00Z",
  "spec": "001-user-auth",
  "project": "PROJ",
  "jira_base_url": "https://your-jira.atlassian.net",
  "mode": "2-level",
  "epic": {
    "key": "PROJ-100",
    "summary": "User Authentication System",
    "url": "https://your-jira.atlassian.net/browse/PROJ-100"
  },
  "stories": [
    {
      "key": "PROJ-101",
      "summary": "Phase 1: Setup (Shared Infrastructure)",
      "url": "https://your-jira.atlassian.net/browse/PROJ-101",
      "embedded_tasks": [
        {"id": "T001", "summary": "Initialize pnpm workspace", "status": "completed"},
        {"id": "T002", "summary": "Add root tsconfig.base.json", "status": "completed"},
        {"id": "T003", "summary": "Configure root eslint.config.mjs", "status": "pending"}
      ]
    }
  ],
  "cost_rollup": {
    "estimate_type": "model_multiplier_sum",
    "total_multiplier_units": 0,
    "by_model": {"gpt-5-mini": 0},
    "copilot_session_ids": ["session-or-null"]
  },
  "summary": {
    "total_stories": 10,
    "total_embedded_tasks": 94,
    "completed_tasks": 87,
    "pending_tasks": 7
  }
}
```

Note: In 2-level mode, `embedded_tasks` contains task metadata without Jira keys (since no Jira issues were created for tasks).

### 11. Display Summary

Output a complete summary based on the mode used. Include cost rollup metadata
from verified state records. Label it as a model-multiplier estimate, not true
Premium request cost.

#### 3-Level Mode Summary

```
═══════════════════════════════════════════════════════════════
✅ Jira Hierarchy Created Successfully! (3-level mode)
═══════════════════════════════════════════════════════════════

📋 Project: PROJ
📁 Spec: 001-user-auth

Spec issue: PROJ-100 - User Authentication System
  └── https://your-jira.atlassian.net/browse/PROJ-100

Phase issues (10):
  ├── PROJ-101 - Phase 1: Setup (9 tasks)
  ├── PROJ-102 - Phase 2: Foundational (17 tasks)
  ├── PROJ-103 - Phase 3: User Story 1 (10 tasks)
  └── ... (7 more)

Summary:
  • Total phase issues: 10
  • Total task issues: 94
  • Completed: 87 (93%)
  • Pending: 7 (7%)
  • Cost estimate: 0 model-multiplier units (gpt-5-mini=0)
  • Copilot sessions: session-or-null

💾 Mapping saved to: specs/001-user-auth/jira-mapping.json

Next steps:
  • View spec issue in Jira: https://your-jira.atlassian.net/browse/PROJ-100
  • Sync status later: /speckit.concierge-jira.sync-status --spec 001-user-auth
═══════════════════════════════════════════════════════════════
```

#### 2-Level Mode Summary

```text
═══════════════════════════════════════════════════════════════
✅ Jira Hierarchy Created Successfully! (2-level mode)
═══════════════════════════════════════════════════════════════

📋 Project: PROJ
📁 Spec: 001-user-auth

Spec issue: PROJ-100 - User Authentication System
  └── https://your-jira.atlassian.net/browse/PROJ-100

Phase issues (10):
  ├── PROJ-101 - Phase 1: Setup (9 tasks embedded)
  ├── PROJ-102 - Phase 2: Foundational (17 tasks embedded)
  ├── PROJ-103 - Phase 3: User Story 1 (10 tasks embedded)
  └── ... (7 more)

Summary:
  • Mode: 2-level (spec issue → phase issues only)
  • Total phase issues: 10
  • Total tasks: 94 (embedded in phase issue descriptions)
  • Cost estimate: 0 model-multiplier units (gpt-5-mini=0)
  • Copilot sessions: session-or-null

💾 Mapping saved to: specs/001-user-auth/jira-mapping.json

Next steps:
  • View spec issue in Jira: https://your-jira.atlassian.net/browse/PROJ-100
  • Tasks are tracked as checklists within phase issue descriptions
═══════════════════════════════════════════════════════════════
```

## Configuration Reference

Edit `.specify/extensions/jira/jira-config.yml` to customize:

| Config Key | Description | Default |
|------------|-------------|---------|
| `mcp_server` | MCP server name | "atlassian" |
| `project.key` | Jira project key | (required) |
| `mapping.spec_artifact` | Issue type for SPEC.md | "Epic" |
| `mapping.phase_artifact` | Issue type for Phases | "Story" |
| `mapping.task_artifact` | Issue type for Tasks. Set to `""` or `"none"` for 2-level mode | "Task" |
| `mapping.relationships.*` | Link types between issues | See docs |
| `mapping.relationship_field` | Company-managed Epic Link custom field passed to the filer when needed | `customfield_10014` |
| `defaults.spec.labels` | Labels for Spec | [] |
| `defaults.phase.labels` | Labels for Phases | [] |
| `defaults.task.labels` | Labels for Tasks (3-level only) | [] |

## Troubleshooting

### "Jira configuration not found"

Copy the template and configure:
```bash
cp .specify/extensions/jira/jira-config.template.yml .specify/extensions/jira/jira-config.yml
# Edit jira-config.yml with your project settings
```

### "Sub-task cannot have spec issue as parent"

Some Jira configurations don't allow subtasks under Epics. The command handles this by:
1. Creating phase issues under the spec issue
2. Creating sub-tasks under phase issues (not directly under the spec issue)

### "Issue type not found"

Use `/speckit.concierge-jira.discover-fields` to discover available issue types in your Jira project, then update `jira-config.yml` accordingly.

### Custom Fields

If your Jira project requires custom fields (e.g., Team, Sprint), discover them with `/speckit.concierge-jira.discover-fields` and add to the config:

```yaml
defaults:
  spec:
    custom_fields:
      customfield_10001: "Platform Team"
  phase:
    custom_fields:
      customfield_10002: "Sprint 1"
```

## Notes

- This command creates issues in sequence: spec issue → phase issues → task issues
- The mapping file enables `/speckit.concierge-jira.sync-status` to sync completion status
- Re-running creates new issues unless you manually update the mapping
- Task IDs (T001, T002) are preserved in Jira summaries for traceability
