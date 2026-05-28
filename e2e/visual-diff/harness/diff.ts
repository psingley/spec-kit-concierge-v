import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { designScreenshotDir, diffScreenshotDir, resultsPath, shippedScreenshotDir, visualDiffDir } from './paths';
import { screenByName, screens, type Rect, type VisualDiffScreen } from './screens.config';

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

const crop = (source: PNG, rect: Rect): PNG => {
  const output = new PNG({ width: rect.width, height: rect.height });
  PNG.bitblt(source, output, rect.x, rect.y, rect.width, rect.height, 0, 0);
  return output;
};

const fillRect = (image: PNG, rect: Rect): void => {
  const x0 = Math.max(0, rect.x);
  const y0 = Math.max(0, rect.y);
  const x1 = Math.min(image.width, rect.x + rect.width);
  const y1 = Math.min(image.height, rect.y + rect.height);
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const index = (image.width * y + x) << 2;
      image.data[index] = 128;
      image.data[index + 1] = 128;
      image.data[index + 2] = 128;
      image.data[index + 3] = 255;
    }
  }
};

const normalize = (image: PNG, screen: VisualDiffScreen): PNG => {
  const normalized = screen.bbox ? crop(image, screen.bbox) : PNG.sync.read(PNG.sync.write(image));
  for (const mask of screen.masks ?? []) {
    const rect = screen.bbox
      ? { ...mask, x: mask.x - screen.bbox.x, y: mask.y - screen.bbox.y }
      : mask;
    fillRect(normalized, rect);
  }
  return normalized;
};

await mkdir(diffScreenshotDir, { recursive: true });
await mkdir(visualDiffDir, { recursive: true });

const results: DiffResult[] = [];
for (const screen of selected) {
  const designPath = `${designScreenshotDir}/${screen.name}.png`;
  const shippedPath = `${shippedScreenshotDir}/${screen.name}.png`;
  const diffPath = `${diffScreenshotDir}/${screen.name}.png`;
  await assertExists(designPath, screen.name);
  await assertExists(shippedPath, screen.name);
  const design = normalize(await readPng(designPath), screen);
  const shipped = normalize(await readPng(shippedPath), screen);
  if (design.width !== shipped.width || design.height !== shipped.height) {
    throw new Error(`${screen.name} dimensions differ: design ${design.width}x${design.height}, shipped ${shipped.width}x${shipped.height}`);
  }
  const diff = new PNG({ width: design.width, height: design.height });
  const changed = pixelmatch(design.data, shipped.data, diff.data, design.width, design.height, {
    threshold: 0.1,
    includeAA: false
  });
  await writeFile(diffPath, PNG.sync.write(diff));
  const diffPercent = Number(((changed / (design.width * design.height)) * 100).toFixed(2));
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
