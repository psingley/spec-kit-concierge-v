import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';
import { parseAgentOutputs, verifyAgentManifestDrift } from './driftVerifier';

const fsMocks = vi.hoisted(() => ({
  readdir: vi.fn(),
  readFile: vi.fn()
}));

vi.mock('node:fs/promises', () => ({
  default: {
    readdir: fsMocks.readdir,
    readFile: fsMocks.readFile
  },
  readdir: fsMocks.readdir,
  readFile: fsMocks.readFile
}));

const mockedReaddir = vi.mocked(readdir);
const mockedReadFile = vi.mocked(readFile);

describe('driftVerifier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses output declarations from frontmatter and sections', () => {
    const result = parseAgentOutputs('speckit.specify.agent.md', '---\noutputs: spec.md\n---\n## Outputs\n- `checklists/requirements.md`');

    expect(result?.step).toBe('specify');
    expect(result?.outputs).toEqual(['spec.md', 'checklists/requirements.md']);
    expect(result?.ambiguous).toBe(true);
  });

  it('ignores non-step agent files', () => {
    const result = parseAgentOutputs('speckit.deploy.agent.md', '## Outputs\n- deploy.md');

    expect(result).toBeUndefined();
    expect(parseAgentOutputs('README.md', '')).toBeUndefined();
    expect(parseAgentOutputs('speckit.plan.agent.md', '')!.outputs).toEqual([]);
  });

  it('emits drift events for mismatched agent outputs', async () => {
    mockedReaddir.mockResolvedValue(['speckit.specify.agent.md'] as never);
    mockedReadFile.mockResolvedValue('---\noutputs: wrong.md\n---' as never);
    const logger = { warn: vi.fn() };
    const activitySink = vi.fn();

    await verifyAgentManifestDrift({ agentsDirectory: '/agents', logger, activitySink });

    expect(mockedReadFile).toHaveBeenCalledWith(expect.stringContaining('speckit.specify.agent.md'), 'utf8');
    expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({ event: 'agent-manifest-drift', declaredOutputs: ['wrong.md'] }), 'agent manifest drift');
    expect(activitySink).toHaveBeenCalledWith(expect.objectContaining({ event: 'agent-manifest-drift', expectedOutputs: expect.arrayContaining(['spec.md']) }));
  });

  it('does not emit when directory cannot be read or outputs match', async () => {
    const logger = { warn: vi.fn() };
    const activitySink = vi.fn();
    mockedReaddir.mockRejectedValueOnce(new Error('missing'));

    await verifyAgentManifestDrift({ agentsDirectory: '/missing', logger, activitySink });

    expect(logger.warn).not.toHaveBeenCalled();
    expect(activitySink).not.toHaveBeenCalled();
    expect(mockedReadFile).not.toHaveBeenCalled();
  });
});
