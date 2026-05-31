# Atlassian MCP Docs Probe

Captured: 2026-05-31

## Sources

- Atlassian Support: "Getting started with the Atlassian Rovo MCP Server"
  - https://support.atlassian.com/atlassian-rovo-mcp-server/docs/getting-started-with-the-atlassian-remote-mcp-server/
- Atlassian Support: "Configuring OAuth 2.1"
  - https://support.atlassian.com/atlassian-rovo-mcp-server/docs/configuring-oauth-2-1/
- GitHub Docs: "Adding MCP servers for GitHub Copilot CLI"
  - https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers

## Findings

- Atlassian's current docs identify the supported remote endpoint as `https://mcp.atlassian.com/v1/mcp/authv2` and say `https://mcp.atlassian.com/v1/sse` stops being supported after 2026-06-30.
- The same docs describe the Rovo MCP server as a cloud bridge for Jira, Compass, and Confluence, powered by OAuth 2.1.
- Atlassian says a supported client connects to `https://mcp.atlassian.com/v1/mcp/authv2`, then a browser-based OAuth 2.1 flow is triggered.
- Atlassian says if the MCP client supports OAuth dynamic client registration, no manual OAuth app is required; the server handles authorization.
- The OAuth page says the MCP client initiates OAuth, receives an access token, and sends `Authorization: Bearer <access_token>` to MCP.
- GitHub's Copilot CLI MCP docs support remote HTTP servers with entries under `mcpServers.<name>` containing `type: "http"`, `url`, optional `headers`, and optional `tools`.

## Canonical Entry For Run 11

Recommended canonical Copilot CLI user config entry:

```json
{
  "mcpServers": {
    "atlassian": {
      "type": "http",
      "url": "https://mcp.atlassian.com/v1/mcp/authv2",
      "tools": ["*"]
    }
  }
}
```

## Compatibility Note

The local machine currently has `https://mcp.atlassian.com/v1/mcp`, and Copilot logs show it has connected with OAuth. Atlassian's docs now recommend `https://mcp.atlassian.com/v1/mcp/authv2`; Run 11 should treat `/authv2` as the canonical value and treat `/v1/mcp` as a legacy-compatible existing entry only if the spec deliberately chooses not to rewrite existing working user config.

## Auth Model Conclusion

Concierge should not implement a first-party Atlassian OAuth token store. Under Observer-Only, Concierge should configure and inspect the Bound CLI's MCP config, then let Copilot CLI's remote MCP client initiate OAuth and own tokens in `~/.copilot/mcp-oauth-config/`.
