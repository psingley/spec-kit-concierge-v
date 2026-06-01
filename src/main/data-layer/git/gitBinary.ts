import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

/**
 * OS-boundary adapter for locating a usable git executable.
 *
 * Packaged Electron GUI apps inherit a stripped PATH (Finder/Explorer launch
 * context), so a bare `spawn('git', ...)` fails with the misleading
 * `spawn git ENOENT` on BOTH macOS and Windows. The CORE resolution flow here is
 * OS-agnostic; the ONLY per-OS knowledge is the candidate LIST chosen behind a
 * single `process.platform` switch (mirrors the Run-11 path-finder pattern in
 * mcp-config/). Windows benefits identically — there is no mac-only branch.
 */
export type GitBinaryProbe = (candidate: string) => Promise<boolean>;

export type ResolveGitBinaryOptions = {
  platform?: NodeJS.Platform;
  env?: Record<string, string | undefined>;
  /** Probe whether a name resolves on PATH (dev). Default: spawn-less PATH walk. */
  probePath?: GitBinaryProbe;
  /** Probe whether an absolute candidate file is executable. Default: fs.access. */
  probeFile?: GitBinaryProbe;
};

const TEST_OVERRIDE_ENV = 'CONCIERGE_TEST_GIT_BINARY';

let cachedBinary: string | undefined;

export const __resetGitBinaryCacheForTests = (): void => {
  cachedBinary = undefined;
};

const isExecutable = async (candidate: string): Promise<boolean> => {
  try {
    await access(candidate, constants.X_OK);
    return true;
  } catch {
    return false;
  }
};

/** Default PATH probe: walk $PATH entries for an executable named `name`. */
const defaultProbePath =
  (env: Record<string, string | undefined>, platform: NodeJS.Platform): GitBinaryProbe =>
  async (name: string) => {
    const rawPath = env.PATH ?? env.Path ?? '';
    if (rawPath.length === 0) {
      return false;
    }
    const separator = platform === 'win32' ? ';' : ':';
    for (const dir of rawPath.split(separator)) {
      if (dir.length === 0) {
        continue;
      }
      if (await isExecutable(path.join(dir, name))) {
        return true;
      }
    }
    return false;
  };

/**
 * Per-OS candidate list. This is the SINGLE platform switch — everything else is
 * shared. macOS/linux share the POSIX list; win32 gets backslash paths only.
 */
const candidateBinaries = (platform: NodeJS.Platform, env: Record<string, string | undefined>): string[] => {
  if (platform === 'win32') {
    const localAppData = env.LOCALAPPDATA;
    const candidates = [
      'C:\\Program Files\\Git\\cmd\\git.exe',
      'C:\\Program Files\\Git\\bin\\git.exe'
    ];
    if (localAppData !== undefined && localAppData.length > 0) {
      candidates.push(path.win32.join(localAppData, 'Programs', 'Git', 'cmd', 'git.exe'));
    }
    return candidates;
  }
  // darwin and linux share the POSIX candidate list.
  return ['/usr/bin/git', '/usr/local/bin/git', '/opt/homebrew/bin/git'];
};

const pathName = (platform: NodeJS.Platform): string => (platform === 'win32' ? 'git.exe' : 'git');

export const resolveGitBinary = async (options: ResolveGitBinaryOptions = {}): Promise<string> => {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;

  const override = env[TEST_OVERRIDE_ENV];
  if (override !== undefined && override.length > 0) {
    return override;
  }

  if (cachedBinary !== undefined) {
    return cachedBinary;
  }

  const probePath = options.probePath ?? defaultProbePath(env, platform);
  const probeFile = options.probeFile ?? isExecutable;

  const onPath = pathName(platform);
  if (await probePath(onPath)) {
    cachedBinary = onPath;
    return onPath;
  }

  for (const candidate of candidateBinaries(platform, env)) {
    if (await probeFile(candidate)) {
      cachedBinary = candidate;
      return candidate;
    }
  }

  throw new Error(
    'git executable could not be found on PATH or in any known install location. Install Git or add it to PATH.'
  );
};
