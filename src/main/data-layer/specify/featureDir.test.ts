import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { withTempDir } from '../../../test/tempDir';
import { resolveFeatureDir } from './featureDir';

const writeManifest = async (directory: string, contents: string): Promise<void> => {
  await mkdir(path.join(directory, '.specify'), { recursive: true });
  await writeFile(path.join(directory, '.specify', 'feature.json'), contents, 'utf8');
};

describe('resolveFeatureDir', () => {
  it('returns the feature dir joined to the repository path from .specify/feature.json', async () => {
    await withTempDir(async (directory) => {
      await writeManifest(directory, JSON.stringify({ feature_directory: 'specs/012-thing' }));

      const result = await resolveFeatureDir(directory);

      expect(result).toBe(path.join(directory, 'specs/012-thing'));
    });
  });

  it('throws a clear error when .specify/feature.json is missing', async () => {
    await withTempDir(async (directory) => {
      await expect(resolveFeatureDir(directory)).rejects.toThrow(
        'spec-kit feature directory not found (.specify/feature.json missing)'
      );
    });
  });

  it('throws a clear error when .specify/feature.json is malformed JSON', async () => {
    await withTempDir(async (directory) => {
      await writeManifest(directory, '{ not valid json');

      await expect(resolveFeatureDir(directory)).rejects.toThrow(
        'spec-kit feature directory unreadable (.specify/feature.json is malformed JSON)'
      );
    });
  });

  it('throws a clear error when feature_directory key is missing', async () => {
    await withTempDir(async (directory) => {
      await writeManifest(directory, JSON.stringify({ other: 'value' }));

      await expect(resolveFeatureDir(directory)).rejects.toThrow(
        'spec-kit feature directory missing (.specify/feature.json has no feature_directory)'
      );
    });
  });

  it('throws when feature_directory is not a string', async () => {
    await withTempDir(async (directory) => {
      await writeManifest(directory, JSON.stringify({ feature_directory: 42 }));

      await expect(resolveFeatureDir(directory)).rejects.toThrow(
        'spec-kit feature directory missing (.specify/feature.json has no feature_directory)'
      );
    });
  });

  it('throws when feature_directory is an empty/whitespace string', async () => {
    await withTempDir(async (directory) => {
      await writeManifest(directory, JSON.stringify({ feature_directory: '   ' }));

      await expect(resolveFeatureDir(directory)).rejects.toThrow(
        'spec-kit feature directory missing (.specify/feature.json has no feature_directory)'
      );
    });
  });
});
