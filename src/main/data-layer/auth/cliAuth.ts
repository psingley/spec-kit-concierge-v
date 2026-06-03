import { execFile, spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { resolveWindowsBinary } from './execGh';

const execFileAsync = promisify(execFile);
const GITHUB_HOSTNAME = 'github.com';
type ExecFileResult = {
  stdout: string;
  stderr: string;
};

export type ExecFileAdapter = (command: string, args: string[], options: { shell: false }) => Promise<ExecFileResult>;
const defaultExecFile: ExecFileAdapter = async (command, args, options) =>
  execFileAsync(await resolveWindowsBinary(command), args, options);

type SpawnedProcess = {
  stdout: NodeJS.EventEmitter;
  stderr?: NodeJS.EventEmitter;
  on: (event: 'close' | 'exit' | 'error', listener: (...args: unknown[]) => void) => unknown;
};

export type SpawnAdapter = (command: string, args: string[], options: { shell: false }) => SpawnedProcess;
const defaultSpawn: SpawnAdapter = (command, args, options) => spawn(command, args, options) as unknown as SpawnedProcess;

export type CopilotDeviceCodeInfo = {
  code: string;
  url: string;
};

export type CopilotLoginProcessResult = {
  exitCode: number | null;
  output: string;
};

export type LoginCopilotOptions = {
  onDeviceCode?: (info: CopilotDeviceCodeInfo) => void;
  spawnAdapter?: SpawnAdapter;
};

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

export type CopilotAuthStatus = {
  authenticated: boolean;
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

const hasEnvironmentCopilotToken = (): boolean =>
  process.env.COPILOT_GITHUB_TOKEN !== undefined || process.env.GH_TOKEN !== undefined || process.env.GITHUB_TOKEN !== undefined;

const GITHUB_DEVICE_URL = 'https://github.com/login/device';
const COPILOT_DEVICE_LINE = /visit\s+(https:\/\/github\.com\/login\/device)\s+and\s+enter\s+code\s+([A-Z0-9]{4}-[A-Z0-9]{4})/i;
const BARE_DEVICE_CODE = /\b([A-Z0-9]{4}-[A-Z0-9]{4})\b/;

const parseCopilotDeviceCode = (output: string): CopilotDeviceCodeInfo | null => {
  const primary = output.match(COPILOT_DEVICE_LINE);
  if (primary?.[1] !== undefined && primary[2] !== undefined) {
    return { url: primary[1], code: primary[2].toUpperCase() };
  }

  const fallback = output.match(BARE_DEVICE_CODE);
  if (fallback?.[1] !== undefined) {
    return { url: GITHUB_DEVICE_URL, code: fallback[1].toUpperCase() };
  }

  return null;
};

const COPILOT_LOGIN_FAILURE_MARKER = /error|failed|not authorized/i;

export const runCopilotLogin = async (
  spawnAdapter: SpawnAdapter,
  onDeviceCode?: (info: CopilotDeviceCodeInfo) => void
): Promise<CopilotLoginProcessResult> => {
  const copilotBinary = await resolveWindowsBinary('copilot');
  return new Promise((resolve, reject) => {
    const child = spawnAdapter(copilotBinary, ['login'], { shell: false });
    let stdout = '';
    let output = '';
    let emittedDeviceCode = false;
    let settled = false;
    const settle = (fn: () => void): void => {
      if (settled) return;
      settled = true;
      fn();
    };
    const inspectStdout = (chunk: unknown): void => {
      const text = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
      stdout += text;
      output += text;
      if (emittedDeviceCode) return;
      const parsed = parseCopilotDeviceCode(stdout);
      if (parsed === null) return;
      emittedDeviceCode = true;
      onDeviceCode?.(parsed);
    };
    const inspectStderr = (chunk: unknown): void => {
      output += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
    };
    const resolveWithProcessResult = (code: unknown): void => {
      settle(() => resolve({ exitCode: typeof code === 'number' ? code : null, output }));
    };

    child.stdout.on('data', inspectStdout);
    child.stderr?.on('data', inspectStderr);
    child.on('error', (error) => settle(() => reject(error)));
    child.on('close', resolveWithProcessResult);
    child.on('exit', resolveWithProcessResult);
  });
};

export const readCopilotAuthStatus = async (
  githubLogin: string | undefined,
  execFileAdapter: ExecFileAdapter = defaultExecFile,
  platform = process.platform
): Promise<CopilotAuthStatus> => {
  if (hasEnvironmentCopilotToken()) {
    return { authenticated: true };
  }

  if (githubLogin === undefined) {
    return { authenticated: false };
  }

  if (platform !== 'darwin') {
    return { authenticated: false };
  }

  try {
    await execFileAdapter('security', ['find-generic-password', '-s', 'copilot-cli', '-a', `https://github.com:${githubLogin}`], {
      shell: false
    });
    return { authenticated: true };
  } catch {
    return { authenticated: false };
  }
};

export const loginCopilot = async (
  githubConnected: boolean,
  adapterPath = process.env.CONCIERGE_TEST_COPILOT_ADAPTER,
  execFileAdapter: ExecFileAdapter = defaultExecFile,
  platform = process.platform,
  options: LoginCopilotOptions = {}
): Promise<LoginResult> => {
  if (!githubConnected) {
    throw new Error('GitHub login is required before Copilot login.');
  }

  const config = await readTestAdapterConfig(adapterPath);
  if (config !== undefined) {
    return { status: 'ok', provider: 'copilot', label: 'Copilot CLI ready' };
  }

  const githubStatus = await readGitHubAuthStatus(execFileAdapter);
  if (!githubStatus.authenticated) {
    throw new Error('GitHub login is required before Copilot login.');
  }

  const existing = await readCopilotAuthStatus(githubStatus.login, execFileAdapter, platform);
  if (existing.authenticated) {
    return { status: 'ok', provider: 'copilot', label: 'Copilot CLI ready' };
  }

  const loginResult = await runCopilotLogin(options.spawnAdapter ?? defaultSpawn, options.onDeviceCode);
  const authenticated = await readCopilotAuthStatus(githubStatus.login, execFileAdapter, platform);
  if (authenticated.authenticated) {
    return { status: 'ok', provider: 'copilot', label: 'Copilot CLI ready' };
  }

  if (
    platform === 'darwin' ||
    loginResult.exitCode !== 0 ||
    COPILOT_LOGIN_FAILURE_MARKER.test(loginResult.output)
  ) {
    throw new Error('Copilot CLI login did not complete.');
  }
  return { status: 'ok', provider: 'copilot', label: 'Copilot CLI ready' };
};
