import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type CacheInput = {
  relativePath: string;
  sha256: string;
};

export type DesignCacheKey = {
  key: string;
  inputs: CacheInput[];
};

export type DesignCacheEntry = {
  screenName: string;
  key: string;
  writtenAt: string;
  path: string;
};

const devCacheDir = (repoRoot: string): string => path.join(repoRoot, 'e2e/visual-diff/artifacts/dev-cache');

const collectFiles = async (dir: string, prefix: string): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const files = await Promise.all(entries.map(async (entry) => {
    const relative = path.posix.join(prefix, entry.name);
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectFiles(absolute, relative);
    return [relative];
  }));
  return files.flat();
};

const hashFile = async (repoRoot: string, relativePath: string): Promise<CacheInput> => {
  const content = await readFile(path.join(repoRoot, relativePath));
  return {
    relativePath,
    sha256: createHash('sha256').update(content).digest('hex')
  };
};

export const computeDesignCacheKey = async ({
  repoRoot,
  screenName
}: {
  repoRoot: string;
  screenName: string;
}): Promise<DesignCacheKey> => {
  const designFiles = await collectFiles(
    path.join(repoRoot, 'design/v3-fetch/project'),
    'design/v3-fetch/project'
  );
  const staticInputs = [
    `e2e/visual-diff/contracts/${screenName}.contract.json`,
    'e2e/visual-diff/harness/screens.config.ts',
    'e2e/visual-diff/harness/capture/captureDesign.ts',
    'e2e/visual-diff/harness/capture/captureShipped.ts',
    'e2e/visual-diff/harness/capture/screenshot.ts',
    'e2e/visual-diff/harness/capture/snapshotAom.ts',
    'e2e/visual-diff/harness/capture/snapshotDom.ts',
    'e2e/visual-diff/harness/capture/snapshotStyles.ts'
  ];
  const inputs = await Promise.all([...designFiles, ...staticInputs].sort().map((file) => hashFile(repoRoot, file)));
  const aggregate = createHash('sha256');
  for (const input of inputs) aggregate.update(`${input.relativePath}\0${input.sha256}\n`);
  return {
    key: aggregate.digest('hex'),
    inputs
  };
};

export const readDesignCacheEntry = async ({
  repoRoot,
  screenName
}: {
  repoRoot: string;
  screenName: string;
}): Promise<DesignCacheEntry | null> => {
  const file = path.join(devCacheDir(repoRoot), `${screenName}.json`);
  try {
    return JSON.parse(await readFile(file, 'utf8')) as DesignCacheEntry;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
};

export const writeDesignCacheEntry = async ({
  repoRoot,
  screenName,
  key
}: {
  repoRoot: string;
  screenName: string;
  key: string;
}): Promise<DesignCacheEntry> => {
  const dir = devCacheDir(repoRoot);
  await mkdir(dir, { recursive: true });
  const entry: DesignCacheEntry = {
    screenName,
    key,
    writtenAt: new Date().toISOString(),
    path: path.join(dir, `${screenName}.json`)
  };
  await writeFile(entry.path, `${JSON.stringify(entry, null, 2)}\n`);
  return entry;
};

export const resetDevCache = async (repoRoot: string): Promise<void> => {
  await rm(devCacheDir(repoRoot), { recursive: true, force: true });
};
