import { _electron as electron } from '@playwright/test';
import type { ElectronApplication } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createRun6BoundaryFixture } from '../../support/boundaries';
import { screenByName, screens } from './screens.config';
import { shippedScreenshotDir, viewport } from './paths';

const names = process.argv.slice(2);
const selected = names.length > 0 ? names.map(screenByName) : screens;

await mkdir(shippedScreenshotDir, { recursive: true });

for (const screen of selected) {
  const fixture = await createRun6BoundaryFixture();
  let electronApp: ElectronApplication | undefined;
  try {
    electronApp = await electron.launch({
      args: [path.join(process.cwd(), '.vite/build/main.js')],
      env: {
        ...process.env,
        CONCIERGE_TEST_GH_ADAPTER: fixture.ghAdapterPath,
        CONCIERGE_TEST_COPILOT_ADAPTER: fixture.copilotAdapterPath,
        CONCIERGE_TEST_ACP_ADAPTER: fixture.acpAdapterPath
      }
    });
    const page = await electronApp.firstWindow();
    await page.setViewportSize(viewport);
    await page.waitForLoadState('domcontentloaded');
    await screen.shippedSetup?.(page);
    await page.waitForTimeout(250);
    await page.screenshot({
      path: `${shippedScreenshotDir}/${screen.name}.png`,
      fullPage: false
    });
    console.log(`captured shipped ${screen.name}`);
  } finally {
    await electronApp?.close();
  }
}
