import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { designHtmlPath, designScreenshotDir, viewport } from './paths';
import { screenByName, screens } from './screens.config';

const names = process.argv.slice(2);
const selected = names.length > 0 ? names.map(screenByName) : screens;

await mkdir(designScreenshotDir, { recursive: true });

const designDir = path.dirname(designHtmlPath);
const contentTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jsx': 'text/babel; charset=utf-8'
};

const server = createServer(async (request, response) => {
  try {
    const requestPath = decodeURIComponent(new URL(request.url ?? '/', 'http://127.0.0.1').pathname);
    const normalizedPath = path.normalize(requestPath === '/' ? '/Spec-kit Concierge.html' : requestPath);
    const filePath = path.join(designDir, normalizedPath);
    if (!filePath.startsWith(designDir)) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    const body = await readFile(filePath);
    response.writeHead(200, { 'content-type': contentTypes[path.extname(filePath)] ?? 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404).end('Not found');
  }
});

await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
if (typeof address === 'string' || address === null) throw new Error('Failed to start design fixture server.');
const designUrl = `http://127.0.0.1:${address.port}/Spec-kit%20Concierge.html`;

const browser = await chromium.launch();
try {
  for (const screen of selected) {
    const page = await browser.newPage({ viewport });
    await page.goto(designUrl);
    await page.waitForLoadState('networkidle');
    await screen.designSetup?.(page);
    await page.waitForTimeout(250);
    await page.screenshot({
      path: `${designScreenshotDir}/${screen.name}.png`,
      fullPage: false
    });
    await page.close();
    console.log(`captured design ${screen.name}`);
  }
} finally {
  await browser.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
}
