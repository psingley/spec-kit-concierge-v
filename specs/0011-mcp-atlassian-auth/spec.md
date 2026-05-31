# Feature Specification: MCP Config Detection & Atlassian Auth

**Feature Branch**: `spec/0011-mcp-atlassian-auth`

**Created**: 2026-05-31

**Status**: Draft

**Input**: User description: "Run 11 (MCP Config Detection & Atlassian Auth) full pipeline"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Detect Atlassian MCP Readiness (Priority: P1)

The app detects whether GitHub Copilot CLI has an Atlassian MCP server configured and whether Copilot-owned OAuth state is present, then shows that state without doing Atlassian OAuth itself.

**Why this priority**: Run 12 JIRA submission needs a real prerequisite signal, and Principle X requires Concierge to observe Copilot-managed state rather than speak to Atlassian directly.

**Independent Test**: Can be tested with fixture Copilot homes containing missing, legacy, authv2, malformed, and OAuth metadata states.

**Acceptance Scenarios**:

1. **Given** no Atlassian MCP URL exists in Copilot MCP config, **When** the app checks MCP config, **Then** the state is "not configured".
2. **Given** an authv2 Atlassian MCP URL exists but no exact-serverUrl OAuth metadata plus token-file companion exists, **When** the app checks MCP config, **Then** the state is "configured needs auth".
3. **Given** an authv2 Atlassian MCP URL exists and matching OAuth metadata plus token-file companion exists, **When** the app checks MCP config, **Then** the state is "authenticated".
4. **Given** stale legacy OAuth metadata exists for `/v1/mcp`, **When** the configured URL is `/authv2`, **Then** the stale metadata does not authenticate the authv2 entry.

---

### User Story 2 - Configure Or Upgrade Atlassian MCP (Priority: P2)

The app can repair a missing or legacy Atlassian MCP config by delegating the write to GitHub Copilot CLI and preserving user-managed MCP entries.

**Why this priority**: Users should not manually edit MCP JSON before they can authorize Atlassian in Copilot, but Concierge must not own the file format or destroy existing servers.

**Independent Test**: Can be tested by adapter-mocking `copilot mcp add --transport http atlassian https://mcp.atlassian.com/v1/mcp/authv2` and asserting unchanged malformed files are refused.

**Acceptance Scenarios**:

1. **Given** the config is valid and missing Atlassian, **When** the fix action runs, **Then** Copilot CLI is invoked with `mcp add --transport http atlassian <authv2-url>` and unrelated servers are preserved by Copilot.
2. **Given** a legacy Atlassian `/v1/mcp` or `/v1/sse` URL exists, **When** the fix action runs, **Then** the entry is upgraded to authv2 and the activity notice says "Updated Atlassian MCP to the current endpoint — reauthorize in Copilot."
3. **Given** the config file is malformed, **When** the fix action runs, **Then** no write command runs, the original file remains untouched, and a passive warning is returned.
4. **Given** Copilot CLI write fails, **When** the fix action returns, **Then** the app shows a passive warning and logs an activity error without blocking the workspace.

---

### User Story 3 - Surface Real Auth Chip State (Priority: P3)

The existing Atlassian auth chip and sign-in UI display the real MCP-derived state and the connect action triggers MCP config repair rather than fake login success.

**Why this priority**: The current Atlassian stub misleads users and breaks the Run 12 prerequisite story.

**Independent Test**: Can be tested by rendering each MCP-derived state and asserting workspace gating still depends only on GitHub and Copilot.

**Acceptance Scenarios**:

1. **Given** Atlassian is not configured, **When** the auth chip renders, **Then** it presents a repairable configuration state without calling Atlassian optional.
2. **Given** Atlassian is configured but needs Copilot OAuth, **When** the auth chip renders, **Then** it instructs the user to reauthorize in Copilot without claiming Concierge signed in.
3. **Given** Atlassian is authenticated through Copilot disk state, **When** the auth chip renders, **Then** it shows connected.
4. **Given** Atlassian is not authenticated, **When** workspace entry gates are evaluated, **Then** GitHub and Copilot still gate entry and Atlassian does not block this run.

### Edge Cases

- `COPILOT_HOME` replaces the entire Copilot config directory and must resolve to `COPILOT_HOME/mcp-config.json`.
- Windows uses `os.homedir()/.copilot/mcp-config.json`; do not use `%APPDATA%` or `%LOCALAPPDATA%`.
- `copilot mcp list --json` and `get --json` expose config only, not OAuth auth status.
- OAuth metadata may exist without a token-file companion; that is not authenticated.
- Metadata for a legacy URL may coexist with metadata for authv2; only exact `serverUrl` matches count.
- Token files may exist; Concierge checks only presence and never reads contents.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST resolve Copilot MCP config path as `COPILOT_HOME/mcp-config.json` when `COPILOT_HOME` is set, otherwise `os.homedir()/.copilot/mcp-config.json`.
- **FR-002**: System MUST parse Copilot MCP config from `mcpServers` and detect any server whose URL is on `mcp.atlassian.com` as Atlassian configured.
- **FR-003**: System MUST classify Atlassian status as `not_configured`, `configured_needs_auth`, `authenticated`, or `write_failed_warning`.
- **FR-004**: System MUST classify authenticated only when the configured Atlassian URL exactly matches a non-token OAuth metadata file's `serverUrl` and a same-basename `.tokens.json` file exists.
- **FR-005**: System MUST never read token-file contents, never store Atlassian OAuth tokens, never run an Atlassian OAuth flow, and never call Atlassian MCP tools.
- **FR-006**: System MUST refuse to write when the existing MCP config is malformed and preserve the original file untouched.
- **FR-007**: System MUST fix missing or legacy Atlassian config by invoking `copilot mcp add --transport http atlassian https://mcp.atlassian.com/v1/mcp/authv2`.
- **FR-008**: System MUST auto-upgrade legacy Atlassian `/v1/mcp` and `/v1/sse` entries to authv2 and emit one activity notice per actual write.
- **FR-009**: System MUST expose `mcp:config:check` and `mcp:config:fix` IPC channels as the source of truth for MCP config status.
- **FR-010**: System MUST map MCP status into the existing auth UI and repurpose Atlassian connect/login to trigger MCP config fix, not fake auth success.
- **FR-011**: System MUST run the MCP checker on app launch and workspace repo changes with coalescing and idempotence to prevent repeated shell-outs during event bursts.
- **FR-012**: System MUST define `workspaceGatePrerequisites` in one named product constant defaulting to `['github','copilot']`.
- **FR-013**: System MUST keep Atlassian outside workspace gating in Run 11 while showing its real chip state.
- **FR-014**: System MUST add visual contracts for the real Atlassian states with honest thresholds.
- **FR-015**: System MUST include a manual smoke note for Copilot-owned OAuth and a Run 13 Windows smoke-test flag.

### Key Entities *(include if feature involves data)*

- **McpConfigStatus**: The detected Atlassian readiness state, configured server name, configured URL, legacy flag, auth evidence presence, and warning/error details.
- **McpConfigFixResult**: The result of a fix attempt, including whether a write happened, whether it was a fresh configure or legacy upgrade, the post-fix status, and user-visible activity copy.
- **OAuth Metadata Evidence**: Non-secret metadata file identity and `serverUrl` used for exact matching; token companion is represented as presence only.
- **Workspace Gate Prerequisite**: Product constant listing auth providers that block workspace entry.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Fixture tests cover missing, figma-only, legacy Atlassian, authv2 Atlassian, malformed config, matching auth metadata, stale legacy metadata, and token-companion absence.
- **SC-002**: IPC and listener tests prove app launch plus workspace repo bursts perform at most one write per missing or legacy state.
- **SC-003**: A code review can verify there is no Atlassian OAuth implementation, no token-value reads, and no Atlassian MCP tool invocation in Concierge.
- **SC-004**: Auth UI tests and visual contracts cover not configured, needs auth, authenticated, and write-failed states without labeling Atlassian optional.
- **SC-005**: Final verification passes typecheck, lint, unit tests, e2e tests, and visual-diff contracts without reducing existing coverage.

## Assumptions

- GitHub Copilot CLI remains the owner of remote MCP OAuth and stores MCP OAuth state under `~/.copilot/mcp-oauth-config/`.
- `copilot mcp add --transport http` preserves existing valid server entries, as verified in the Run 11 fixtures.
- Run 12 owns actual JIRA submission readiness and direct Atlassian MCP usage; Run 11 only prepares and observes the prerequisite.
- Run 13 will perform the real Windows smoke test because this run executes on macOS.
