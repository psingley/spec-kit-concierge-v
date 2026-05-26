---
description: Create Jira hierarchy from spec and tasks
tools:
- '{mcp_server}/createJiraIssue'
- '{mcp_server}/editJiraIssue'
- '{mcp_server}/searchJiraIssuesUsingJql'
- '{mcp_server}/getJiraIssue'
- '{mcp_server}/createIssueLink'
- '{mcp_server}/getIssueLinkTypes'
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

Relationship options: `"Parent"`, `"Epic Link"`, `"Relates"`, `"Blocks"`, `"Implements"`, `"is child of"`, `"none"`

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

### 7. Create Spec Issue from SPEC.md

Use the configured MCP server to create the Spec issue:

```
Tool: {mcp_server}/createJiraIssue
Parameters:
  - projectKey: {project.key}
  - issueTypeName: {mapping.spec_artifact}
  - summary: {spec_title}
  - description: {structured_spec_description}
  - additional_fields: {defaults.spec.custom_fields}
```

Build `structured_spec_description` from the spec instead of dumping raw content
blindly. Use an explicit standalone body contract:

- opening summary paragraph
- `## Key outcomes`
- `## Scope constraints`
- `## Acceptance highlights`

Prefer concrete, behavior-facing bullets under each heading. Do not rely on raw
spec excerpts when a concise synthesized summary would read more clearly in Jira.

Store the created spec issue key (e.g., "PROJ-100") for linking later phase and task issues.

Display:
```
✅ Created spec issue: PROJ-100 - User Authentication System
   URL: https://your-jira.atlassian.net/browse/PROJ-100
```

### 8. Create Phase Issues for Each Phase

For each phase extracted from TASKS.md, create a phase issue and link it to the spec issue.

**First, check if 2-level mode is enabled:**

```
is_two_level_mode = (task_artifact == "" OR task_artifact == "none" OR task_artifact is not set)
```

**Step 7a: Create the Phase Issue**

The Phase description varies based on mode:

**3-Level Mode (default):** Hybrid story-plus-execution contract
```
Tool: {mcp_server}/createJiraIssue
Parameters:
  - projectKey: {project.key}
  - issueTypeName: {mapping.phase_artifact}
  - summary: {phase_name}
  - description: |
      As a {phase_actor}, I want {phase_capability} so that {phase_value}.

      ## Acceptance Criteria

      **{acceptance_scenario_1_title}**
      Given ...
      When ...
      Then ...

      **{acceptance_scenario_2_title}**
      Given ...
      When ...
      Then ...

      Goal: {phase_goal}
      Independent Test: {phase_independent_test}

      Why this phase matters:
      {phase_value_summary}

      Implementation outline:
      - T001: ...
      - T002: ...
  - additional_fields: {defaults.phase.custom_fields}
```

When building the Phase description:

- prefer an explicit `As a ... I want ... so that ...` user-story statement from
  the source artifacts; if one is not present, synthesize one from the spec and
  Phase goal
- express acceptance criteria as behavior-oriented scenarios, preferably in
  `Given / When / Then` form
- keep the `Goal`, `Independent Test`, and implementation outline so the issue
  remains actionable for engineering and QA
- do not let the implementation outline replace the story statement or
  acceptance criteria

**2-Level Mode:** Full task checklist embedded in description
```
Tool: {mcp_server}/createJiraIssue
Parameters:
  - projectKey: {project.key}
  - issueTypeName: {mapping.phase_artifact}
  - summary: {phase_name}
  - description: |
      As a {phase_actor}, I want {phase_capability} so that {phase_value}.

      ## Acceptance Criteria

      **{acceptance_scenario_1_title}**
      Given ...
      When ...
      Then ...

      Goal: {phase_goal}
      Independent Test: {phase_independent_test}

      ## Tasks

      - [x] T001: Initialize pnpm workspace with Nx and NestJS presets
      - [x] T002: Add root tsconfig.base.json with path aliases
      - [ ] T003: Configure root eslint.config.mjs
      ...
  - additional_fields: {defaults.phase.custom_fields}
```

**Step 7b: Link Phase to Spec based on `relationships.spec_phase`**

| spec_phase value | Action |
|------------------|--------|
| `"Parent"` | Set Phase's parent field to Spec key |
| `"Epic Link"` | Set Epic Link custom field on Phase to Spec key |
| `"Relates"` / `"Blocks"` / etc. | Create issue link from Phase to Spec |
| `"none"` | No link created |

Store each Phase key for linking tasks (if 3-level mode).

Display (3-level mode):
```
✅ Created Phase: PROJ-101 - Phase 1: Setup (Shared Infrastructure)
   URL: https://your-jira.atlassian.net/browse/PROJ-101
   Linked to Spec via: {relationships.spec_phase}
   Tasks: 9 tasks to create
```

Display (2-level mode):
```
✅ Created Phase: PROJ-101 - Phase 1: Setup (Shared Infrastructure)
   URL: https://your-jira.atlassian.net/browse/PROJ-101
   Linked to Spec via: {relationships.spec_phase}
   Tasks: 9 tasks (embedded in description)
```

### 9. Create Individual Jira Issues for EACH Task

**⚠️ SKIP THIS STEP IF 2-LEVEL MODE IS ENABLED**

If `task_artifact` is empty (`""`) or `"none"`, skip this entire step and proceed to Step 9.
In 2-level mode, tasks are already embedded in Phase descriptions.

---

#### 3-Level Mode Only

**CRITICAL: This step is MANDATORY in 3-level mode. You MUST create a separate Jira issue for EVERY task listed in TASKS.md.**

DO NOT skip this step in 3-level mode. DO NOT just put tasks in the Phase description. Each `- [ ] T001 ...` line in TASKS.md becomes its own Jira issue.

**For each task item** (e.g., `- [x] T001 Initialize pnpm workspace...`):

**Step 8a: Create the Jira Task issue**

Call the MCP tool to create the task with a standalone description:

```
Tool: {mcp_server}/createJiraIssue
Parameters:
  - projectKey: {project.key}
  - issueTypeName: {mapping.task_artifact}
  - summary: "{task_id}: {task_description}"
  - description: |
      Contributes to: {phase_story_summary}

      {task_delivery_sentence}

      Affected files:
      - path/from/task.ts

      Done when:
      - {task_done_when_1}
      - {task_done_when_2}
  - additional_fields: {defaults.task.custom_fields}
```

When building task descriptions:

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

**Step 8b: Link Task to Phase based on `relationships.phase_task`**

| phase_task value | Action |
|------------------|--------|
| `"Parent"` | Set Task's parent field to Phase key |
| `"Relates"` / `"Blocks"` / etc. | Create issue link from Task to Phase |
| `"none"` | No link created |

**Step 8c: Link Task to Spec based on `relationships.spec_task`**

| spec_task value | Action |
|-----------------|--------|
| `"Epic Link"` | Set Epic Link custom field on Task to Spec key |
| `"Relates"` / `"Blocks"` / etc. | Create issue link from Task to Spec |
| `"none"` | No direct Task-Spec link |

**CRITICAL EXECUTION RULE:** Create and verify tasks for **one Phase at a time**.
Do not interleave task creation across multiple Phases. Before creating a task,
hold the current Phase key in working memory and confirm that the task being
created belongs to that Phase from `TASKS.md`.

**Step 8d: Verify the live task issue before continuing**

After creating each task issue, immediately call `getJiraIssue` for the newly
created task key and verify all of the following against the local source
artifacts before moving to the next task:

1. the live task `summary` matches `{task_id}: {task_description}`
2. the live `description` preserves the expected `Contributes to` line and
   `Done when` criteria for the task
3. the live task `parent.key` matches the expected current Phase key whenever
   `relationships.phase_task` is `"Parent"`

If any verification fails:

- stop the run immediately
- report the mismatch clearly
- do **not** continue creating additional tasks
- do **not** save or trust `jira-mapping.json` until the mismatch is resolved

**Repeat steps 8a-8d for EVERY task** in the phase before moving to the next Phase.

Example: If Phase 1 has 9 tasks (T001-T009), you create 9 Jira issues:
```
Creating tasks for Story PROJ-101 (Phase 1: Setup):
  ├── ✅ PROJ-110 - T001: Initialize pnpm workspace
  ├── ✅ PROJ-111 - T002: Add root tsconfig.base.json
  ├── ✅ PROJ-112 - T003: Configure root eslint.config.mjs
  ├── ✅ PROJ-113 - T004: Configure prettier
  ├── ✅ PROJ-114 - T005: Add root vitest.config.ts
  ├── ✅ PROJ-115 - T006: Add .npmrc
  ├── ✅ PROJ-116 - T007: Add Nx workspace config
  ├── ✅ PROJ-117 - T008: Add workspace lint/test scripts
  └── ✅ PROJ-118 - T009: Add .gitignore updates

9 tasks created for Phase 1
```

**IMPORTANT**: The jira-mapping.json must include ALL created task keys and must
reflect the **verified live Jira state**, not just the intended local plan. If
tasks are missing from the mapping, or if a task was created under the wrong
parent, you have not completed this step correctly.

### 10. Save Issue Mapping

Save a comprehensive mapping file at `specs/<spec-name>/jira-mapping.json`.

Before writing the mapping file, perform one final verification pass:

1. fetch each created Phase issue and confirm it matches the expected Phase title
2. fetch each created task issue and confirm its live parent matches the
   expected Phase key
3. only then write `jira-mapping.json`

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
  "summary": {
    "total_stories": 10,
    "total_embedded_tasks": 94,
    "completed_tasks": 87,
    "pending_tasks": 7
  }
}
```

Note: In 2-level mode, `embedded_tasks` contains task metadata without Jira keys (since no Jira issues were created for tasks).

### 10. Display Summary

Output a complete summary based on the mode used.

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