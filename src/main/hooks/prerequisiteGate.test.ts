import { describe, expect, it, vi } from 'vitest';
import { checkStepPrerequisites } from './prerequisiteGate';
import type { StepHookContext } from './types';

const baseContext = (): StepHookContext => ({
  repositoryPath: '/repo',
  featureDir: '/repo/specs/0001',
  sessionId: 's1',
  userDataPath: '/tmp/user'
});

describe('checkStepPrerequisites', () => {
  it('opens gate for first step without trailer reader', async () => {
    const result = await checkStepPrerequisites('specify', baseContext());

    expect(result.ok).toBe(true);
    expect('escapeHatchReason' in result).toBe(false);
    expect('missingStep' in result).toBe(false);
  });

  it('closes gate when auth is unavailable', async () => {
    const result = await checkStepPrerequisites('plan', {
      ...baseContext(),
      authStatus: { copilotLoggedIn: true, githubLoggedIn: false }
    });

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ escapeHatchReason: 'auth-unavailable' });
    expect('missingStep' in result).toBe(false);
  });

  it('closes gate when MCP has no configured servers', async () => {
    const result = await checkStepPrerequisites('plan', {
      ...baseContext(),
      mcpConfig: { configReadAt: 'now', mcpServers: {} }
    });

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ escapeHatchReason: 'mcp-unavailable' });
    expect('missingStep' in result).toBe(false);
  });

  it('reports the first missing prerequisite trailer', async () => {
    const readTrailers = vi.fn().mockResolvedValue([{ step: 'specify', status: 'pass' }]);

    const result = await checkStepPrerequisites('tasks', { ...baseContext(), readTrailers });

    expect(readTrailers).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ escapeHatchReason: 'prerequisite-missing', missingStep: 'clarify' });
  });

  it('opens gate when all prerequisite trailers pass', async () => {
    const readTrailers = vi.fn().mockResolvedValue([
      { step: 'specify', status: 'pass' },
      { step: 'clarify', status: 'pass' },
      { step: 'plan', status: 'pass' }
    ]);

    const result = await checkStepPrerequisites('tasks', { ...baseContext(), readTrailers });

    expect(readTrailers).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
    expect('missingStep' in result).toBe(false);
  });
});
