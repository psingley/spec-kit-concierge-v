import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { resolveCopilotMcpConfigPath, resolveCopilotOAuthConfigDir } from './paths';

describe('copilot mcp config paths', () => {
  it('uses COPILOT_HOME as the whole copilot directory', () => {
    expect(resolveCopilotMcpConfigPath({ COPILOT_HOME: '/tmp/copilot-home' })).toBe(
      path.join('/tmp/copilot-home', 'mcp-config.json')
    );
    expect(resolveCopilotOAuthConfigDir({ COPILOT_HOME: '/tmp/copilot-home' })).toBe(
      path.join('/tmp/copilot-home', 'mcp-oauth-config')
    );
  });

  it('uses os.homedir .copilot without appdata special casing', () => {
    vi.spyOn(os, 'homedir').mockReturnValue('/Users/example');
    expect(resolveCopilotMcpConfigPath({})).toBe(path.join('/Users/example', '.copilot', 'mcp-config.json'));
    expect(resolveCopilotOAuthConfigDir({})).toBe(path.join('/Users/example', '.copilot', 'mcp-oauth-config'));
  });
});
