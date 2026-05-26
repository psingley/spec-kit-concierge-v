# Jira Extension Usage Guide

This guide walks through common workflows using the Jira integration extension.

## Table of Contents

1. [First Time Setup](#first-time-setup)
2. [Basic Workflow](#basic-workflow)
3. [Advanced Configuration](#advanced-configuration)
4. [Status Synchronization](#status-synchronization)
5. [Custom Fields](#custom-fields)
6. [Troubleshooting](#troubleshooting)

---

## First Time Setup

### 1. Install Extension

From your spec-kit project directory:

```bash
specify extension add jira
```

This will:

- Install the extension to `.specify/extensions/jira/`
- Create config template at `.specify/extensions/jira/jira-config.template.yml`
- Register commands with your AI agent

### 2. Configure MCP Server and Jira Project

Create your working config from the installed template:

```bash
cp .specify/extensions/jira/jira-config.template.yml \
  .specify/extensions/jira/jira-config.yml
```

Then edit `.specify/extensions/jira/jira-config.yml`:

```yaml
# MCP server providing Jira tools (default: "atlassian")
mcp_server: "atlassian"

project:
  key: "MYPROJECT"  # Your Jira project key
```

### 3. Verify MCP Server

Ensure your MCP server providing Jira tools is configured in your AI agent (Claude Code). The server name in your MCP settings must match the `mcp_server` value in jira-config.yml.

---

## Basic Workflow

### Create Specification and Tasks

First, use spec-kit to create your specification and task breakdown:

```bash
claude
> /speckit.spec

# Follow the prompts to create your specification
# Output: SPEC.md

> /speckit.tasks

# Generate implementation tasks from spec
# Output: TASKS.md
```

### Create Jira Issues

Convert your spec and tasks into Jira issues:

```bash
> /speckit.concierge-jira.specstoissues
```

Use the fully namespaced command. The short alias
`/speckit.specstoissues` is intentionally omitted from the manifest for
compatibility with newer Spec Kit extension validation.

This flow:

- **Auto-detects** the target specification
- **Renders a read-only dry-run preview** before any Jira writes
- **Creates 1 spec issue** from SPEC.md (overall specification; default issue type: `Epic`)
- **Creates phase issues** from `## Phase ...` headers in TASKS.md
- **Creates task issues** from checkbox task lines in 3-level mode
- **Verifies live parentage and summaries** before writing the local mapping

**Output files:**

- `specs/<spec-name>/jira-mapping.json` - Maps local tasks to Jira issue keys

**Example output:**

```text
🧪 Dry-run preview ready
Spec issue: User Authentication System
Phase issues: 2
Task issues: 5
Approval required before Jira writes begin

✅ Jira issues created successfully!
Spec issue: PROJ-1234 - User Authentication System
Created 2 phase issues and 5 task issues
Verified live Jira state and wrote specs/<spec-name>/jira-mapping.json
```

### Implement Tasks

Work on your tasks locally, and mark them as complete in TASKS.md when done:

```markdown
# Tasks

- [x] T001 Implement login endpoint
- [~] T002 Add password hashing
- [ ] T003 Write authentication tests
```

### Sync Status to Jira

Update Jira issue statuses based on local completion:

```bash
> /speckit.concierge-jira.sync-status
```

This will:

- Read checkbox-based task completion from TASKS.md
- Match tasks by stable IDs from `jira-mapping.json`
- Apply one or more Jira transitions until the issue reaches the configured completed status
- Log sync activity to `specs/<spec-name>/jira-sync-log.json`

---

## Advanced Configuration

### Using Custom Fields

#### Step 1: Discover Available Fields

```bash
> /speckit.concierge-jira.discover-fields
```

**Output:**

```text
📋 Available Custom Fields:

Custom Fields (available in your Jira instance):
  • customfield_10001 - Sprint
  • customfield_10002 - Story Points
  • customfield_10003 - Component
  • customfield_10004 - Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 Configuration Snippets
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Add these to your jira-config.yml:

defaults:
  task:
    custom_fields:
      customfield_10002: 2  # Story points
      customfield_10004: "Engineering"  # Team
```

#### Step 2: Add to Configuration

Copy the snippets to your `jira-config.yml`:

```yaml
project:
  key: "PROJ"

defaults:
  spec:
    labels: ["spec-driven"]
    custom_fields:
      customfield_10001: "Sprint 42"

  task:
    labels: ["implementation"]
    custom_fields:
      customfield_10002: 2  # Default story points
      customfield_10004: "Platform Engineering"
```

#### Step 3: Create Issues

Run `/speckit.concierge-jira.specstoissues` to create issues with custom fields.

### Local Configuration Overrides

For local testing without affecting the project configuration:

```bash
# Create local override file (gitignored)
cp .specify/extensions/jira/jira-config.yml \
   .specify/extensions/jira/jira-config.local.yml

# Edit local file
vim .specify/extensions/jira/jira-config.local.yml
```

Example local override:

```yaml
# jira-config.local.yml
project:
  key: "MYTEST"  # Personal test project

defaults:
  task:
    custom_fields:
      customfield_10002: 1  # Lower story points for testing
```

### Environment Variable Overrides

For CI/CD or temporary overrides:

```bash
# Override MCP server name
export SPECKIT_JIRA_MCP_SERVER="atlassian"

# Override project key
export SPECKIT_JIRA_PROJECT_KEY="DEVTEST"

# Override artifact types
export SPECKIT_JIRA_SPEC_ARTIFACT="Epic"
export SPECKIT_JIRA_PHASE_ARTIFACT="Story"
export SPECKIT_JIRA_TASK_ARTIFACT="Task"

# Now create issues
claude
> /speckit.concierge-jira.specstoissues
# Will use DEVTEST project
```

---

## Status Synchronization

### Marking Tasks Complete

The sync-status command recognizes checkbox markers with stable task IDs:

```markdown
- [x] T001 Implement login endpoint
- [~] T002 Add password hashing
- [ ] T003 Write authentication tests
```

### Sync Workflow

1. **Implement tasks locally**
2. **Mark completed tasks** in TASKS.md
3. **Run sync command**:

   ```bash
   > /speckit.concierge-jira.sync-status
   ```

**Output:**

```text
🔄 Syncing task status to Jira project: PROJ

📝 Parsing task completion from specs/<spec-name>/tasks.md...
📋 Loading issue mappings from specs/<spec-name>/jira-mapping.json...
🔄 Syncing statuses...

  ✓ T001 (PROJ-1235) - Transitioning to completed status
  ~ T002 (PROJ-1236) - Moving into in-progress status if needed
  ○ T003 (PROJ-1237) - Pending locally, no Jira change

📊 Overall Progress: 1 / 3 tasks (33%)

✅ Status sync completed!
```

---

## Custom Fields

### Common Field Mappings

**Story Points:**

```yaml
defaults:
  task:
    custom_fields:
      customfield_10002: 3  # Complexity estimate
```

**Sprint Assignment:**

```yaml
defaults:
  spec:
    custom_fields:
      customfield_10001: "Sprint 42"
```

**Team:**

```yaml
defaults:
  task:
    custom_fields:
      customfield_10004: "Backend Team"
```

**Component:**

```yaml
defaults:
  task:
    custom_fields:
      customfield_10003: "API"
```

### Field Type Reference

- **Text fields**: Use strings (`"value"`)
- **Number fields**: Use integers (`42`)
- **Select fields**: Use option value (`"option1"`)
- **Multi-select**: Use array (`["option1", "option2"]`)
- **Date fields**: Use ISO format (`"2026-01-28"`)

---

## Troubleshooting

### Extension Not Found

**Error:** `Extension 'jira' not found`

**Solution:**

```bash
specify extension add jira
```

### Configuration Not Found

**Error:** `Jira configuration not found`

**Solution:**

```bash
# Check if file exists
ls .specify/extensions/jira/jira-config.yml

# If not, reinstall extension
specify extension remove jira
specify extension add jira
```

### Project Key Not Set

**Error:** `Jira project key not configured`

**Solution:**
Edit `.specify/extensions/jira/jira-config.yml`:

```yaml
project:
  key: "YOURPROJECT"
```

### MCP Tool Not Available

**Error:** `Tool '{mcp_server}/createJiraIssue' not found`

**Solution:**

1. Check MCP configuration in your AI agent
2. Verify your MCP server providing Jira tools is installed and configured
3. Ensure `mcp_server` in jira-config.yml matches your MCP server name (e.g., "atlassian")
4. Restart AI agent after MCP configuration changes

### Permission Denied

**Error:** `Permission denied` or `Project not found`

**Solution:**

1. Verify Jira credentials in your MCP server configuration
2. Check project key is correct
3. Ensure you have create issue permissions in the Jira project

### Custom Field Errors

**Error:** `Field 'customfield_10002' does not exist`

**Solution:**

1. Run `/speckit.concierge-jira.discover-fields` to find correct field IDs
2. Verify field is available for your issue type
3. Check spelling of field ID in configuration

### Workflow Transition Errors

**Error:** `Transition 'Done' not found`

**Solution:**
Check your project's workflow and configure the correct transition:

```yaml
workflow:
  done_status: "Closed"  # or "Resolved", etc.
  done_transition: "Close Issue"
```

---

## Best Practices

1. **Run discover-fields first**: Always discover custom fields before configuring them
2. **Use local config for testing**: Keep project config clean, use local overrides for experiments
3. **Commit mapping files**: Add `.specify/jira-mapping.json` to git for team visibility
4. **Sync regularly**: Run sync-status after each task completion for accurate tracking
5. **Version control config**: Commit `jira-config.yml` for consistent team workflows

---

## Next Steps

- Explore hook configuration for automatic issue creation
- Set up bi-directional sync (future feature)
- Integrate with sprint planning workflows
- Customize issue templates for your team
