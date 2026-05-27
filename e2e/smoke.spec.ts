import { expect, test, _electron as electron } from '@playwright/test';
import type { Page } from '@playwright/test';
import path from 'node:path';

test('opens the blank Electron shell without console errors', async () => {
  const consoleErrors: string[] = [];
  const electronApp = await electron.launch({
    args: [path.join(process.cwd(), '.vite/build/main.js')]
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
    expect(consoleErrors).toEqual([]);
  } finally {
    await electronApp.close();
  }
});
