import { access, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { runGit as runGitDefault } from '../git/gitCommand';

/**
 * The visible Documents location a GitHub repo is cloned into. Built ENTIRELY
 * with path.join so the same code yields a correct target on macOS AND Windows
 * (the `platformPath` seam exists only so tests can assert the win32 shape).
 * Distinct from the GitHub slug (`<owner>/<name>`) used as a list identifier —
 * a slug is NOT a filesystem path.
 */
export const localRepoPath = (
  documentsRoot: string,
  owner: string,
  name: string,
  platformPath: Pick<typeof path, 'join'> = path
): string => platformPath.join(documentsRoot, 'Concierge', owner, name);

export type EnsureRepoClonedRequest = {
  owner: string;
  name: string;
  cloneUrl: string;
  documentsRoot: string;
};

/**
 * Test-only OS-boundary override (mirrors CONCIERGE_TEST_REPOS_ADAPTER). When set,
 * resolves a fixture local path for a given `<owner>/<name>` slug WITHOUT cloning,
 * so the visual harness and tests never touch real git, the network, or Documents.
 * Shape: `{ "<owner>/<name>": "/abs/local/path" }`.
 */
const readEnsureLocalAdapter = async (
  owner: string,
  name: string,
  adapterPath = process.env.CONCIERGE_TEST_ENSURE_LOCAL_ADAPTER
): Promise<string | undefined> => {
  if (adapterPath === undefined || adapterPath.length === 0) {
    return undefined;
  }
  const config = JSON.parse(await readFile(adapterPath, 'utf8')) as Record<string, unknown>;
  const resolved = config[`${owner}/${name}`];
  return typeof resolved === 'string' && resolved.length > 0 ? resolved : undefined;
};

export type EnsureRepoClonedResult = {
  localPath: string;
  cloned: boolean;
};

export type EnsureRepoClonedDeps = {
  runGit?: (cwd: string, args: string[]) => Promise<string>;
  dirExists?: (target: string) => Promise<boolean>;
  ensureDir?: (target: string) => Promise<void>;
};

const defaultDirExists = async (target: string): Promise<boolean> => {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
};

const defaultEnsureDir = async (target: string): Promise<void> => {
  await mkdir(target, { recursive: true });
};

/**
 * Resolve the local Documents clone target and ensure a clean local repo exists.
 *  - missing  → `git clone <cloneUrl> <localPath>` into Documents/Concierge/...
 *  - present  → validate it is a real git repo (`git rev-parse --git-dir`); if not,
 *               the validation error surfaces honestly (no silent re-clone).
 * No fixtures, no fake fallback.
 */
export const ensureRepoCloned = async (
  { owner, name, cloneUrl, documentsRoot }: EnsureRepoClonedRequest,
  deps: EnsureRepoClonedDeps = {}
): Promise<EnsureRepoClonedResult> => {
  const runGit = deps.runGit ?? runGitDefault;
  const dirExists = deps.dirExists ?? defaultDirExists;
  const ensureDir = deps.ensureDir ?? defaultEnsureDir;

  const fixtureLocalPath = await readEnsureLocalAdapter(owner, name);
  if (fixtureLocalPath !== undefined) {
    return { localPath: fixtureLocalPath, cloned: false };
  }

  const target = localRepoPath(documentsRoot, owner, name);

  if (await dirExists(target)) {
    // Throws if the directory is not a git repository — surfaced to the caller.
    await runGit(target, ['rev-parse', '--git-dir']);
    return { localPath: target, cloned: false };
  }

  const parent = path.dirname(target);
  await ensureDir(parent);
  await runGit(parent, ['clone', cloneUrl, target]);
  return { localPath: target, cloned: true };
};
