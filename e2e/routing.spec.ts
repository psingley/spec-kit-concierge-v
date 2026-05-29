import { expect, test, _electron as electron } from '@playwright/test';
import path from 'node:path';

test.describe('routing', () => {
  test('boots to /sign-in and never shows blank screen', async () => {
    const electronApp = await electron.launch({
      args: [path.join(process.cwd(), '.vite/build/main.js')]
    });

    try {
      const window = await electronApp.firstWindow();
      await window.waitForLoadState('domcontentloaded');

      // App should render on the sign-in route (auth not satisfied)
      await expect(window.locator('[data-testid="sign-in-screen"]')).toBeVisible({ timeout: 5000 });
    } finally {
      await electronApp.close();
    }
  });

  test('Alt+ArrowLeft does not navigate back', async () => {
    const electronApp = await electron.launch({
      args: [path.join(process.cwd(), '.vite/build/main.js')]
    });

    try {
      const window = await electronApp.firstWindow();
      await window.waitForLoadState('domcontentloaded');

      // Press Alt+ArrowLeft — should be blocked, no crash, still on sign-in
      await window.keyboard.press('Alt+ArrowLeft');
      await expect(window.locator('[data-testid="sign-in-screen"]')).toBeVisible({ timeout: 2000 });
    } finally {
      await electronApp.close();
    }
  });
});
