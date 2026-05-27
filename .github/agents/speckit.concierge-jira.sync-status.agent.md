---
description: Sync task completion status to Jira
tools:
- atlassian/addCommentToJiraIssue
- atlassian/editJiraIssue
- atlassian/getJiraIssue
- atlassian/getTransitionsForJiraIssue
- atlassian/transitionJiraIssue
---


<!-- Extension: concierge-jira -->
<!-- Config: .specify/extensions/concierge-jira/ -->
# Sync Task Completion Status to Jira

This command syncs task completion status from your local tasks.md file to Jira, updating issue statuses and progress.

## Purpose

As you implement tasks locally, you can mark them as completed in tasks.md. This command:

1. Reads the local task status from `specs/<spec-name>/tasks.md`
2. Reads the Jira issue mapping from `specs/<spec-name>/jira-mapping.json`
3. Updates Jira issue statuses to match local completion
4. Optionally transitions issues through workflow states

## Prerequisites

1. MCP server providing Jira tools configured and running (server name configured in jira-config.yml)
2. Issues already created via `/speckit.concierge-jira.specstoissues`
3. Mapping file exists: `specs/<spec-name>/jira-mapping.json`
4. tasks.md file with completion markers

## User Input

$ARGUMENTS

Accepts optional `--spec <name>` argument to specify which specification to sync.
If not provided, auto-detects from current directory or available specs.

## Steps

### 1. Detect Specification Directory

Determine which specification to sync (in order of priority):

1. `--spec <name>` argument
2. Git branch name (if matches a spec with Jira mapping)
3. Current directory (if inside `specs/<name>/`)
4. Single spec with Jira mapping (if only one exists)

```bash
# Parse --spec argument if provided
spec_name=""
for arg in "$@"; do
  if [[ "$prev_arg" == "--spec" ]]; then
    spec_name="$arg"
  fi
  prev_arg="$arg"
done

# Auto-detection logic
if [ -z "$spec_name" ]; then
  # Try to detect from git branch name
  # Common patterns: feature/005-spec-name, 005-spec-name, spec/005-spec-name
  if command -v git &> /dev/null && git rev-parse --git-dir &> /dev/null; then
    branch_name=$(git branch --show-current 2>/dev/null)
    if [ -n "$branch_name" ]; then
      # Extract spec name from branch (remove common prefixes like feature/, spec/, etc.)
      potential_spec=$(echo "$branch_name" | sed -E 's#^(feature|spec|bugfix|hotfix|release)/##')
      if [ -f "specs/$potential_spec/jira-mapping.json" ]; then
        spec_name="$potential_spec"
        echo "📍 Auto-detected spec from git branch: $spec_name"
      fi
    fi
  fi
fi

if [ -z "$spec_name" ]; then
  # Check if current directory is inside a spec folder
  current_dir=$(pwd)
  if [[ "$current_dir" =~ specs/([^/]+) ]]; then
    spec_name="${BASH_REMATCH[1]}"
    echo "📍 Auto-detected spec from current directory: $spec_name"
  # Check if there's exactly one spec with a jira-mapping.json
  elif [ -d "specs" ]; then
    mapped_specs=$(find specs -maxdepth 2 -name "jira-mapping.json" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$mapped_specs" -eq 1 ]; then
      spec_name=$(dirname "$(find specs -maxdepth 2 -name "jira-mapping.json")" | xargs basename)
      echo "📍 Auto-detected spec with Jira mapping: $spec_name"
    elif [ "$mapped_specs" -eq 0 ]; then
      echo "❌ Error: No specifications with Jira mapping found"
      echo "Run /speckit.concierge-jira.specstoissues first to create Jira issues"
      exit 1
    else
      echo "❌ Error: Multiple specifications have Jira mappings. Please specify which one to sync:"
      echo ""
      find specs -maxdepth 2 -name "jira-mapping.json" | while read mapping; do
        echo "  --spec $(basename "$(dirname "$mapping")")"
      done
      echo ""
      echo "Usage: /speckit.concierge-jira.sync-status --spec <name>"
      exit 1
    fi
  else
    echo "❌ Error: No specs/ directory found"
    exit 1
  fi
fi

# Validate spec directory and mapping exist
spec_dir="specs/$spec_name"
mapping_file="$spec_dir/jira-mapping.json"

if [ ! -d "$spec_dir" ]; then
  echo "❌ Error: Specification directory not found: $spec_dir"
  exit 1
fi

if [ ! -f "$mapping_file" ]; then
  echo "❌ Error: Jira mapping not found: $mapping_file"
  echo "Run /speckit.concierge-jira.specstoissues --spec $spec_name first to create Jira issues"
  exit 1
fi

echo "📂 Using specification: $spec_name"
echo "   Directory: $spec_dir"
echo ""
```

### 2. Load Configuration

```bash
config_file=".specify/extensions/jira/jira-config.yml"

if [ ! -f "$config_file" ]; then
  echo "❌ Error: Jira configuration not found at $config_file"
  exit 1
fi

# Read configuration values
mcp_server=$(yq eval '.mcp_server // "atlassian"' "$config_file")
project_key=$(yq eval '.project.key' "$config_file")

# Apply environment variable overrides
mcp_server="${SPECKIT_JIRA_MCP_SERVER:-$mcp_server}"
project_key="${SPECKIT_JIRA_PROJECT_KEY:-$project_key}"

echo "🔌 MCP Server: $mcp_server"
echo "🔄 Syncing task status to Jira project: $project_key"
echo ""
```

### 3. Parse tasks.md for Completion Status

Read tasks.md and identify completed tasks. Expected format:

```markdown
# Tasks

- [x] T001 Implement login endpoint
- [~] T002 Add password hashing
- [ ] T003 Create user registration
```

Parse tasks and extract:

- Stable task identifier (for example `T001`)
- Local task status from checkbox markers:
  - `[x]` / `[X]` → completed
  - `[~]` → in progress
  - `[ ]` → pending

```bash
tasks_file="$spec_dir/tasks.md"

if [ ! -f "$tasks_file" ]; then
  echo "❌ Error: Tasks file not found: $tasks_file"
  exit 1
fi

# Parse tasks by stable ID (pseudo-code)
# completed_task_ids=$(grep -E "^- \\[[xX]\\] T[0-9]+" "$tasks_file" | sed -E 's/^- \\[[xX]\\] (T[0-9]+).*/\\1/')
# in_progress_task_ids=$(grep -E "^- \\[~\\] T[0-9]+" "$tasks_file" | sed -E 's/^- \\[~\\] (T[0-9]+).*/\\1/')
# pending_task_ids=$(grep -E "^- \\[ \\] T[0-9]+" "$tasks_file" | sed -E 's/^- \\[ \\] (T[0-9]+).*/\\1/')

echo "📝 Parsing task completion from $tasks_file..."
```

### 4. Load Jira Issue Mapping

Read the mapping file to get Jira issue keys for each task:

```bash
# Read mapping (pseudo-code)
# epic_key=$(jq -r '.epic.key' "$mapping_file")
# mode=$(jq -r '.mode // "3-level"' "$mapping_file")
#
# In 3-level mode, flatten nested story/task mappings into records keyed by task ID:
# jq -c '.stories[] | . as $story | ($story.tasks // [])[] | {
#   story_key: $story.key,
#   story_summary: $story.summary,
#   task_id: .id,
#   task_key: .key,
#   task_summary: .summary
# }' "$mapping_file"
#
# In 2-level mode there are no task issue keys, so do not attempt task transitions.
# Use embedded task metadata only for progress reporting unless you intentionally
# support phase-level transitions.

echo "📋 Loading issue mappings from $mapping_file..."
```

### 5. Get Available Transitions

For each Jira issue you plan to update, query its current status and available transitions:

```markdown
Call the configured MCP server to get available transitions:
- Tool: atlassian/getJiraIssue
- Parameters: { "cloudId": "$atlassian_cloud_id", "issueIdOrKey": "$task_key" }

- Tool: atlassian/getTransitionsForJiraIssue
- Parameters: { "cloudId": "$atlassian_cloud_id", "issueIdOrKey": "$task_key" }

Common transitions:
- "To Do" → "In Progress" → "Done"
- "Open" → "In Progress" → "Resolved" → "Closed"
- "Backlog" → "Start Work" → "Complete"

Identify:
- whether the issue is already in a completed status
- whether a direct completion transition is available
- or whether the issue must move through one or more intermediate transitions first

Use these heuristics:
1. Treat configured `status_mapping.completed` as the preferred completed status name.
2. Also recognize common completion statuses such as `Done`, `Closed`, and `Resolved`.
3. If no direct completion transition is available, choose a forward-progress transition whose name or target status suggests work has started (for example `Start Work`, `Start Progress`, `Selected for Development`, `In Progress`), then re-query transitions.
4. Repeat until the issue reaches a completed status or no forward path remains.
5. Never assume a single transition can always move an issue from backlog/to-do directly to done.
```

### 6. Update Jira Issue Statuses

For each mapped task issue in 3-level mode:

1. Match the Jira issue by stable task ID from `tasks.md` and `jira-mapping.json`
2. Get the current Jira issue status
3. If the local task status is `completed` and Jira is not complete:
   - transition through the workflow until the issue reaches the completed status
   - add a comment noting it was completed locally via spec-kit
4. If the local task status is `in_progress` and Jira is still backlog/to-do:
   - move it into an in-progress status if a suitable transition is available
5. If the local task is pending, leave Jira unchanged unless you explicitly support reverse-sync behavior

```bash
echo "🔄 Syncing statuses..."
echo ""

# For each mapped task record (pseudo-code):
# for task in "${mapped_tasks[@]}"; do
#   task_id="${task.task_id}"
#   task_key="${task.task_key}"
#   local_status="${local_task_status[$task_id]}"
#
#   # Load current Jira status
#   # Tool: atlassian/getJiraIssue
#   # Parameters: { "cloudId": "$atlassian_cloud_id", "issueIdOrKey": "$task_key" }
#
#   # Completed locally: keep transitioning until Jira reaches done/closed/resolved
#   if [[ "$local_status" == "completed" ]]; then
#     echo "  ✓ $task_id ($task_key) - Syncing to completed status"
#
#     # Loop with a small max step count to avoid infinite workflow loops
#     # while current_status not in completed_statuses:
#     #   Tool: atlassian/getTransitionsForJiraIssue
#     #   Parameters: { "cloudId": "$atlassian_cloud_id", "issueIdOrKey": "$task_key" }
#     #
#     #   1. Prefer a transition whose target status is a completed status
#     #   2. Otherwise prefer a forward-progress transition like Start Work / In Progress
#     #   3. Apply one transition, then re-read status and transitions
#     #
#     # Tool: atlassian/transitionJiraIssue
#     # Parameters: { "cloudId": "$atlassian_cloud_id", "issueIdOrKey": "$task_key", "transition": { "id": "$transition_id" } }
#     #
#     # After the issue reaches a completed status:
#     # Tool: atlassian/addCommentToJiraIssue
#     # Parameters: {
#     #   "cloudId": "$atlassian_cloud_id",
#     #   "issueIdOrKey": "$task_key",
#     #   "commentBody": "Marked complete from specs/$spec_name/tasks.md via /speckit.concierge-jira.sync-status",
#     #   "contentFormat": "markdown"
#     # }
#   elif [[ "$local_status" == "in_progress" ]]; then
#     echo "  ~ $task_id ($task_key) - Syncing to in-progress status if needed"
#     # If the issue is not already in progress or done, choose a forward-progress transition
#   else
#     echo "  ○ $task_id ($task_key) - Pending locally, no Jira change"
#   fi
# done
```

### 7. Update Spec Issue Progress

Calculate overall completion and update epic:

```bash
# Calculate completion percentage
# total_tasks=${#mapped_tasks[@]}
# completed_count=${#completed_task_ids[@]}
# completion_pct=$((completed_count * 100 / total_tasks))

echo ""
echo "📊 Overall Progress: $completed_count / $total_tasks tasks ($completion_pct%)"

# Update the spec issue description with progress (optional)
# Tool: atlassian/editJiraIssue
# Parameters: { "cloudId": "$atlassian_cloud_id", "issueIdOrKey": "$epic_key", "description": "...\\n\\nProgress: $completion_pct% ($completed_count/$total_tasks tasks completed)" }
```

### 8. Display Summary

```bash
echo ""
echo "✅ Status sync completed!"
echo ""
echo "Spec issue: $epic_key"
echo "  Progress: $completion_pct% ($completed_count / $total_tasks tasks)"
echo ""
echo "Updated Tasks:"
for task_key in "${updated_tasks[@]}"; do
  echo "  • $task_key - Transitioned to Done"
done
echo ""

if [ ${#skipped_tasks[@]} -gt 0 ]; then
  echo "Skipped (already done):"
  for task_key in "${skipped_tasks[@]}"; do
    echo "  • $task_key"
  done
  echo ""
fi
```

### 9. Log Sync Activity

Save sync activity to a log file in the specification directory:

```bash
log_file="$spec_dir/jira-sync-log.json"

cat >> "$log_file" <<EOF
{
  "synced_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "spec": "$spec_name",
  "project": "$project_key",
  "epic": "$epic_key",
  "total_tasks": $total_tasks,
  "completed_tasks": $completed_count,
  "completion_pct": $completion_pct,
  "updated_issues": [$(printf '"%s",' "${updated_tasks[@]}" | sed 's/,$//')],
  "skipped_issues": [$(printf '"%s",' "${skipped_tasks[@]}" | sed 's/,$//')] }
EOF

echo "💾 Sync log saved to $log_file"
```

## Task Completion Markers

This command recognizes several formats for marking tasks as complete:

1. **Completed checkbox**: `- [x] T001 Implement authentication`
2. **In-progress checkbox**: `- [~] T002 Add error handling`
3. **Pending checkbox**: `- [ ] T003 Write tests`

Example tasks.md:

```markdown
# Tasks

- [x] T001 Implement authentication
- [x] T002 Add error handling
- [~] T003 Write tests
- [ ] T004 Deploy to staging
```

## Workflow Transitions

Different Jira projects have different workflows. Common patterns:

**Direct workflow:**

- To Do → Done

**Standard workflow:**

- To Do → In Progress → Done

**Complex workflow:**

- Backlog → Selected for Development → In Progress → Code Review → Testing → Done

The command must re-query transitions after every applied transition and continue until the issue reaches a completed status or no valid forward path remains.

## Configuration

Edit `.specify/extensions/jira/jira-config.yml` to customize:

```yaml
# Add workflow customization (optional)
workflow:
  # Name of the "completed" status in your workflow
  done_status: "Done"  # or "Closed", "Resolved", etc.

  # Transition name to use
  done_transition: "Done"  # or "Close Issue", "Resolve", etc.
```

## Notes

- This command is idempotent - running it multiple times is safe
- Only incomplete → complete transitions are performed (not reversible)
- The epic progress is calculated from the mapping, not queried from Jira
- Use this after implementing tasks and before final review
- In 3-level mode, tasks are matched by stable IDs like `T001`, not by list position
- Workflow transitions may require multiple steps before an issue can reach `Done`

## Troubleshooting

### "Mapping file not found"

Run `/speckit.concierge-jira.specstoissues --spec <name>` first to create the initial issue hierarchy for the specification.

### "Multiple specifications have Jira mappings"

Use `--spec <name>` to specify which specification to sync:

```bash
/speckit.concierge-jira.sync-status --spec 005-python-endpoint-alignment
```

### "Transition not found"

Your Jira workflow may require one or more intermediate transitions before completion. Re-check the available transitions for the current issue status and confirm the configured completed status name in `jira-config.yml`.

### "Issue not found"

The issue may have been deleted in Jira. Re-run `/speckit.concierge-jira.specstoissues --spec <name>` to recreate.