import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

export const createTempDir = async (prefix = 'concierge-test-'): Promise<string> =>
  mkdtemp(path.join(tmpdir(), prefix));

export const withTempDir = async <T>(
  callback: (directory: string) => Promise<T>,
  prefix?: string
): Promise<T> => {
  const directory = await createTempDir(prefix);

  try {
    return await callback(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
};
