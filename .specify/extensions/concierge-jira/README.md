# Concierge Jira — Spec Kit Extension

[![Spec Kit](https://img.shields.io/badge/spec--kit-extension-blue?logo=github)](https://github.com/github/spec-kit)
[![Version](https://img.shields.io/badge/version-0.1.0-green)](https://github.com/psingley/concierge-jira/releases)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Issues](https://img.shields.io/github/issues/psingley/concierge-jira)](https://github.com/psingley/concierge-jira/issues)

Concierge fork of [`mbachorik/spec-kit-jira`](https://github.com/mbachorik/spec-kit-jira). Creates Jira spec, phase, and task issues directly from your spec-kit specifications and task breakdowns, with additional hardening: mandatory dry-run preflight, live read-back verification before mapping writes, first-run-safe `jira-mapping.json` handling, richer Feature/Subtask descriptions, stable-ID-aware `sync-status`, a clean `.extensionignore` packaging contract, and a gold-standard story-first ticket contract for Epic / Phase / Task bodies.

## Provenance

- Forked from `mbachorik/spec-kit-jira` at upstream `v3.0.0` (commit `ca5a05a`).
- Original MIT copyright preserved in `LICENSE`.
- Concierge additions on top: `be2c4a4`, `65f9252`, `f93a377`, `ab96b68`, `2c627e1`, `249f78f`.

## Features

- **3-Level Hierarchy**: Convert SPEC.md → spec issue, Phase headers → phase issues, Tasks → task issues
- **2-Level Mode**: Optional simplified mode (spec issue → phase issues with embedded task checklists)
- **Pre-flight Preview**: Generate a dry-run hierarchy preview and require explicit approval before Jira writes
- **Verified Mapping Writes**: Verify created issues against live Jira before trusting `jira-mapping.json`
- **Story-First Jira Descriptions**: Generate Epic, Phase, and Task bodies with outcomes, acceptance criteria, and `Done when` handoffs instead of thin metadata
- **Custom Field Discovery**: Discover and configure Jira custom fields
- **Status Synchronization**: Match checkbox-based stable task IDs and handle multi-step workflows
- **Flexible Configuration**: Project-level config with local overrides and environment variables
- **MCP Integration**: Works with any MCP server providing Jira/Atlassian tools (configurable)

## Installation

### Prerequisites

1. **Spec Kit** version 0.1.0 or higher
2. **MCP server providing Jira tools** configured in your AI agent (e.g., "atlassian", "jira-mcp-server")
3. Valid Jira account with project access

### Install Extension

```bash
# From within a spec-kit project (once published)
specify extension add psingley/concierge-jira

# Or install from local development directory
specify extension add --dev /path/to/concierge-jira
```

## Configuration

### 1. Set MCP Server and Jira Project Key

After installing the extension, create your project config from the template:

```bash
cp .specify/extensions/jira/jira-config.template.yml \
  .specify/extensions/jira/jira-config.yml
```

Then edit `.specify/extensions/jira/jira-config.yml`:

```yaml
# MCP server providing Jira tools (default: "atlassian")
mcp_server: "atlassian"

project:
  key: "MYPROJECT"  # Replace with your Jira project key
```

### 2. Discover Custom Fields (Optional)

```bash
claude
> /speckit.concierge-jira.discover-fields
```

This will show all available custom fields in your Jira instance and generate configuration snippets.

### 3. Customize Configuration

```yaml
# .specify/extensions/jira/jira-config.yml

project:
  key: "PROJ"

mapping:
  spec_artifact: "Epic"       # Issue type for SPEC.md
  phase_artifact: "Story"     # Issue type for Phase headers
  task_artifact: "Task"       # Issue type for tasks (set to "" for 2-level mode)

  relationships:
    spec_phase: "Epic Link"   # How Phase links to Spec
    phase_task: "Relates"     # How Task links to Phase
    spec_task: "Epic Link"    # Direct Task-Spec link

defaults:
  spec:
    labels: ["spec-driven", "automated"]
    custom_fields: {}

  phase:
    labels: []
    custom_fields: {}

  task:
    labels: ["implementation"]
    custom_fields:
      customfield_10002: 2  # Story points
```

## Usage

### Create Jira Issues from Spec and Tasks

After creating SPEC.md and TASKS.md with spec-kit:

```bash
claude
> /speckit.concierge-jira.specstoissues
```

Use the fully namespaced command surface. The legacy short alias
`/speckit.specstoissues` is intentionally not declared so the manifest stays
compatible with newer Spec Kit extension validation.

This will:

1. Auto-detect spec from git branch name, current directory, or prompt if multiple exist
2. Render a read-only dry-run preview of the proposed hierarchy and descriptions
3. Create a Jira spec issue from `specs/<spec-name>/spec.md` (default issue type: `Epic`)
4. Create phase issues from Phase headers in `specs/<spec-name>/tasks.md` (default issue type: `Story`)
5. In 3-level mode, create one task issue per task and verify the live result before continuing
6. Save mapping to `specs/<spec-name>/jira-mapping.json` only after a final verification pass

**Hierarchy Modes:**

- **3-level mode** (default): spec issue → phase issues → task issues
- **2-level mode** (set `task_artifact: ""`): spec issue → phase issues with task checklists embedded in descriptions

To specify a particular spec:

```bash
> /speckit.concierge-jira.specstoissues --spec 005-python-endpoint-alignment
```

### Discover Custom Fields

```bash
claude
> /speckit.concierge-jira.discover-fields
```

Outputs:

- All available custom fields in your Jira instance
- Configuration snippets for common mappings
- Examples of how to use custom fields

### Sync Task Completion Status

After completing tasks locally, sync status to Jira:

```bash
claude
> /speckit.concierge-jira.sync-status
```

This will:

1. Read checkbox-based task completion from TASKS.md using stable IDs such as `T001`
2. Match task IDs against `jira-mapping.json`
3. Apply one or more Jira transitions until each issue reaches the configured completed status
4. Add completion comments and update progress reporting

## Commands

### `/speckit.concierge-jira.specstoissues`

Create complete Jira issue hierarchy from spec and tasks.

**Arguments:**

- `--spec <name>` (optional): Specification name to use. Auto-detects if not provided.

**Prerequisites:**

- Specification directory exists: `specs/<spec-name>/`
- `spec.md` file exists in the specification directory
- `tasks.md` file exists in the specification directory
- Jira project key configured

**Output:**

- Dry-run preview before any Jira writes
- Spec issue plus phase issues, and task issues in 3-level mode
- Mapping file written from verified live Jira state
- Mapping file: `specs/<spec-name>/jira-mapping.json`

### `/speckit.concierge-jira.discover-fields`

Discover available custom fields in Jira instance.

**Prerequisites:**

- Jira project key configured
- MCP server providing Jira tools configured

**Output:**

- List of custom fields
- Configuration snippets
- Usage examples
- Reference file: `.specify/extensions/jira/discovered-fields.json`

### `/speckit.concierge-jira.sync-status`

Sync local task completion to Jira.

**Arguments:**

- `--spec <name>` (optional): Specification name to sync. Auto-detects if not provided.

**Prerequisites:**

- Issues created via `/speckit.concierge-jira.specstoissues`
- Mapping file exists: `specs/<spec-name>/jira-mapping.json`
- `tasks.md` has completion markers

**Output:**

- Updated Jira issue statuses matched by stable task IDs
- Multi-step workflow transitions where required
- Progress calculation
- Sync log: `specs/<spec-name>/jira-sync-log.json`

## Configuration Reference

### Full Configuration Example

```yaml
# .specify/extensions/jira/jira-config.yml

# MCP Server Configuration
mcp_server: "atlassian"  # or "jira-mcp-server", "jira", etc.

# Jira Project Configuration
project:
  key: "PROJ"

# Artifact Mapping
mapping:
  # Issue types to create
  spec_artifact: "Epic"       # Issue type for SPEC.md
  phase_artifact: "Story"     # Issue type for Phase headers in TASKS.md
  task_artifact: "Task"       # Issue type for task items
                              # Set to "" or "none" for 2-level mode (Spec → Phases only)

  # Relationships between issues
  # Options: "Parent", "Epic Link", "Relates", "Blocks", "Implements", "is child of", "none"
  relationships:
    spec_phase: "Epic Link"   # How Phase connects to Spec
    phase_task: "Relates"     # How Task connects to Phase
    spec_task: "Epic Link"    # Direct Task-to-Spec link

# Default Values
defaults:
  spec:
    labels: ["spec-driven", "microservice"]
    custom_fields:
      customfield_10001: "Sprint 1"

  phase:
    labels: []
    custom_fields: {}

  task:
    labels: ["implementation"]
    custom_fields:
      customfield_10002: 2  # Story points

# Field Mappings (discovered via /speckit.concierge-jira.discover-fields)
field_mappings:
  spec_version: "customfield_10005"
  team: "customfield_10006"

# Status Mapping for sync-status command
status_mapping:
  completed: "Done"           # [x] in TASKS.md
  pending: "To Do"            # [ ] in TASKS.md
  in_progress: "In Progress"  # [~] in TASKS.md (optional)
```

### Environment Variable Overrides

```bash
# Override MCP server name
export SPECKIT_JIRA_MCP_SERVER="atlassian"

# Override project key
export SPECKIT_JIRA_PROJECT_KEY="DEVTEST"

# Override artifact types
export SPECKIT_JIRA_SPEC_ARTIFACT="Epic"
export SPECKIT_JIRA_PHASE_ARTIFACT="Story"
export SPECKIT_JIRA_TASK_ARTIFACT="Task"

# Override relationships
export SPECKIT_JIRA_SPEC_PHASE_RELATIONSHIP="Epic Link"
export SPECKIT_JIRA_PHASE_TASK_RELATIONSHIP="Relates"
export SPECKIT_JIRA_SPEC_TASK_RELATIONSHIP="Epic Link"
```

### Local Overrides (Gitignored)

Create `.specify/extensions/jira/jira-config.local.yml` for local testing:

```yaml
project:
  key: "MYTEST"  # Override for local development
```

## Task Completion Markers

Mark tasks in TASKS.md using checkbox syntax:

| Marker  | Status      | Jira Status (default) |
| ------- | ----------- | --------------------- |
| `- [x]` | Completed   | Done                  |
| `- [ ]` | Pending     | To Do                 |
| `- [~]` | In Progress | In Progress           |

Example:

```markdown
# Tasks

## Phase 1: Authentication

- [x] T001: Implement login endpoint
- [~] T002: Add session management
- [ ] T003: Write authentication tests

## Phase 2: Error Handling

- [ ] T004: Add global error handler
- [ ] T005: Implement retry logic
```

Configure status mappings in `jira-config.yml`:

```yaml
status_mapping:
  completed: "Done"
  pending: "To Do"
  in_progress: "In Progress"
```

## Troubleshooting

### "Jira configuration not found"

**Solution**: Run `specify extension add jira` to install the extension, then copy `.specify/extensions/jira/jira-config.template.yml` to `.specify/extensions/jira/jira-config.yml`.

### "Jira project key not configured"

**Solution**: Edit `.specify/extensions/jira/jira-config.yml` and set `project.key`.

### "MCP tool not available"

**Solution**: Ensure your MCP server providing Jira tools is configured in your AI agent's MCP settings, and verify the `mcp_server` name in jira-config.yml matches.

### "Issue not found" or "Permission denied"

**Solution**: Verify your Jira credentials and project permissions in your MCP server configuration.

### Custom fields not working

**Solution**:

1. Run `/speckit.concierge-jira.discover-fields` to find correct field IDs
2. Verify field IDs in configuration
3. Check field is available for your issue type

## Examples

### Example 1: Simple Project

```yaml
# Minimal configuration
project:
  key: "DEMO"
```

Then:

```bash
> /speckit.concierge-jira.specstoissues
```

### Example 2: With Custom Fields and 3-Level Hierarchy

```yaml
project:
  key: "PROJ"

mapping:
  spec_artifact: "Epic"
  phase_artifact: "Story"
  task_artifact: "Task"
  relationships:
    spec_phase: "Epic Link"
    phase_task: "Relates"
    spec_task: "Epic Link"

defaults:
  task:
    custom_fields:
      customfield_10002: 3  # Story points
      customfield_10004: "Backend Team"
```

### Example 3: 2-Level Mode (Spec → Phases Only)

```yaml
project:
  key: "SIMPLE"

mapping:
  spec_artifact: "Epic"
  phase_artifact: "Story"
  task_artifact: ""  # Empty = 2-level mode, tasks embedded as checklists

defaults:
  phase:
    labels: ["auto-generated"]
```

### Example 4: Complete Workflow

```bash
# 1. Create spec and tasks
> /speckit.spec
> /speckit.tasks

# 2. Discover Jira fields
> /speckit.concierge-jira.discover-fields

# 3. Configure jira-config.yml
# (edit file)

# 4. Create Jira issues
> /speckit.concierge-jira.specstoissues

# 5. Implement tasks locally
# (mark tasks complete in TASKS.md)

# 6. Sync status to Jira
> /speckit.concierge-jira.sync-status
```

## Development

### Repository Structure

```text
concierge-jira/
├── README.md
├── LICENSE
├── CHANGELOG.md
├── extension.yml              # Extension manifest
├── jira-config.template.yml   # Config template
├── commands/
│   ├── specstoissues.md
│   ├── discover-fields.md
│   └── sync-status.md
└── docs/
    └── examples/
```

### Testing Locally

```bash
# Install in development mode
cd /path/to/your/project
specify extension add --dev /path/to/concierge-jira

# Make changes to extension
# Commands automatically reload

# Remove and reinstall to test install flow
specify extension remove concierge-jira
specify extension add --dev /path/to/concierge-jira
```

## License

MIT License - see LICENSE file

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

- **Issues**: <https://github.com/psingley/concierge-jira/issues>
- **Upstream**: <https://github.com/mbachorik/spec-kit-jira>
- **Spec Kit Docs**: <https://github.com/github/spec-kit>

## Related Extensions

- **spec-kit-linear**: Linear integration
- **spec-kit-azure-devops**: Azure DevOps integration
- **spec-kit-github**: GitHub Issues integration
