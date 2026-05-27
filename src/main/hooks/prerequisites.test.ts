import { describe, expect, it } from 'vitest';
import type { AuthStatusSlot, McpConfigSlot, McpServerSummary } from './prerequisites';

describe('prerequisite slots', () => {
  it('supports auth status values used by the gate', () => {
    const auth: AuthStatusSlot = { copilotLoggedIn: true, githubLoggedIn: null };

    expect(auth.copilotLoggedIn).toBe(true);
    expect(auth.githubLoggedIn).toBeNull();
    expect(Object.keys(auth)).toEqual(['copilotLoggedIn', 'githubLoggedIn']);
  });

  it('supports MCP server summaries used by the gate', () => {
    const server: McpServerSummary = { name: 'github', configured: true };

    expect(server.name).toBe('github');
    expect(server.configured).toBe(true);
    expect(Object.keys(server)).toEqual(['name', 'configured']);
  });

  it('supports MCP config maps used by the gate', () => {
    const config: McpConfigSlot = {
      configReadAt: '2026-05-27T00:00:00.000Z',
      mcpServers: { github: { name: 'github', configured: true } }
    };

    expect(config.configReadAt).toContain('2026');
    expect(config.mcpServers.github?.configured).toBe(true);
    expect(Object.keys(config.mcpServers)).toEqual(['github']);
  });
});
