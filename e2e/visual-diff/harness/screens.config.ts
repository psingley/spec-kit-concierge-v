import type { Page } from '@playwright/test';

export type Rect = { x: number; y: number; width: number; height: number };

export type VisualDiffScreen = {
  name: string;
  designPath: string;
  designSetup?: (page: Page) => Promise<void>;
  shippedSetup?: (page: Page) => Promise<void>;
  bbox?: Rect;
  masks?: Array<Rect & { reason: string }>;
};

const bodyTextMask = {
  x: 236,
  y: 432,
  width: 650,
  height: 92,
  reason: 'Body text font subpixel rendering differs between bundled prototype fonts and Electron assets.'
};

const timestampMask = {
  x: 1010,
  y: 140,
  width: 64,
  height: 430,
  reason: 'Activity timestamps are generated at capture time and are intentionally dynamic.'
};

const scrollbarMask = {
  x: 1268,
  y: 0,
  width: 12,
  height: 720,
  reason: 'Scrollbar gutter painting differs by Chromium host and is not product UI fidelity.'
};

const signIn = async (page: Page, count: 1 | 2 | 3): Promise<void> => {
  for (let i = 0; i < count; i += 1) {
    await page.getByRole('button', { name: /Sign in|GitHub CLI|Copilot CLI|Atlassian MCP/i }).first().click();
    await page.waitForTimeout(150);
  }
};

const reachRepoBrowse = async (page: Page): Promise<void> => {
  await signIn(page, 3);
  await page.getByRole('heading', { name: /Pick a repository/i }).waitFor();
};

const reachWorkspace = async (page: Page): Promise<void> => {
  await reachRepoBrowse(page);
  await page.getByRole('button', { name: /concierge-api|spec-kit-concierge-v|collette-web/i }).first().click();
  const start = page.getByRole('button', { name: /Start a new session/i });
  if (await start.isVisible().catch(() => false)) {
    await start.click();
  }
  await page.getByLabel('Specify prompt').waitFor();
};

const setCurrentStep = async (page: Page, step: string): Promise<void> => {
  await reachWorkspace(page);
  if (step === 'specify') return;
  await page.getByTestId(`step-${step}`).click().catch(async () => {
    await page.getByRole('tab', { name: new RegExp(step, 'i') }).click();
  });
  await page.waitForTimeout(200);
};

const beginSpecify = async (page: Page): Promise<void> => {
  await reachWorkspace(page);
  await page.getByLabel('Specify prompt').fill('Build a hello-world feature');
  await page.getByRole('button', { name: /Begin Specify/i }).click();
};

const completeSpecify = async (page: Page): Promise<void> => {
  await beginSpecify(page);
  await page.getByTestId('spec-markdown').waitFor({ timeout: 20_000 });
};

const openActivity = async (page: Page): Promise<void> => {
  await reachWorkspace(page);
  if (!(await page.locator('.activity').isVisible().catch(() => false))) {
    await page.locator('.activity-pill').click();
  }
};

export const screens: VisualDiffScreen[] = [
  { name: 'signin-fresh', designPath: 'design/v3-fetch/project/signin.jsx', masks: [scrollbarMask] },
  { name: 'signin-github-ok', designPath: 'design/v3-fetch/project/signin.jsx', designSetup: (page) => signIn(page, 1), shippedSetup: (page) => signIn(page, 1), masks: [scrollbarMask] },
  { name: 'signin-all-ok', designPath: 'design/v3-fetch/project/signin.jsx', designSetup: (page) => signIn(page, 3), shippedSetup: (page) => signIn(page, 3), masks: [scrollbarMask] },
  { name: 'repo-browse-empty-search', designPath: 'design/v3-fetch/project/repo-browse.jsx', designSetup: async (page) => { await reachRepoBrowse(page); await page.getByPlaceholder(/Filter repos/i).fill('zzzz'); }, shippedSetup: async (page) => { await reachRepoBrowse(page); await page.getByPlaceholder(/Filter repos/i).fill('zzzz'); }, masks: [scrollbarMask] },
  { name: 'repo-browse-repo-selected', designPath: 'design/v3-fetch/project/repo-browse.jsx', designSetup: async (page) => { await reachRepoBrowse(page); await page.getByRole('button', { name: /concierge-api|spec-kit-concierge-v|collette-web/i }).first().click(); }, shippedSetup: async (page) => { await reachRepoBrowse(page); await page.getByRole('button', { name: /concierge-api|spec-kit-concierge-v|collette-web/i }).first().click(); }, masks: [scrollbarMask] },
  { name: 'workspace-titlebar-closed-menus', designPath: 'design/v3-fetch/project/topbar.jsx', designSetup: reachWorkspace, shippedSetup: reachWorkspace, masks: [scrollbarMask] },
  { name: 'workspace-titlebar-repo-dropdown-open', designPath: 'design/v3-fetch/project/topbar.jsx', designSetup: async (page) => { await reachWorkspace(page); await page.getByRole('button', { name: /Repository/i }).click(); }, shippedSetup: async (page) => { await reachWorkspace(page); await page.getByRole('button', { name: /Repository/i }).click(); }, masks: [scrollbarMask] },
  { name: 'workspace-titlebar-gear-menu-open', designPath: 'design/v3-fetch/project/topbar.jsx', designSetup: async (page) => { await reachWorkspace(page); await page.getByRole('button', { name: /Settings|gear/i }).click(); }, shippedSetup: async (page) => { await reachWorkspace(page); await page.getByRole('button', { name: /Settings/i }).click(); }, masks: [scrollbarMask] },
  ...['specify', 'clarify', 'plan', 'tasks', 'analyze', 'review'].map((step) => ({
    name: `stepper-${step}-current`,
    designPath: 'design/v3-fetch/project/app.jsx',
    designSetup: (page: Page) => setCurrentStep(page, step === 'review' ? 'final' : step),
    shippedSetup: (page: Page) => setCurrentStep(page, step),
    masks: [scrollbarMask]
  })),
  { name: 'specify-input', designPath: 'design/v3-fetch/project/steps.jsx', designSetup: reachWorkspace, shippedSetup: reachWorkspace, masks: [bodyTextMask, scrollbarMask] },
  { name: 'specify-running', designPath: 'design/v3-fetch/project/steps.jsx', designSetup: beginSpecify, shippedSetup: beginSpecify, masks: [bodyTextMask, timestampMask, scrollbarMask] },
  { name: 'specify-complete', designPath: 'design/v3-fetch/project/steps.jsx', designSetup: completeSpecify, shippedSetup: completeSpecify, masks: [bodyTextMask, timestampMask, scrollbarMask] },
  { name: 'activity-rail-idle', designPath: 'design/v3-fetch/project/activity.jsx', designSetup: openActivity, shippedSetup: openActivity, masks: [timestampMask, scrollbarMask] },
  { name: 'activity-rail-busy', designPath: 'design/v3-fetch/project/activity.jsx', designSetup: async (page) => { await beginSpecify(page); await openActivity(page); }, shippedSetup: async (page) => { await beginSpecify(page); await openActivity(page); }, masks: [timestampMask, scrollbarMask] },
  { name: 'activity-pill-idle', designPath: 'design/v3-fetch/project/activity-pill.jsx', designSetup: reachWorkspace, shippedSetup: reachWorkspace, masks: [scrollbarMask] },
  { name: 'activity-pill-busy', designPath: 'design/v3-fetch/project/activity-pill.jsx', designSetup: beginSpecify, shippedSetup: beginSpecify, masks: [timestampMask, scrollbarMask] },
  { name: 'customize-modal', designPath: 'design/v3-fetch/project/customize-modal.jsx', designSetup: async (page) => { await reachWorkspace(page); await page.getByRole('button', { name: /Settings|gear/i }).click(); await page.getByRole('menuitem', { name: /Customize/i }).click(); }, shippedSetup: async (page) => { await reachWorkspace(page); await page.getByRole('button', { name: /Settings/i }).click(); await page.getByRole('menuitem', { name: /Customize/i }).click(); }, masks: [scrollbarMask] },
  { name: 'about-modal', designPath: 'design/v3-fetch/project/topbar.jsx', designSetup: async (page) => { await reachWorkspace(page); await page.getByRole('button', { name: /Settings|gear/i }).click(); await page.getByRole('menuitem', { name: /About/i }).click(); }, shippedSetup: async (page) => { await reachWorkspace(page); await page.getByRole('button', { name: /Settings/i }).click(); await page.getByRole('menuitem', { name: /About/i }).click(); }, masks: [scrollbarMask] },
  { name: 'request-modal', designPath: 'design/v3-fetch/project/request-modal.jsx', designSetup: async (page) => { await reachWorkspace(page); await page.getByRole('button', { name: /Settings|gear/i }).click(); await page.getByRole('menuitem', { name: /File a request|Request access/i }).click(); }, shippedSetup: async (page) => { await reachWorkspace(page); await page.getByRole('button', { name: /Settings/i }).click(); await page.getByRole('menuitem', { name: /Request access/i }).click(); }, masks: [scrollbarMask] }
];

export const screenByName = (name: string): VisualDiffScreen => {
  const screen = screens.find((entry) => entry.name === name);
  if (!screen) throw new Error(`Unknown visual-diff screen: ${name}`);
  return screen;
};
