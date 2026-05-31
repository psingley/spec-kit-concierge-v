import { describe, expect, it } from 'vitest';
import { ATLASSIAN_AUTHV2_URL, detectAtlassianServer, parseMcpConfig } from './parse';

describe('copilot mcp config parse', () => {
  it('detects atlassian by URL instead of server key', () => {
    const parsed = parseMcpConfig(
      JSON.stringify({ mcpServers: { renamed: { type: 'http', url: ATLASSIAN_AUTHV2_URL } } })
    );
    expect(parsed.ok).toBe(true);
    expect(parsed.ok ? detectAtlassianServer(parsed.value) : undefined).toMatchObject({
      serverName: 'renamed',
      serverUrl: ATLASSIAN_AUTHV2_URL,
      isLegacyEndpoint: false
    });
  });

  it('marks legacy mcp and sse endpoints for upgrade', () => {
    const parsed = parseMcpConfig(
      JSON.stringify({ mcpServers: { atlassian: { type: 'http', url: 'https://mcp.atlassian.com/v1/mcp' } } })
    );
    expect(parsed.ok ? detectAtlassianServer(parsed.value)?.isLegacyEndpoint : false).toBe(true);
  });

  it('refuses malformed json without creating a replacement config', () => {
    expect(parseMcpConfig('{ nope')).toEqual({
      ok: false,
      error: { code: 'malformed_config', message: 'Copilot MCP config is not valid JSON.' }
    });
  });
});
