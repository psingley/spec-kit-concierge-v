import { describe, expect, it } from 'vitest';
import { parseRendererMcpConfigStatus } from './mcpConfig.factory';

export const rendererMcpConfigNeedsAuth = {
  state: 'configured_needs_auth',
  configPath: '/tmp/mcp-config.json',
  serverName: 'atlassian',
  serverUrl: 'https://mcp.atlassian.com/v1/mcp/authv2',
  isLegacyEndpoint: false,
  tokenFilePresent: false,
  message: 'Authorize in Copilot'
};

describe('renderer mcp config factory', () => {
  it('accepts valid mcp config status', () => {
    expect(parseRendererMcpConfigStatus(rendererMcpConfigNeedsAuth)).toEqual({
      ok: true,
      value: rendererMcpConfigNeedsAuth
    });
  });
});
