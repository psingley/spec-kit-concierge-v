# Quickstart: MCP Config Detection & Atlassian Auth

## Local Fixture Verification

1. Run focused mcp-config tests:

   ```bash
   npm test -- mcp-config
   ```

2. Confirm the resolver behavior with a temporary Copilot home:

   ```bash
   COPILOT_HOME=$(mktemp -d) copilot mcp add --transport http atlassian https://mcp.atlassian.com/v1/mcp/authv2
   ```

3. Confirm `copilot mcp list --json` exposes config presence only, not OAuth status.

## Manual OAuth Smoke

1. Ensure the `atlassian` MCP config entry points at `https://mcp.atlassian.com/v1/mcp/authv2`.
2. Open Copilot CLI interactively.
3. Let Copilot trigger browser OAuth.
4. Verify `~/.copilot/mcp-oauth-config/` gains a non-token metadata file whose `serverUrl` exactly equals the authv2 URL and a companion `.tokens.json` file.
5. Do not inspect token-file contents.

## Run 13 Windows Smoke Flag

On a real Windows host, write the entry, run `copilot mcp list --json`, and confirm the entry appears from the `$HOME\\.copilot\\mcp-config.json` config directory. Do not use `%APPDATA%` or `%LOCALAPPDATA%`.
