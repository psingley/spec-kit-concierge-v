import { describe, expect, it, vi } from 'vitest';
import { executeReadOnlyDoctorTool } from './readOnlyTools';

const deps = () => ({
  readFeatureJson: vi.fn(async () => ({ feature_directory: 'specs/0013-hybrid-manifest-architecture' })),
  readManifest: vi.fn(async () => ({ sessionId: 'session-001', secret: 'token=abc123' })),
  gitStatusDiff: vi.fn(async () => ({ branch: 'build/manifest-architecture-dogfood', rawContent: 'token=secret' })),
  readTrailers: vi.fn(async () => [{ step: 'tasks', status: 'pass', commitSha: 'abc123' }]),
  readArtifacts: vi.fn(async () => [{
    path: 'specs/0013-hybrid-manifest-architecture/tasks.md',
    content: `${'x'.repeat(1200)} token=secret`
  }]),
  readTranscript: vi.fn(async () => ({ excerpt: 'authorization=secret\nok' }))
});

describe('read-only doctor tools', () => {
  it('executes exactly the six read-only tools through bounded adapters', async () => {
    for (const tool of ['readFeatureJson', 'readManifest', 'gitStatusDiff', 'readTrailers', 'readArtifacts', 'readTranscript'] as const) {
      const currentDeps = deps();
      const result = await executeReadOnlyDoctorTool({
        tool,
        repositoryPath: '/repo',
        step: 'tasks',
        arguments: {},
        maxStringLength: 80,
        ...currentDeps
      });

      expect(result.tool).toBe(tool);
      expect(result.bounded).toBe(true);
      expect(currentDeps[tool]).toHaveBeenCalledTimes(1);
    }
  });

  it('redacts secrets and bounds artifact/transcript-sized strings', async () => {
    const result = await executeReadOnlyDoctorTool({
      tool: 'readArtifacts',
      repositoryPath: '/repo',
      step: 'tasks',
      arguments: {},
      maxStringLength: 80,
      ...deps()
    });

    expect(JSON.stringify(result.payload)).not.toContain('token=secret');
    expect(JSON.stringify(result.payload)).toContain('[TRUNCATED');
  });

  it('does not expose raw unrelated diff contents', async () => {
    const result = await executeReadOnlyDoctorTool({
      tool: 'gitStatusDiff',
      repositoryPath: '/repo',
      step: 'tasks',
      arguments: {},
      maxStringLength: 80,
      ...deps()
    });

    expect(JSON.stringify(result.payload)).not.toContain('rawContent');
    expect(JSON.stringify(result.payload)).not.toContain('token=secret');
  });
});
