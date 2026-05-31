export const ATLASSIAN_AUTHV2_URL = 'https://mcp.atlassian.com/v1/mcp/authv2';

export type McpServerEntry = {
  type?: unknown;
  url?: unknown;
  tools?: unknown;
};

export type McpConfig = {
  mcpServers: Record<string, McpServerEntry>;
};

export type AtlassianServer = {
  serverName: string;
  serverUrl: string;
  isLegacyEndpoint: boolean;
};

type ParseResult =
  | { ok: true; value: McpConfig }
  | { ok: false; error: { code: 'malformed_config'; message: string } };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const parseMcpConfig = (contents: string): ParseResult => {
  try {
    const parsed = JSON.parse(contents) as unknown;
    if (!isRecord(parsed)) {
      return { ok: false, error: { code: 'malformed_config', message: 'Copilot MCP config root must be an object.' } };
    }
    if (parsed.mcpServers === undefined) {
      return { ok: true, value: { mcpServers: {} } };
    }
    if (!isRecord(parsed.mcpServers)) {
      return { ok: false, error: { code: 'malformed_config', message: 'Copilot MCP config mcpServers must be an object.' } };
    }
    return { ok: true, value: { mcpServers: parsed.mcpServers as Record<string, McpServerEntry> } };
  } catch {
    return { ok: false, error: { code: 'malformed_config', message: 'Copilot MCP config is not valid JSON.' } };
  }
};

const isAtlassianUrl = (url: string): boolean => {
  try {
    return new URL(url).hostname === 'mcp.atlassian.com';
  } catch {
    return false;
  }
};

export const isLegacyAtlassianEndpoint = (url: string): boolean =>
  url === 'https://mcp.atlassian.com/v1/mcp' || url === 'https://mcp.atlassian.com/v1/sse';

export const detectAtlassianServer = (config: McpConfig): AtlassianServer | undefined =>
  Object.entries(config.mcpServers).flatMap(([serverName, server]) => {
    const serverUrl = typeof server.url === 'string' ? server.url : undefined;
    return serverUrl !== undefined && isAtlassianUrl(serverUrl)
      ? [{ serverName, serverUrl, isLegacyEndpoint: isLegacyAtlassianEndpoint(serverUrl) }]
      : [];
  })[0];
