# Copilot MCP Config Probe

Captured: 2026-05-31

## Commands

- `copilot --version`
- `copilot --help`
- `copilot mcp --help`
- `copilot mcp list --json`
- `copilot mcp get atlassian --json`
- `find ~/.copilot -maxdepth 3 -type f -print`
- `find "$HOME/Library/Application Support" -maxdepth 3 \( -iname '*copilot*' -o -iname 'mcp*.json' \) -print`

## Findings

- Installed CLI: `GitHub Copilot CLI 1.0.56`.
- `copilot mcp --help` says MCP configuration is loaded from:
  - user: `~/.copilot/mcp-config.json`
  - workspace: `.mcp.json`
  - plugin: installed plugins with MCP servers
- `copilot --help` says `--additional-mcp-config <json>` augments config from `~/.copilot/mcp-config.json` for the current session.
- GitHub's Copilot CLI docs confirm `~/.copilot/mcp-config.json` is the user-level MCP server definition file and project-level `.mcp.json` or `.github/mcp.json` can take precedence on name conflicts.
- The roadmap guess `~/Library/Application Support/github-copilot/mcp.json` was not found on this Mac. `~/Library/Application Support` had VS Code Copilot extension caches and `cc.getmcp.app/mcp.json`, but no `github-copilot/mcp.json`.

## Local User Config Shape

Redacted local `~/.copilot/mcp-config.json` shape:

```json
{
  "mcpServers": {
    "figma": {
      "type": "http",
      "url": "https://mcp.figma.com/mcp"
    },
    "atlassian": {
      "type": "http",
      "url": "https://mcp.atlassian.com/v1/mcp"
    }
  }
}
```

`copilot mcp list --json` normalizes entries by adding `tools: ["*"]` and `source: "user"`:

```json
{
  "mcpServers": {
    "atlassian": {
      "tools": ["*"],
      "type": "http",
      "url": "https://mcp.atlassian.com/v1/mcp",
      "source": "user"
    }
  }
}
```

## OAuth Storage Evidence

`~/.copilot/mcp-oauth-config/` contains per-server OAuth metadata files with keys such as:

- `authorizationServerUrl`
- `clientId`
- `clientSecret` in some files
- `isStatic`
- `issuedAt`
- `redirectUri`
- `resourceUrl`
- `serverUrl`

One `.tokens.json` file exists with keys:

- `accessToken`
- `expiresAt`
- `refreshToken`

Token values were not read into this fixture.

## Log Evidence

Recent Copilot logs include:

- `Starting remote MCP client for atlassian with url: https://mcp.atlassian.com/v1/mcp`
- `Server atlassian requires authentication, initiating OAuth flow`
- `OAuth authentication required for atlassian`
- `Started MCP client for remote server atlassian with OAuth`

This proves Copilot CLI is capable of initiating and storing the Atlassian remote MCP OAuth flow itself once the remote MCP server is configured.
