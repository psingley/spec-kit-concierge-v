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

  // Check if already authenticated before attempting interactive login
  try {
    const { stdout } = await execFileAsync('gh', ['auth', 'status', '--active'], { shell: true });
    const loginMatch = stdout.match(/Logged in to .+ account (\S+)/);
    return {
      status: 'ok',
      provider: 'github',
      identity: { login: loginMatch?.[1] ?? 'github-user' }
    };
  } catch {
    // Not authenticated — attempt web-based device flow
  }

  await execFileAsync('gh', ['auth', 'login', '--web'], { shell: true });
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

  // Copilot CLI shares GitHub's OAuth token; verify gh copilot works
  try {
    await execFileAsync('gh', ['copilot', '--help'], { shell: true });
    return { status: 'ok', provider: 'copilot', label: 'Copilot CLI ready' };
  } catch {
    // Fall back to copilot login (device flow, opens browser)
  }

  await execFileAsync('copilot', ['login'], { shell: true });
  return { status: 'ok', provider: 'copilot', label: 'Copilot CLI ready' };
};
