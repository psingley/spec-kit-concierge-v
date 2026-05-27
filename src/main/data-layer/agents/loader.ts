import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { MainLogger } from '../../logging';
import { createAgentManifest, type AgentManifest } from './manifest';

export class AgentManifestLoadError extends Error {
  constructor(readonly cause: unknown) {
    super('Agent manifest failed validation');
    this.name = 'AgentManifestLoadError';
  }
}

export type LoadAgentManifestOptions = {
  manifestPath?: string;
};

export const defaultAgentManifestPath = path.join(
  process.cwd(),
  'src',
  'main',
  'data-layer',
  'agents',
  'agents.json'
);

export const loadAgentManifest = async (
  logger: Pick<MainLogger, 'info' | 'warn'>,
  options: LoadAgentManifestOptions = {}
): Promise<AgentManifest> => {
  const manifestPath = options.manifestPath ?? defaultAgentManifestPath;
  const manifestText = await readFile(manifestPath, 'utf8');
  const parsedManifest: unknown = JSON.parse(manifestText);
  const result = createAgentManifest(parsedManifest);

  if (!result.ok) {
    throw new AgentManifestLoadError(result.error);
  }

  for (const [agentName, entry] of Object.entries(result.value.agents)) {
    // verifiedAgainst is absent (undefined) OR was explicitly null in source — both warn.
    if (entry.verifiedAgainst === undefined) {
      logger.warn({ agentName }, 'agent manifest entry is unverified');
    }
  }

  logger.info({ manifest: result.value }, 'agent manifest loaded');

  return result.value;
};
