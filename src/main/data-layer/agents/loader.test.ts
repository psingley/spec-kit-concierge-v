import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { withTempDir } from '../../../test/tempDir';
import agentsJson from './agents.json';
import { loadAgentManifest } from './loader';

describe('loadAgentManifest', () => {
  it('loads the seeded manifest successfully', async () => {
    const logger = { info: vi.fn(), warn: vi.fn() };

    await expect(loadAgentManifest(logger)).resolves.toEqual(agentsJson);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('warns and continues for unverified future entries', async () => {
    await withTempDir(async (directory) => {
      const manifestPath = path.join(directory, 'agents.json');
      const unverifiedCopilot = Object.fromEntries(
        Object.entries(agentsJson.agents.copilot).filter(([key]) => key !== 'verifiedAgainst')
      );
      await writeFile(
        manifestPath,
        JSON.stringify({
          version: 1,
          agents: {
            future: unverifiedCopilot
          }
        })
      );
      const logger = { info: vi.fn(), warn: vi.fn() };

      await expect(loadAgentManifest(logger, { manifestPath })).resolves.toMatchObject({
        agents: {
          future: {
            binary: 'copilot'
          }
        }
      });
      expect(logger.warn).toHaveBeenCalledWith(
        { agentName: 'future' },
        'agent manifest entry is unverified'
      );
    });
  });

  it('fails malformed manifests with named factory errors', async () => {
    await withTempDir(async (directory) => {
      const manifestPath = path.join(directory, 'agents.json');
      await writeFile(manifestPath, JSON.stringify({ version: 1, agents: { bad: {} } }));
      const logger = { info: vi.fn(), warn: vi.fn() };

      await expect(loadAgentManifest(logger, { manifestPath })).rejects.toMatchObject({
        name: 'AgentManifestLoadError',
        cause: {
          name: 'InvalidAgentManifest'
        }
      });
    });
  });

  it('returns a loaded shape that is loggable', async () => {
    const logger = { info: vi.fn(), warn: vi.fn() };
    const manifest = await loadAgentManifest(logger);

    expect(() => JSON.stringify(manifest)).not.toThrow();
    expect(logger.info).toHaveBeenCalledWith({ manifest }, 'agent manifest loaded');
  });
});
