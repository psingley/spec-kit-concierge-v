import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import { comparePngs } from './diffCore';
import { designScreenshotDir, diffScreenshotDir, resultsPath, shippedScreenshotDir, visualDiffDir } from './paths';
import { screenByName, screens } from './screens.config';

type DiffResult = {
  screen: string;
  designPath: string;
  shippedPath: string;
  diffPath: string;
  diffPercent: number;
  masked: Array<{ x: number; y: number; width: number; height: number; reason: string }>;
  timestamp: string;
};

const names = process.argv.slice(2);
const selected = names.length > 0 ? names.map(screenByName) : screens;

const assertExists = async (filePath: string, screenName: string): Promise<void> => {
  try {
    await access(filePath);
  } catch {
    throw new Error(`Missing screenshot for ${screenName}: ${filePath}. Run npm run vd:capture before npm run vd:diff.`);
  }
};

const readPng = async (filePath: string): Promise<PNG> => PNG.sync.read(await readFile(filePath));

await mkdir(diffScreenshotDir, { recursive: true });
await mkdir(visualDiffDir, { recursive: true });

const results: DiffResult[] = [];
for (const screen of selected) {
  const designPath = `${designScreenshotDir}/${screen.name}.png`;
  const shippedPath = `${shippedScreenshotDir}/${screen.name}.png`;
  const diffPath = `${diffScreenshotDir}/${screen.name}.png`;
  await assertExists(designPath, screen.name);
  await assertExists(shippedPath, screen.name);
  const { diff, diffPercent } = comparePngs(await readPng(designPath), await readPng(shippedPath), screen);
  await writeFile(diffPath, PNG.sync.write(diff));
  results.push({
    screen: screen.name,
    designPath,
    shippedPath,
    diffPath,
    diffPercent,
    masked: screen.masks ?? [],
    timestamp: new Date().toISOString()
  });
  console.log(`diffed ${screen.name}: ${diffPercent}%`);
}

await writeFile(resultsPath, `${JSON.stringify(results, null, 2)}\n`, 'utf8');
