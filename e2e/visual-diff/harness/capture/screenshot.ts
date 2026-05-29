import type { Page } from '@playwright/test';

export const screenshotElementOrPage = async (page: Page, selector: string, path: string): Promise<void> => {
  const locator = page.locator(selector).first();
  if (await locator.isVisible().catch(() => false)) {
    await locator.screenshot({ path });
    return;
  }
  await page.screenshot({ path, fullPage: false });
};
