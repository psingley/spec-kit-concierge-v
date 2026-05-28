import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type LoginIdentity = {
  login: string;
  displayName?: string;
  avatarUrl?: string;
};

export type LoginResult = {
  status: 'ok';
  provider: 'github' | 'copilot' | 'atlassian';
  identity?: LoginIdentity;
  label?: string;
};

type TestAdapterConfig = {
  identity?: LoginIdentity;
  repositories?: unknown[];
};

export const readTestAdapterConfig = async (filePath: string | undefined): Promise<TestAdapterConfig | undefined> => {
  if (filePath === undefined || filePath.length === 0) {
    return undefined;
  }

  return JSON.parse(await readFile(filePath, 'utf8')) as TestAdapterConfig;
};

export const loginGitHub = async (adapterPath = process.env.CONCIERGE_TEST_GH_ADAPTER): Promise<LoginResult> => {
  const config = await readTestAdapterConfig(adapterPath);
  if (config !== undefined) {
    return {
      status: 'ok',
      provider: 'github',
      identity: config.identity ?? { login: 'mock-gh-user', displayName: 'Mock GitHub User' }
    };
  }

  await execFileAsync('gh', ['auth', 'login'], { shell: false });
  return { status: 'ok', provider: 'github', identity: { login: 'github-user' } };
};

export const loginCopilot = async (
  githubConnected: boolean,
  adapterPath = process.env.CONCIERGE_TEST_COPILOT_ADAPTER
): Promise<LoginResult> => {
  if (!githubConnected) {
    throw new Error('GitHub login is required before Copilot login.');
  }

  const config = await readTestAdapterConfig(adapterPath);
  if (config !== undefined) {
    return { status: 'ok', provider: 'copilot', label: 'Copilot CLI ready' };
  }

  await execFileAsync('copilot', ['auth', 'login'], { shell: false });
  return { status: 'ok', provider: 'copilot', label: 'Copilot CLI ready' };
};
