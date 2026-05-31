import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const GITHUB_HOSTNAME = 'github.com';
type ExecFileResult = {
  stdout: string;
  stderr: string;
};

export type ExecFileAdapter = (command: string, args: string[], options: { shell: false }) => Promise<ExecFileResult>;
const defaultExecFile: ExecFileAdapter = async (command, args, options) => execFileAsync(command, args, options);

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

export type GitHubAuthStatus = {
  authenticated: boolean;
  login?: string;
};

type GitHubApiUser = {
  login?: unknown;
  name?: unknown;
  avatar_url?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const readTestAdapterConfig = async (filePath: string | undefined): Promise<TestAdapterConfig | undefined> => {
  if (filePath === undefined || filePath.length === 0) {
    return undefined;
  }

  return JSON.parse(await readFile(filePath, 'utf8')) as TestAdapterConfig;
};

export const parseGitHubAuthStatus = (output: string): GitHubAuthStatus => {
  const accountBlocks = output.split(/\n\s*\n/);
  for (const block of accountBlocks) {
    if (!block.includes('- Active account: true')) {
      continue;
    }

    const activeLogin = block.match(/Logged in to [^\s]+ account ([^\s]+)/);
    if (activeLogin?.[1] !== undefined) {
      return { authenticated: true, login: activeLogin[1] };
    }
  }

  const singleLogin = output.match(/Logged in to [^\s]+ account ([^\s]+)/);
  if (singleLogin?.[1] !== undefined && output.includes('- Active account: true')) {
    return { authenticated: true, login: singleLogin[1] };
  }

  return { authenticated: false };
};

export const readGitHubAuthStatus = async (execFileAdapter: ExecFileAdapter = defaultExecFile): Promise<GitHubAuthStatus> => {
  try {
    const { stdout, stderr } = await execFileAdapter('gh', ['auth', 'status', '--active', '--hostname', GITHUB_HOSTNAME], {
      shell: false
    });
    return parseGitHubAuthStatus(`${stdout}${stderr}`);
  } catch (error) {
    const processError = error as { stdout?: string; stderr?: string };
    return parseGitHubAuthStatus(`${processError.stdout ?? ''}${processError.stderr ?? ''}`);
  }
};

export const readGitHubIdentity = async (
  fallbackLogin?: string,
  execFileAdapter: ExecFileAdapter = defaultExecFile
): Promise<LoginIdentity> => {
  try {
    const { stdout } = await execFileAdapter('gh', ['api', 'user'], { shell: false });
    const parsed = JSON.parse(stdout) as GitHubApiUser;
    if (!isRecord(parsed) || typeof parsed.login !== 'string') {
      throw new Error('gh api user returned an invalid identity payload.');
    }

    return {
      login: parsed.login,
      displayName: typeof parsed.name === 'string' ? parsed.name : undefined,
      avatarUrl: typeof parsed.avatar_url === 'string' ? parsed.avatar_url : undefined
    };
  } catch {
    if (fallbackLogin !== undefined) {
      return { login: fallbackLogin };
    }
    throw new Error('GitHub CLI is authenticated, but the active identity could not be read.');
  }
};

export const loginGitHub = async (
  adapterPath = process.env.CONCIERGE_TEST_GH_ADAPTER,
  execFileAdapter: ExecFileAdapter = defaultExecFile
): Promise<LoginResult> => {
  const config = await readTestAdapterConfig(adapterPath);
  if (config !== undefined) {
    return {
      status: 'ok',
      provider: 'github',
      identity: config.identity ?? { login: 'mock-gh-user', displayName: 'Mock GitHub User' }
    };
  }

  const existing = await readGitHubAuthStatus(execFileAdapter);
  if (existing.authenticated) {
    return { status: 'ok', provider: 'github', identity: await readGitHubIdentity(existing.login, execFileAdapter) };
  }

  await execFileAdapter('gh', ['auth', 'login', '--web', '--hostname', GITHUB_HOSTNAME, '--git-protocol', 'https'], {
    shell: false
  });
  const authenticated = await readGitHubAuthStatus(execFileAdapter);
  if (!authenticated.authenticated) {
    throw new Error('GitHub CLI login did not complete.');
  }
  return { status: 'ok', provider: 'github', identity: await readGitHubIdentity(authenticated.login, execFileAdapter) };
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
