import type { Page } from '@playwright/test';

export type AomNode = {
  role: string;
  name: string;
  children: AomNode[];
};

export const snapshotAom = async (page: Page, selector = 'body'): Promise<AomNode | null> =>
  (await page.locator(selector).first().isVisible().catch(() => false) ? page.locator(selector).first() : page.locator('body')).evaluate((root: unknown) => {
    type BrowserElement = {
      textContent: string | null;
      tagName: string;
      children: Iterable<BrowserElement>;
      getAttribute: (name: string) => string | null;
    };
    const roleFor = (element: BrowserElement): string => {
      const explicit = element.getAttribute('role');
      if (explicit) return explicit;
      const tag = element.tagName.toLowerCase();
      if (tag === 'button') return 'button';
      if (/^h[1-6]$/.test(tag)) return 'heading';
      if (tag === 'main') return 'main';
      if (tag === 'section') return 'region';
      return 'generic';
    };
    const nameFor = (element: BrowserElement): string => {
      const tag = element.tagName.toLowerCase();
      if (![...element.children].length || ['button', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
        return (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 160);
      }
      return '';
    };
    const walk = (element: BrowserElement): AomNode | null => {
      const children = [...element.children].map(walk).filter((child): child is AomNode => Boolean(child));
      const role = roleFor(element);
      const name = nameFor(element);
      if (role === 'generic') return children.length ? { role, name: '', children } : null;
      return { role, name, children };
    };
    return walk(root as BrowserElement);
  });

export const flattenAom = (node: AomNode | null): string[] => {
  if (!node) return [];
  const own = `${node.role}|${node.name}`;
  return [own, ...node.children.flatMap(flattenAom)];
};
