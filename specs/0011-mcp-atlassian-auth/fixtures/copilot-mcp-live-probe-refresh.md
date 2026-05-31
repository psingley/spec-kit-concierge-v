# Copilot MCP Live Probe Refresh

Captured: 2026-05-31T13:18:14-04:00

## Version

- GitHub Copilot CLI 1.0.56.
- Run 'copilot update' to check for updates.

## CLI Help Evidence

```text
Usage: copilot mcp [options] [command]

Manage MCP server configuration.

MCP (Model Context Protocol) servers extend Copilot with additional tools
and capabilities. Servers can be local (stdio) processes or remote (HTTP/SSE)
endpoints.

Configuration is loaded from multiple sources:
  User       ~/.copilot/mcp-config.json
  Workspace  .mcp.json
  Plugin     Installed plugins with MCP servers

Use `copilot mcp list` to see all configured servers,
or `copilot mcp get <name>` for details about a specific server.

Options:
  -h, --help                                         display help for command

Commands:
  add [options] <name> [url-or-command-and-args...]  Add an MCP server
  get [options] <name>                               Show server details
  help [command]                                     display help for command
  list [options]                                     List configured MCP servers
  remove [options] <name>                            Remove an MCP server
```

## Temp COPILOT_HOME Add/List/Remove Probe

Temp COPILOT_HOME used: redacted temp dir

Initial temp config: figma only.

### add output
```text
Added server "atlassian"

atlassian
  Type: http
  URL: https://mcp.atlassian.com/v1/mcp/authv2
  Tools: * (all)
  Source: User
```

### list after add
```json
{
  "mcpServers": {
    "figma": {
      "tools": [
        "*"
      ],
      "type": "http",
      "url": "https://mcp.figma.com/mcp",
      "source": "user"
    },
    "atlassian": {
      "tools": [
        "*"
      ],
      "type": "http",
      "url": "https://mcp.atlassian.com/v1/mcp/authv2",
      "source": "user"
    }
  }
}
```

### get atlassian after add
```json
{
  "atlassian": {
    "tools": [
      "*"
    ],
    "type": "http",
    "url": "https://mcp.atlassian.com/v1/mcp/authv2",
    "source": "user"
  }
}
```

### list after remove
```json
{
  "mcpServers": {
    "figma": {
      "tools": [
        "*"
      ],
      "type": "http",
      "url": "https://mcp.figma.com/mcp",
      "source": "user"
    }
  }
}
```

## Resolver Conclusion

Resolver remains COPILOT_HOME/mcp-config.json when COPILOT_HOME is set, else os.homedir()/.copilot/mcp-config.json. The temp probe confirms add/remove preserve unrelated figma entry and --json exposes config shape only.
