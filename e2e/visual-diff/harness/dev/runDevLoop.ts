import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { computeDesignCacheKey, readDesignCacheEntry, resetDevCache, writeDesignCacheEntry } from './cache';
import { DevCaptureSession, ensureElectronBuild } from './session';
import { screenByName, screens } from '../screens.config';
import { verifyScreen } from '../verify/verifyScreen';
import { writeJsonReport } from '../report/writeJsonReport';
import { writeMarkdownReport } from '../report/writeMarkdownReport';
import { artifactsRoot } from '../paths';

const args = process.argv.slice(2);
const reset = args.includes('--reset-cache');
const names = args.filter((arg) => arg !== '--reset-cache');
const selected = names.length > 0 ? names.map(screenByName) : screens;

if (reset) {
  await resetDevCache(process.cwd());
  console.log('reset visual-diff dev cache');
}

await ensureElectronBuild();

const session = new DevCaptureSession();
const results = [];
const capturedDesign: string[] = [];
const skippedDesign: string[] = [];

try {
  await session.start();
  for (const screen of selected) {
    const cacheKey = await computeDesignCacheKey({ repoRoot: process.cwd(), screenName: screen.name });
    const previous = await readDesignCacheEntry({ repoRoot: process.cwd(), screenName: screen.name });
    if (previous?.key === cacheKey.key) {
      skippedDesign.push(screen.name);
      console.log(`reused cached design ${screen.name}`);
    } else {
      await session.captureDesign(screen);
      await writeDesignCacheEntry({ repoRoot: process.cwd(), screenName: screen.name, key: cacheKey.key });
      capturedDesign.push(screen.name);
      console.log(`captured design ${screen.name}`);
    }
    await session.captureShipped(screen);
    console.log(`captured shipped ${screen.name}`);
    const result = await verifyScreen(screen.name);
    results.push(result);
    console.log(`${result.status} ${result.name} score=${result.priorityScore} residual=${result.pixelResidual}%`);
  }
} finally {
  await session.close();
}

const report = await writeJsonReport(results);
await writeMarkdownReport(report);
await mkdir(artifactsRoot, { recursive: true });
await writeFile(path.join(artifactsRoot, 'dev-session.json'), `${JSON.stringify({
  runId: report.runId,
  selected: selected.map((screen) => screen.name),
  capturedDesign,
  skippedDesign,
  state: session.getState(),
  summary: report.summary
}, null, 2)}\n`);
console.log(`wrote visual diff dev report: ${report.summary.pass}/${report.summary.total} PASS`);
