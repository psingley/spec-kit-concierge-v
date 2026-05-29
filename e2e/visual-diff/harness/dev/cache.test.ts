import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { computeDesignCacheKey, resetDevCache, writeDesignCacheEntry } from './cache';

const tempDirs: string[] = [];

const makeFixture = async (): Promise<string> => {
  const root = await fsTempDir();
  await mkdir(path.join(root, 'design/v3-fetch/project'), { recursive: true });
  await mkdir(path.join(root, 'e2e/visual-diff/contracts'), { recursive: true });
  await mkdir(path.join(root, 'e2e/visual-diff/harness/capture'), { recursive: true });
  await mkdir(path.join(root, 'e2e/visual-diff/harness/dev'), { recursive: true });
  await writeFile(path.join(root, 'design/v3-fetch/project/app.jsx'), 'design-v1');
  await writeFile(path.join(root, 'e2e/visual-diff/contracts/screen.contract.json'), '{"pixel":{}}');
  await writeFile(path.join(root, 'e2e/visual-diff/harness/screens.config.ts'), 'screens-v1');
  await writeFile(path.join(root, 'e2e/visual-diff/harness/capture/captureDesign.ts'), 'capture-design-v1');
  await writeFile(path.join(root, 'e2e/visual-diff/harness/capture/captureShipped.ts'), 'capture-shipped-v1');
  await writeFile(path.join(root, 'e2e/visual-diff/harness/capture/screenshot.ts'), 'screenshot-v1');
  await writeFile(path.join(root, 'e2e/visual-diff/harness/capture/snapshotAom.ts'), 'aom-v1');
  await writeFile(path.join(root, 'e2e/visual-diff/harness/capture/snapshotDom.ts'), 'dom-v1');
  await writeFile(path.join(root, 'e2e/visual-diff/harness/capture/snapshotStyles.ts'), 'styles-v1');
  return root;
};

const fsTempDir = async (): Promise<string> => {
  const root = await import('node:fs/promises').then((fs) => fs.mkdtemp(path.join(os.tmpdir(), 'vd-dev-cache-')));
  tempDirs.push(root);
  return root;
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('computeDesignCacheKey', () => {
  test('changes when design source changes', async () => {
    const root = await makeFixture();
    const first = await computeDesignCacheKey({ repoRoot: root, screenName: 'screen' });
    await writeFile(path.join(root, 'design/v3-fetch/project/app.jsx'), 'design-v2');
    const second = await computeDesignCacheKey({ repoRoot: root, screenName: 'screen' });
    expect(second.key).not.toBe(first.key);
    expect(second.inputs.map((input) => input.relativePath)).toContain('design/v3-fetch/project/app.jsx');
  });

  test('changes when selected contract changes', async () => {
    const root = await makeFixture();
    const first = await computeDesignCacheKey({ repoRoot: root, screenName: 'screen' });
    await writeFile(path.join(root, 'e2e/visual-diff/contracts/screen.contract.json'), '{"pixel":{"maxDiffPercent":1}}');
    const second = await computeDesignCacheKey({ repoRoot: root, screenName: 'screen' });
    expect(second.key).not.toBe(first.key);
  });
});

describe('resetDevCache', () => {
  test('removes cached entries so the next lookup is cold', async () => {
    const root = await makeFixture();
    const entry = await writeDesignCacheEntry({
      repoRoot: root,
      screenName: 'screen',
      key: 'abc123'
    });
    expect(await readFile(entry.path, 'utf8')).toContain('abc123');
    await resetDevCache(root);
    await expect(readFile(entry.path, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
