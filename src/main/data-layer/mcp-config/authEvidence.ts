import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export type OAuthEvidence = {
  metadataPath?: string;
  serverUrl?: string;
  tokenCompanionPath?: string;
  tokenFilePresent: boolean;
  authenticated: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

export const findOAuthEvidence = async (oauthConfigDir: string, configuredServerUrl: string): Promise<OAuthEvidence> => {
  let entries: string[] = [];
  try {
    entries = await readdir(oauthConfigDir);
  } catch {
    return { tokenFilePresent: false, authenticated: false };
  }

  for (const entry of entries.filter((candidate) => candidate.endsWith('.json') && !candidate.endsWith('.tokens.json'))) {
    const metadataPath = path.join(oauthConfigDir, entry);
    try {
      const metadata = JSON.parse(await readFile(metadataPath, 'utf8')) as unknown;
      const serverUrl = isRecord(metadata) && typeof metadata.serverUrl === 'string' ? metadata.serverUrl : undefined;
      if (serverUrl === configuredServerUrl) {
        const tokenCompanionPath = path.join(oauthConfigDir, entry.replace(/\.json$/, '.tokens.json'));
        const tokenFilePresent = await fileExists(tokenCompanionPath);
        return {
          metadataPath,
          serverUrl,
          tokenCompanionPath,
          tokenFilePresent,
          authenticated: tokenFilePresent
        };
      }
    } catch {
      // Ignore malformed metadata; Copilot owns this directory.
    }
  }

  return { tokenFilePresent: false, authenticated: false };
};
