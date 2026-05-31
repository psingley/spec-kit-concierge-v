# Data Model: MCP Config Detection & Atlassian Auth

## McpConfigStatus

- `state`: `not_configured | configured_needs_auth | authenticated | write_failed_warning | malformed_config`
- `serverName`: configured MCP server key when present
- `serverUrl`: configured Atlassian MCP URL when present
- `isLegacyEndpoint`: true for `/v1/mcp` or `/v1/sse`
- `configPath`: resolved Copilot MCP config path
- `oauthMetadataPath`: non-token metadata path when exact match exists
- `tokenFilePresent`: boolean presence only
- `message`: passive UI message

## McpConfigFixResult

- `status`: post-fix `McpConfigStatus`
- `writeAttempted`: boolean
- `writeKind`: `configured | upgraded | none`
- `activityNotice`: user-visible copy for successful writes
- `error`: structured error when the write fails or config is malformed

## OAuth Metadata Evidence

- `metadataPath`: file path of non-token JSON metadata
- `serverUrl`: parsed `serverUrl` value
- `tokenCompanionPath`: derived same-basename `.tokens.json` path
- `tokenFilePresent`: boolean

Token companion contents are outside the model and must never be read.

## Workspace Gate Prerequisite

- `provider`: `github | copilot | atlassian`
- `blocksWorkspaceEntry`: derived by membership in `workspaceGatePrerequisites`
