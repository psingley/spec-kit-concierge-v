import { _electron as electron } from '@playwright/test';
import type { ElectronApplication } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createRun6BoundaryFixture } from '../../../support/boundaries';
import { actualDir, viewport } from '../paths';
import { screenByName, screens } from '../screens.config';
import { loadContract } from '../contract/loadContract';
import { snapshotDom } from './snapshotDom';
import { snapshotAom } from './snapshotAom';
import { snapshotStyles } from './snapshotStyles';
import { screenshotElementOrPage } from './screenshot';

const names = process.argv.slice(2);
const selected = names.length > 0 ? names.map(screenByName) : screens;

const draftNowByScreen: Record<string, string> = {
  'specify-running': String(Number.parseInt('rpg3', 36)),
  'specify-complete': String(Number.parseInt('rr6q', 36)),
  'activity-rail-busy': String(Number.parseInt('rwgq', 36)),
  'activity-pill-busy': String(Number.parseInt('rwgq', 36))
};

const specifyDelayByScreen = (screenName: string): string | undefined =>
  screenName === 'specify-running' || screenName === 'activity-rail-busy' || screenName === 'activity-pill-busy'
    ? '2000'
    : undefined;

for (const screen of selected) {
  const contract = await loadContract(screen.name);
  const fixture = await createRun6BoundaryFixture();
  const dir = path.join(actualDir, screen.name);
  await mkdir(dir, { recursive: true });
  let electronApp: ElectronApplication | undefined;
  try {
    electronApp = await electron.launch({
      args: [path.join(process.cwd(), '.vite/build/main.js')],
      env: {
        ...process.env,
        CONCIERGE_TEST_GH_ADAPTER: fixture.ghAdapterPath,
        CONCIERGE_TEST_COPILOT_ADAPTER: fixture.copilotAdapterPath,
        CONCIERGE_TEST_ACP_ADAPTER: fixture.acpAdapterPath,
        CONCIERGE_TEST_DRAFT_NOW: draftNowByScreen[screen.name] ?? '',
        CONCIERGE_TEST_ACP_PROMPT_DELAY_MS: specifyDelayByScreen(screen.name) ?? ''
      }
    });
    const page = await electronApp.firstWindow();
    await page.setViewportSize(screen.viewport ?? viewport);
    await page.waitForLoadState('domcontentloaded');
    await screen.shippedSetup?.(page);
    await page.waitForTimeout(250);
    await screenshotElementOrPage(page, contract.primaryRegion.shippedSelector, path.join(dir, 'shipped.png'));
    await writeFile(path.join(dir, 'shipped.dom.json'), JSON.stringify(await snapshotDom(page, contract.primaryRegion.shippedSelector), null, 2));
    await writeFile(path.join(dir, 'shipped.aom.json'), JSON.stringify(await snapshotAom(page, contract.primaryRegion.shippedSelector), null, 2));
    await writeFile(path.join(dir, 'shipped.styles.json'), JSON.stringify(await snapshotStyles(page, contract.styleSamples, 'shipped'), null, 2));
    console.log(`captured shipped ${screen.name}`);
  } finally {
    await electronApp?.close();
  }
}
