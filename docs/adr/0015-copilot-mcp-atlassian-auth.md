# ADR 0015: Copilot-Owned Atlassian MCP Auth

**Status**: Accepted

**Date**: 2026-05-31

## Context

Run 11 needs a real Atlassian readiness signal for the auth chip and for Run 12 JIRA submission. Live probes show GitHub Copilot CLI can own the Atlassian remote MCP OAuth flow after a user-level MCP server entry is configured.

## Decision

Concierge configures and observes Copilot MCP state only:

- write/upgrade the Atlassian MCP config entry by delegating to `copilot mcp add --transport http atlassian https://mcp.atlassian.com/v1/mcp/authv2`
- read Copilot MCP config and non-token OAuth metadata
- treat auth as present only when exact `serverUrl` metadata plus companion token-file presence exists
- never read token values, run Atlassian OAuth, store Atlassian credentials, or call Atlassian MCP tools

## Consequences

Run 11 remains compliant with Principle X Observer-Only. Copilot remains the only MCP OAuth credential owner. The app can show truthful readiness states without claiming that Concierge signed into Atlassian.
