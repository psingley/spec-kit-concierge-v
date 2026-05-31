# Contract: MCP Config IPC

## `mcp:config:check`

Request: no payload.

Response:

```ts
type McpConfigCheckResponse = {
  state: 'not_configured' | 'configured_needs_auth' | 'authenticated' | 'malformed_config' | 'write_failed_warning';
  configPath: string;
  serverName?: string;
  serverUrl?: string;
  isLegacyEndpoint: boolean;
  tokenFilePresent: boolean;
  message: string;
};
```

## `mcp:config:fix`

Request:

```ts
type McpConfigFixRequest = {
  reason: 'startup' | 'workspace_repo_changed' | 'user_action';
};
```

Response:

```ts
type McpConfigFixResponse = {
  status: McpConfigCheckResponse;
  writeAttempted: boolean;
  writeKind: 'configured' | 'upgraded' | 'none';
  activityNotice?: string;
  error?: { code: string; message: string };
};
```

## Invariants

- `mcp:config:*` owns MCP truth.
- `auth:*` may map MCP state for UI but must not duplicate detection.
- Fix delegates writes to Copilot CLI.
- Token-file contents are never read.
