import { readFile } from 'node:fs/promises';
import { runGh } from './execGh';

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

const isGhMissing = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const msg = error.message;
  // Windows cmd.exe: "not recognized as an internal or external command"
  if (msg.includes('not recognized as an internal or external command')) return true;
  // Windows PowerShell: "is not recognized as the name of a cmdlet"
  if (msg.includes('is not recognized as the name of a cmdlet')) return true;
  // POSIX: binary not found
  if ((error as NodeJS.ErrnoException).code === 'ENOENT') return true;
  return false;
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
    const { stdout } = await runGh(['auth', 'status', '--active']);
    const loginMatch = stdout.match(/Logged in to .+ account (\S+)/);
    return {
      status: 'ok',
      provider: 'github',
      identity: { login: loginMatch?.[1] ?? 'github-user' }
    };
  } catch (statusError) {
    if (isGhMissing(statusError)) {
      throw new Error('GitHub CLI (gh) is not installed or not in PATH. Install it from https://cli.github.com/');
    }
    // Not authenticated — attempt web-based device flow
  }

  await runGh(['auth', 'login', '--web']);
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
    await runGh(['copilot', '--help']);
    return { status: 'ok', provider: 'copilot', label: 'Copilot CLI ready' };
  } catch (copilotError) {
    if (isGhMissing(copilotError)) {
      throw new Error('GitHub CLI (gh) is not installed or not in PATH. Install it from https://cli.github.com/');
    }
    // Fall back to copilot login (device flow, opens browser)
  }

  await runGh(['copilot', 'login']);
  return { status: 'ok', provider: 'copilot', label: 'Copilot CLI ready' };
};
