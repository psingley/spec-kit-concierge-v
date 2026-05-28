import type { Page } from '@playwright/test';
import type { StyleSample } from '../contract/generateContract';

export type CapturedStyleSample = {
  name: string;
  selector: string;
  found: boolean;
  styles: Record<string, string>;
};

export const snapshotStyles = async (page: Page, samples: StyleSample[], side: 'design' | 'shipped'): Promise<CapturedStyleSample[]> => {
  const output: CapturedStyleSample[] = [];
  for (const sample of samples) {
    const selector = side === 'design' ? sample.designSelector : sample.shippedSelector;
    const locator = page.locator(selector).first();
    const found = await locator.isVisible().catch(() => false);
    const styles = found
      ? await locator.evaluate((element: unknown, properties) => {
          const computed = (globalThis as typeof globalThis & { getComputedStyle: (input: unknown) => { getPropertyValue: (name: string) => string } }).getComputedStyle(element);
          return Object.fromEntries(properties.map((property) => [property, computed.getPropertyValue(property)]));
        }, sample.properties)
      : {};
    output.push({ name: sample.name, selector, found, styles });
  }
  return output;
};
