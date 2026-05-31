import { describe, expect, it } from 'vitest';
import { createMcpConfigCheckResponse, createMcpConfigFixRequest, createMcpConfigFixResponse } from './mcpConfig.factory';

describe('mcp config ipc factories', () => {
  it('accepts a valid check response', () => {
    expect(
      createMcpConfigCheckResponse({
        state: 'configured_needs_auth',
        configPath: '/tmp/mcp-config.json',
        serverName: 'atlassian',
        serverUrl: 'https://mcp.atlassian.com/v1/mcp/authv2',
        isLegacyEndpoint: false,
        tokenFilePresent: false,
        message: 'Authorize in Copilot'
      })
    ).toMatchObject({ ok: true });
  });

  it('requires exact fix request reason values', () => {
    expect(createMcpConfigFixRequest({ reason: 'workspace_repo_changed' })).toMatchObject({ ok: true });
    expect(createMcpConfigFixRequest({ reason: 'bad' })).toMatchObject({ ok: false });
  });

  it('accepts fix responses with activity notices and structured errors', () => {
    expect(
      createMcpConfigFixResponse({
        status: {
          state: 'write_failed_warning',
          configPath: '/tmp/mcp-config.json',
          isLegacyEndpoint: false,
          tokenFilePresent: false,
          message: 'failed'
        },
        writeAttempted: true,
        writeKind: 'configured',
        error: { code: 'copilot_mcp_add_failed', message: 'failed' }
      })
    ).toMatchObject({ ok: true });
  });
});
