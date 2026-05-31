import { describe, expect, it, vi } from 'vitest';
import { fixCopilotMcpConfig } from './copilotMcp';
import { ATLASSIAN_AUTHV2_URL } from './parse';

describe('copilot mcp config fix', () => {
  it('delegates missing config writes to copilot mcp add with --transport http', async () => {
    const execFile = vi.fn(async () => ({ stdout: '', stderr: '' }));
    const result = await fixCopilotMcpConfig({
      status: { state: 'not_configured', configPath: '/tmp/mcp-config.json', isLegacyEndpoint: false, tokenFilePresent: false, message: 'Missing' },
      execFile
    });
    expect(execFile).toHaveBeenCalledWith('copilot', ['mcp', 'add', '--transport', 'http', 'atlassian', ATLASSIAN_AUTHV2_URL], { shell: false });
    expect(result).toMatchObject({
      writeAttempted: true,
      writeKind: 'configured',
      activityNotice: 'Configured Atlassian MCP for GitHub Copilot CLI.'
    });
  });

  it('refuses malformed config without shelling out', async () => {
    const execFile = vi.fn(async () => ({ stdout: '', stderr: '' }));
    const result = await fixCopilotMcpConfig({
      status: { state: 'malformed_config', configPath: '/tmp/mcp-config.json', isLegacyEndpoint: false, tokenFilePresent: false, message: 'Malformed' },
      execFile
    });
    expect(execFile).not.toHaveBeenCalled();
    expect(result.writeAttempted).toBe(false);
    expect(result.status.state).toBe('malformed_config');
  });
});
