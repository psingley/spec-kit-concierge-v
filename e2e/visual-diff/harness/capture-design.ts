import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { designHtmlPath, designScreenshotDir, viewport } from './paths';
import { screenByName, screens } from './screens.config';

const names = process.argv.slice(2);
const selected = names.length > 0 ? names.map(screenByName) : screens;

await mkdir(designScreenshotDir, { recursive: true });

const browser = await chromium.launch();
try {
  for (const screen of selected) {
    const page = await browser.newPage({ viewport });
    await page.goto(pathToFileURL(designHtmlPath).toString());
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
}
