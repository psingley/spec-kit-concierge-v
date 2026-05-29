import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { designHtmlPath, referencesDir, viewport } from '../paths';
import { screenByName, screens } from '../screens.config';
import { loadContract } from '../contract/loadContract';
import { snapshotDom } from './snapshotDom';
import { snapshotAom } from './snapshotAom';
import { snapshotStyles } from './snapshotStyles';
import { screenshotElementOrPage } from './screenshot';

const contentTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jsx': 'text/babel; charset=utf-8'
};

const startDesignServer = async (): Promise<{ url: string; close: () => Promise<void> }> => {
  const designDir = path.dirname(designHtmlPath);
  const server = createServer(async (request, response) => {
    try {
      const requestPath = decodeURIComponent(new URL(request.url ?? '/', 'http://127.0.0.1').pathname);
      const normalizedPath = path.normalize(requestPath === '/' ? '/Spec-kit Concierge.html' : requestPath);
      const filePath = path.join(designDir, normalizedPath);
      if (!filePath.startsWith(designDir)) return void response.writeHead(403).end('Forbidden');
      response.writeHead(200, { 'content-type': contentTypes[path.extname(filePath)] ?? 'application/octet-stream' });
      response.end(await readFile(filePath));
    } catch {
      response.writeHead(404).end('Not found');
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (typeof address === 'string' || address === null) throw new Error('Failed to start design fixture server.');
  return {
    url: `http://127.0.0.1:${address.port}/Spec-kit%20Concierge.html`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve()))
  };
};

const names = process.argv.slice(2);
const selected = names.length > 0 ? names.map(screenByName) : screens;
const server = await startDesignServer();
const browser = await chromium.launch();
try {
  for (const screen of selected) {
    const contract = await loadContract(screen.name);
    const dir = path.join(referencesDir, screen.name);
    await mkdir(dir, { recursive: true });
    const page = await browser.newPage({ viewport });
    await page.goto(server.url);
    await page.waitForLoadState('networkidle');
    await screen.designSetup?.(page);
    await page.waitForTimeout(250);
    await screenshotElementOrPage(page, contract.primaryRegion.designSelector, path.join(dir, 'design.png'));
    await writeFile(path.join(dir, 'design.dom.json'), JSON.stringify(await snapshotDom(page, contract.primaryRegion.designSelector), null, 2));
    await writeFile(path.join(dir, 'design.aom.json'), JSON.stringify(await snapshotAom(page, contract.primaryRegion.designSelector), null, 2));
    await writeFile(path.join(dir, 'design.styles.json'), JSON.stringify(await snapshotStyles(page, contract.styleSamples, 'design'), null, 2));
    await page.close();
    console.log(`captured design ${screen.name}`);
  }
} finally {
  await browser.close();
  await server.close();
}
