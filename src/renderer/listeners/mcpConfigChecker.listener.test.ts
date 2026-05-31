import { describe, expect, it, vi } from 'vitest';
import { repositorySelected, type RepositorySummary } from '../slices/workspace';
import { mcpConfigCheckRequested, setupMcpConfigCheckerListener } from './mcpConfigChecker.listener';
import type { AppStartListening } from './types';

describe('mcp config checker listener', () => {
  it('registers startup and workspace repo triggers', () => {
    const startListening = vi.fn() as unknown as AppStartListening;
    setupMcpConfigCheckerListener(startListening);
    expect(startListening).toHaveBeenCalledTimes(2);
  });

  it('exports a startup check action', () => {
    expect(mcpConfigCheckRequested({ reason: 'startup' }).payload.reason).toBe('startup');
  });

  it('can identify workspace repository changes as trigger actions', () => {
    const repo: RepositorySummary = { id: '1', name: 'repo', owner: 'org', path: '/repo', defaultBranch: 'main' };
    expect(repositorySelected(repo).payload.path).toBe('/repo');
  });
});
