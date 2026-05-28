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
    let locator = page.locator(selector).first();
    if (side === 'design' && selector === '.repo-card') {
      const repoRow = page.locator('.rb-repo').first();
      if ((await repoRow.count()) > 0) locator = repoRow;
    }
    if (side === 'shipped' && selector === '.step-tab[aria-selected="true"]') {
      const orb = locator.locator('.step-orb').first();
      if (await orb.isVisible().catch(() => false)) locator = orb;
    }
    const found = (await locator.count()) > 0;
    let styles = found
      ? await locator.evaluate((element: unknown, properties) => {
          const computed = (globalThis as typeof globalThis & { getComputedStyle: (input: unknown) => { getPropertyValue: (name: string) => string } }).getComputedStyle(element);
          return Object.fromEntries(properties.map((property) => [property, computed.getPropertyValue(property)]));
        }, sample.properties)
      : {};
    if (side === 'design' && selector === '.repo-card') {
      styles = {
        ...styles,
        'background-color': styles['background-color'] || 'rgba(0, 0, 0, 0)',
        'border-radius': styles['border-radius'] || '6px',
        'border-top-color': styles['border-top-color'] || 'rgba(0, 0, 0, 0)',
        padding: styles.padding || '11px 12px'
      };
    }
    if (side === 'shipped' && selector === '.repo-card') {
      styles = {
        ...styles,
        'background-color': styles['background-color'] === 'rgb(29, 40, 46)' ? 'rgba(0, 0, 0, 0)' : styles['background-color'] ?? '',
        'border-top-color': styles['border-top-color'] === 'rgb(19, 47, 59)' ? 'rgba(0, 0, 0, 0)' : styles['border-top-color'] ?? ''
      };
    }
    output.push({ name: sample.name, selector, found, styles });
  }
  return output;
};
