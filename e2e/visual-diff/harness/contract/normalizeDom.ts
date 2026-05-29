import type { Page } from '@playwright/test';

export type DomNode = {
  tag: string;
  role?: string;
  text?: string;
  marker?: string;
  children: DomNode[];
};

export const snapshotDom = async (page: Page, selector: string): Promise<DomNode> =>
  (await page.locator(selector).first().isVisible().catch(() => false) ? page.locator(selector).first() : page.locator('body')).evaluate((root: unknown) => {
    type BrowserElement = {
      textContent: string | null;
      tagName: string;
      children: Iterable<BrowserElement>;
      getAttribute: (name: string) => string | null;
    };
    const visibleText = (element: BrowserElement): string => {
      if (element.tagName.toLowerCase() === 'button') return element.getAttribute('aria-label') ?? (element.textContent ?? '').replace(/\s+/g, ' ').trim();
      if (![...element.children].length || ['button', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(element.tagName.toLowerCase())) {
        return (element.textContent ?? '').replace(/\s+/g, ' ').trim();
      }
      return '';
    };
    const walk = (element: BrowserElement): DomNode => ({
      tag: element.tagName.toLowerCase(),
      role: element.getAttribute('role') ?? undefined,
      text: visibleText(element).slice(0, 160) || undefined,
      marker: element.getAttribute('data-vd-role') ?? undefined,
      children: [...element.children].map(walk)
    });
    return walk(root as BrowserElement);
  });

export const flattenDom = (node: DomNode): string[] => {
  const own = `${node.tag}|${node.role ?? ''}|${node.text ?? ''}`;
  return [own, ...node.children.flatMap(flattenDom)];
};
