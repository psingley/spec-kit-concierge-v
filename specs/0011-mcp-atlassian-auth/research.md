# Research: MCP Config Detection & Atlassian Auth

## Decision 1: Copilot Owns OAuth

**Decision**: Concierge never implements Atlassian OAuth, stores Atlassian credentials, reads token values, or calls Atlassian MCP tools. Copilot owns OAuth after Concierge writes the MCP config entry.

**Rationale**: Live probes show Copilot triggers browser OAuth and writes MCP OAuth state under `~/.copilot/mcp-oauth-config/`. This matches Principle X and avoids creating a second credential owner.

**Alternatives Rejected**:
- Concierge PKCE localhost OAuth: violates Observer-Only and duplicates Copilot behavior.
- Direct Atlassian MCP status calls: turns Concierge into an Atlassian MCP client before Run 12.

## Decision 2: Canonical Endpoint And Upgrade

**Decision**: New writes use `https://mcp.atlassian.com/v1/mcp/authv2`. Existing legacy `/v1/mcp` or `/v1/sse` Atlassian entries are upgraded via `copilot mcp add`.

**Rationale**: Atlassian docs identify authv2 as current. The upgrade notice tells users why Copilot may require reauthorization.

**Alternatives Rejected**:
- Leave legacy forever: hides a known endpoint drift before Run 12.
- Add a second server key: risks duplicate Atlassian servers and unclear auth state.

## Decision 3: Path Resolver

**Decision**: Resolve `COPILOT_HOME/mcp-config.json` when `COPILOT_HOME` exists, else `os.homedir()/.copilot/mcp-config.json`.

**Rationale**: GitHub docs and live CLI help point at a home-relative Copilot config directory. `COPILOT_HOME` replaces the entire config directory. Windows smoke is deferred to Run 13.

**Alternatives Rejected**:
- `%APPDATA%` or `%LOCALAPPDATA%` special casing: contradicted by docs-confirmed user direction.
- macOS Application Support: disproven by local probes.

## Decision 4: Write Boundary

**Decision**: Normal writes delegate to `copilot mcp add --transport http atlassian https://mcp.atlassian.com/v1/mcp/authv2`.

**Rationale**: Copilot owns config merge semantics and live probes show it preserves unrelated entries.

**Alternatives Rejected**:
- Hand-editing valid config: takes ownership of Copilot's file format.
- Replacing malformed config: risks destroying user-managed servers.

## Decision 5: Auth Detection

**Decision**: Authenticated means exact configured `serverUrl` metadata match plus same-basename `.tokens.json` file presence. Token-file contents are never read.

**Rationale**: JSON config listing does not expose OAuth state, and stale legacy metadata can coexist with authv2 metadata.

**Alternatives Rejected**:
- Loose "atlassian" metadata match: false-positives on stale endpoint state.
- Metadata-only auth: false-positive when no token companion exists.

## Decision 6: Workspace Gate

**Decision**: Define `workspaceGatePrerequisites = ['github','copilot']` in one product constant. Atlassian state is visible but non-gating in Run 11.

**Rationale**: Atlassian gates JIRA submission readiness in Run 12, not repository entry for Specify/Clarify/Plan/Tasks/Analyze.

**Alternatives Rejected**:
- Three-provider workspace gate: conflicts with locked Run 6/11 decisions.
- User setting: product-owner decision, not user preference.
