import { expect, test, _electron as electron } from '@playwright/test';
import type { Page } from '@playwright/test';
import path from 'node:path';
import packageJson from '../package.json';

test('opens the blank Electron shell without console errors', async () => {
  const consoleErrors: string[] = [];
  const electronApp = await electron.launch({
    args: [path.join(process.cwd(), '.vite/build/main.js')],
    env: {
      ...process.env,
      // Use the test ACP adapter so the probe succeeds in CI without Copilot CLI installed
      CONCIERGE_TEST_ACP_ADAPTER: '1'
    }
  });

  const captureConsoleErrors = (page: Page): void => {
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });
  };

  electronApp.on('window', captureConsoleErrors);

  try {
    const firstWindow = await electronApp.firstWindow();
    captureConsoleErrors(firstWindow);

    await firstWindow.waitForLoadState('domcontentloaded');
    await expect(firstWindow).toHaveTitle('Spec-kit Concierge');
    await expect(firstWindow.getByTestId('app-version-proof')).toHaveText(packageJson.version);
    await expect(firstWindow.getByTestId('bound-cli-proof')).toBeVisible({ timeout: 10_000 });
    expect(consoleErrors).toEqual([]);
  } finally {
    await electronApp.close();
  }
});
