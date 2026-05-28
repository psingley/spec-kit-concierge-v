import { expect, test, _electron as electron } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { ElectronApplication, Locator, Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createRun6BoundaryFixture } from './support/boundaries';

test.describe.serial('Run 6.5 design fidelity screenshots', () => {
  let electronApp: ElectronApplication | undefined;
  let page: Page;
  let repoName: string;
  const screenshotDir = path.join(process.cwd(), 'e2e', 'screenshots');

  const screenshot = async (name: string, locator?: Locator): Promise<void> => {
    await mkdir(screenshotDir, { recursive: true });
    const target = locator ?? page;
    await target.screenshot({ path: path.join(screenshotDir, `${name}.png`) });
    const results = await new AxeBuilder({ page }).setLegacyMode().withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')).toEqual([]);
  };

  const ensureActivityVisible = async (): Promise<Locator> => {
    const activity = page.locator('.activity');
    if (!(await activity.isVisible())) {
      await page.locator('.activity-pill').click();
    }
    await expect(activity).toBeVisible();
    return activity;
  };

  test.beforeAll(async () => {
    const fixture = await createRun6BoundaryFixture();
    repoName = fixture.repoName;
    electronApp = await electron.launch({
      args: [path.join(process.cwd(), '.vite/build/main.js')],
      env: {
        ...process.env,
        CONCIERGE_TEST_GH_ADAPTER: fixture.ghAdapterPath,
        CONCIERGE_TEST_COPILOT_ADAPTER: fixture.copilotAdapterPath,
        CONCIERGE_TEST_ACP_ADAPTER: fixture.acpAdapterPath
      }
    });
    page = await electronApp.firstWindow();
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.waitForLoadState('domcontentloaded');
  });

  test.afterAll(async () => {
    await electronApp?.close();
  });

  test('full-window signin', async () => {
    await expect(page.getByRole('heading', { name: /Spec-kit Concierge/i })).toBeVisible();
    await screenshot('full-window-signin');
  });

  test('surface SignInScreen', async () => {
    await screenshot('surface-signin-screen', page.locator('.signin-card'));
  });

  test('full-window repo-browse', async () => {
    await page.getByRole('button', { name: /Sign in/i }).first().click();
    await page.getByRole('button', { name: /Sign in/i }).first().click();
    await expect(page.getByRole('heading', { name: /Pick a repository/i })).toBeVisible();
    await screenshot('full-window-repo-browse');
  });

  test('surface RepoBrowseScreen', async () => {
    await screenshot('surface-repo-browse-screen', page.locator('.repo-browser .hero-card'));
  });

  test('full-window workspace specify input', async () => {
    await page.getByRole('button', { name: new RegExp(repoName) }).click();
    await page.getByRole('button', { name: /Start a new session/i }).click();
    await expect(page.getByLabel('Specify prompt')).toBeVisible();
    await screenshot('full-window-workspace-specify-input');
  });

  test('surface AppShell', async () => {
    await screenshot('surface-app-shell', page.locator('.workspace'));
  });

  test('surface Titlebar', async () => {
    await screenshot('surface-titlebar', page.locator('.titlebar'));
  });

  test('surface Titlebar dropdown', async () => {
    await page.getByRole('button', { name: /collette-travel\/concierge-api/i }).click();
    await screenshot('surface-titlebar-dropdown', page.getByRole('menu', { name: /Repository/i }));
    await page.keyboard.press('Escape');
  });

  test('surface Stepper', async () => {
    await screenshot('surface-stepper', page.locator('.stepper'));
  });

  test('surface SpecifyStep input state', async () => {
    await screenshot('surface-specify-input', page.locator('.specify-step'));
  });

  test('surface ActivityPill', async () => {
    await screenshot('surface-activity-pill', page.locator('.activity-pill'));
  });

  test('surface Activity', async () => {
    await screenshot('surface-activity', await ensureActivityVisible());
  });

  test('surface CustomizeModal', async () => {
    await page.getByRole('button', { name: /Settings/i }).click();
    await page.getByRole('menuitem', { name: /Customize/i }).click();
    await screenshot('surface-customize-modal', page.getByRole('dialog', { name: /Customize/i }));
    await page.getByRole('button', { name: /^Close$/i }).click();
  });

  test('surface AboutModal', async () => {
    await page.getByRole('button', { name: /Settings/i }).click();
    await page.getByRole('menuitem', { name: /About/i }).click();
    await screenshot('surface-about-modal', page.getByRole('dialog', { name: /About Concierge/i }));
    await page.getByRole('button', { name: /^Close$/i }).click();
  });

  test('surface RequestModal stub', async () => {
    await page.getByRole('button', { name: /Settings/i }).click();
    await page.getByRole('menuitem', { name: /Request access/i }).click();
    await screenshot('surface-request-modal', page.getByRole('dialog', { name: /Request support/i }));
    await page.getByRole('button', { name: /^Close$/i }).click();
  });

  test('full-window workspace specify complete', async () => {
    await page.getByLabel('Specify prompt').fill('Build a hello-world feature');
    await page.getByRole('button', { name: /Begin Specify/i }).click();
    await expect(page.getByTestId('spec-markdown')).toContainText('Hello-world feature', { timeout: 20_000 });
    await screenshot('full-window-workspace-specify-complete');
  });

  test('surface SpecifyStep complete state', async () => {
    await screenshot('surface-specify-complete', page.locator('.specify-step'));
  });

  test('surface Markdown', async () => {
    await screenshot('surface-markdown', page.getByTestId('spec-markdown'));
  });

  test('surface Activity after completion', async () => {
    await screenshot('surface-activity-complete', await ensureActivityVisible());
  });

  test('motion variant current-step pulse', async () => {
    await screenshot('motion-current-step-pulse', page.getByTestId('step-specify'));
  });

  test('motion variant reduced motion', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await screenshot('motion-reduced-current-step', page.getByTestId('step-specify'));
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  });
});
