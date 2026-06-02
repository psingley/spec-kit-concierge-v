import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateTasksArtifacts } from './tasks.factory';

const exists = async (filePath: string): Promise<boolean> =>
  access(filePath).then(
    () => true,
    () => false
  );

const createRepo = async (): Promise<{ repositoryPath: string; correctFeatureDir: string; wrongFeatureDir: string }> => {
  const repositoryPath = await mkdtemp(path.join(os.tmpdir(), 'concierge-tasks-recovery-'));
  const correctFeatureDir = path.join(repositoryPath, 'specs', '0012-remove-density-settings');
  const wrongFeatureDir = path.join(repositoryPath, 'specs', '0008-react-router-refactor');
  await mkdir(correctFeatureDir, { recursive: true });
  await mkdir(wrongFeatureDir, { recursive: true });
  return { repositoryPath, correctFeatureDir, wrongFeatureDir };
};

describe('validateTasksArtifacts wrong-dir recovery', () => {
  it('relocates a valid sibling tasks.md into the feature dir before creating the commit candidate', async () => {
    const { repositoryPath, correctFeatureDir, wrongFeatureDir } = await createRepo();
    await writeFile(path.join(wrongFeatureDir, 'tasks.md'), '# Tasks\n- [ ] T001 Recover wrong-dir output\n', 'utf8');

    const result = await validateTasksArtifacts(correctFeatureDir, {
      repositoryPath,
      featureDir: correctFeatureDir
    });

    expect(result.ok).toBe(true);
    expect(result).toMatchObject({
      commit: {
        step: 'tasks',
        files: [path.join('specs', '0012-remove-density-settings', 'tasks.md')]
      }
    });
    await expect(readFile(path.join(correctFeatureDir, 'tasks.md'), 'utf8')).resolves.toContain('Recover wrong-dir output');
    await expect(exists(path.join(wrongFeatureDir, 'tasks.md'))).resolves.toBe(false);
  });

  it('returns a recoverable failure reason with stranded paths when sibling tasks.md is still invalid', async () => {
    const { repositoryPath, correctFeatureDir, wrongFeatureDir } = await createRepo();
    await writeFile(path.join(wrongFeatureDir, 'tasks.md'), 'partial task draft', 'utf8');

    const result = await validateTasksArtifacts(correctFeatureDir, {
      repositoryPath,
      featureDir: correctFeatureDir
    });

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({
      escapeHatchReason: 'factory-rejected',
      failureReason: expect.stringContaining(path.join('specs', '0008-react-router-refactor', 'tasks.md')),
      strandedArtifacts: [path.join('specs', '0008-react-router-refactor', 'tasks.md')]
    });
  });
});
