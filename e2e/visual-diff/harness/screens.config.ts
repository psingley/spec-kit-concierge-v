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

const samplePrompt =
  'Add a self-serve flight-change flow so loyalty-tier guests can rebook within ±48h of departure without calling the concierge desk. Must respect existing rebook rules, push events to the itinerary service, and surface a confirmation receipt in the guest app.';

const signIn = async (page: Page, count: 1 | 2 | 3): Promise<void> => {
  for (let i = 0; i < count; i += 1) {
    const designButton = page.locator('.signin-card').getByRole('button', { name: /Sign in/i }).first();
    if (await designButton.isVisible().catch(() => false)) {
      await designButton.click();
    } else {
      const shippedButton = page.locator('.auth-list .auth-row').filter({ hasNotText: /Connected|Locked/i }).first();
      if (!(await shippedButton.isVisible().catch(() => false))) return;
      await shippedButton.click();
    }
    await page.waitForTimeout(150);
  }
};

const reachRepoBrowse = async (page: Page): Promise<void> => {
  if (await page.getByRole('heading', { name: /Pick a repository/i }).isVisible().catch(() => false)) return;
  await signIn(page, 3);
  await page.getByRole('heading', { name: /Pick a repository/i }).waitFor();
};

const reachWorkspace = async (page: Page): Promise<void> => {
  if (await page.locator('[aria-label="Specify prompt"], .prompt-input, [data-testid="spec-markdown"], .md-panel, .spec-loading').first().isVisible().catch(() => false)) return;
  await reachRepoBrowse(page);
  await pickFirstRepo(page);
  const start = page.getByRole('button', { name: /Start a new session/i });
  if (await start.isVisible().catch(() => false)) {
    await start.click();
  }
  await page.locator('[aria-label="Specify prompt"], .prompt-input').first().waitFor();
};

const fillRepoSearch = async (page: Page, value: string): Promise<void> => {
  await page.locator('[placeholder*="Filter repos"], [aria-label="Search repositories"], [placeholder*="Search repositories"]').first().fill(value);
};

const pickFirstRepo = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: /concierge-api|spec-kit-concierge-v|collette-web|hello-world-fixture/i }).first().click();
};

const setCurrentStep = async (page: Page, step: string): Promise<void> => {
  await reachWorkspace(page);
  if (step === 'specify') return;
  const testStep = page.getByTestId(`step-${step}`);
  if ((await testStep.isVisible().catch(() => false)) && (await testStep.isEnabled().catch(() => false))) {
    await testStep.click();
  } else {
    const tabStep = page.getByRole('tab', { name: new RegExp(step, 'i') });
    if ((await tabStep.isVisible().catch(() => false)) && (await tabStep.isEnabled().catch(() => false))) {
      await tabStep.click();
    }
  }
  await page.waitForTimeout(200);
};

const beginSpecify = async (page: Page): Promise<void> => {
  await reachWorkspace(page);
  await page.locator('[aria-label="Specify prompt"], .prompt-input').first().fill('Build a hello-world feature');
  await page.getByRole('button', { name: /Begin specify/i }).click();
};

const reachWorkspaceWithSamplePrompt = async (page: Page): Promise<void> => {
  await reachWorkspace(page);
  await page.getByRole('button', { name: /collette-travel\/concierge-api/i }).waitFor({ timeout: 5_000 }).catch(() => undefined);
  await page.getByRole('button', { name: 'main' }).waitFor({ timeout: 5_000 }).catch(() => undefined);
  await page.locator('[aria-label="Specify prompt"], .prompt-input').first().fill(samplePrompt);
};

const completeSpecify = async (page: Page): Promise<void> => {
  await reachWorkspaceWithSamplePrompt(page);
  const begin = page.getByRole('button', { name: /Begin specify/i });
  await begin.waitFor({ state: 'visible' });
  await begin.click();
  await page.locator('[data-testid="spec-markdown"], .md-panel').first().waitFor({ timeout: 20_000 });
};

const openActivity = async (page: Page): Promise<void> => {
  await reachWorkspace(page);
  if (!(await page.locator('.activity').isVisible().catch(() => false))) {
    await page.locator('.activity-pill').click();
  }
};

const openRepoMenu = async (page: Page): Promise<void> => {
  const labelled = page.getByRole('button', { name: /Repository/i });
  if (await labelled.isVisible().catch(() => false)) {
    await labelled.click();
    return;
  }
  await page.locator('.titlebar .tb-chip').filter({ hasText: /collette-travel/i }).first().click();
};

const openSettingsMenu = async (page: Page): Promise<void> => {
  const labelled = page.getByRole('button', { name: /Settings/i });
  if (await labelled.isVisible().catch(() => false)) {
    await labelled.click();
    return;
  }
  await page.locator('.titlebar [title="Settings"], .titlebar .icon-btn').last().click();
};

const clickMenuItem = async (page: Page, name: RegExp): Promise<void> => {
  const menuItem = page.getByRole('menuitem', { name });
  if (await menuItem.isVisible().catch(() => false)) {
    await menuItem.click();
    return;
  }
  await page.locator('.tb-menu button, .gear-menu button').filter({ hasText: name }).first().click();
};

export const screens: VisualDiffScreen[] = [
  { name: 'signin-fresh', designPath: 'design/v3-fetch/project/signin.jsx', masks: [scrollbarMask] },
  { name: 'signin-github-ok', designPath: 'design/v3-fetch/project/signin.jsx', designSetup: (page) => signIn(page, 1), shippedSetup: (page) => signIn(page, 1), masks: [scrollbarMask] },
  { name: 'signin-all-ok', designPath: 'design/v3-fetch/project/signin.jsx', designSetup: (page) => signIn(page, 3), shippedSetup: (page) => signIn(page, 3), masks: [scrollbarMask] },
  { name: 'repo-browse-empty-search', designPath: 'design/v3-fetch/project/repo-browse.jsx', designSetup: async (page) => { await reachRepoBrowse(page); await fillRepoSearch(page, 'zzzz'); }, shippedSetup: async (page) => { await reachRepoBrowse(page); await fillRepoSearch(page, 'zzzz'); }, masks: [scrollbarMask] },
  { name: 'repo-browse-repo-selected', designPath: 'design/v3-fetch/project/repo-browse.jsx', designSetup: async (page) => { await reachRepoBrowse(page); await pickFirstRepo(page); }, shippedSetup: async (page) => { await reachRepoBrowse(page); await pickFirstRepo(page); }, masks: [scrollbarMask] },
  { name: 'workspace-titlebar-closed-menus', designPath: 'design/v3-fetch/project/topbar.jsx', designSetup: reachWorkspace, shippedSetup: reachWorkspace, masks: [scrollbarMask] },
  { name: 'workspace-titlebar-repo-dropdown-open', designPath: 'design/v3-fetch/project/topbar.jsx', designSetup: async (page) => { await reachWorkspace(page); await openRepoMenu(page); }, shippedSetup: async (page) => { await reachWorkspace(page); await openRepoMenu(page); }, masks: [scrollbarMask] },
  { name: 'workspace-titlebar-gear-menu-open', designPath: 'design/v3-fetch/project/topbar.jsx', designSetup: async (page) => { await reachWorkspace(page); await openSettingsMenu(page); }, shippedSetup: async (page) => { await reachWorkspace(page); await openSettingsMenu(page); }, masks: [scrollbarMask] },
  ...['specify', 'clarify', 'plan', 'tasks', 'analyze', 'review'].map((step) => ({
    name: `stepper-${step}-current`,
    designPath: 'design/v3-fetch/project/app.jsx',
    designSetup: (page: Page) => setCurrentStep(page, step === 'review' ? 'final' : step),
    shippedSetup: (page: Page) => setCurrentStep(page, step),
    masks: [scrollbarMask]
  })),
  { name: 'specify-input', designPath: 'design/v3-fetch/project/steps.jsx', designSetup: reachWorkspaceWithSamplePrompt, shippedSetup: reachWorkspaceWithSamplePrompt, masks: [bodyTextMask, scrollbarMask] },
  { name: 'specify-running', designPath: 'design/v3-fetch/project/steps.jsx', designSetup: beginSpecify, shippedSetup: beginSpecify, masks: [bodyTextMask, timestampMask, scrollbarMask] },
  { name: 'specify-complete', designPath: 'design/v3-fetch/project/steps.jsx', designSetup: completeSpecify, shippedSetup: completeSpecify, masks: [bodyTextMask, timestampMask, scrollbarMask] },
  { name: 'activity-rail-idle', designPath: 'design/v3-fetch/project/activity.jsx', designSetup: openActivity, shippedSetup: openActivity, masks: [timestampMask, scrollbarMask] },
  { name: 'activity-rail-busy', designPath: 'design/v3-fetch/project/activity.jsx', designSetup: async (page) => { await beginSpecify(page); await openActivity(page); }, shippedSetup: async (page) => { await beginSpecify(page); await openActivity(page); }, masks: [timestampMask, scrollbarMask] },
  { name: 'activity-pill-idle', designPath: 'design/v3-fetch/project/activity-pill.jsx', designSetup: reachWorkspace, shippedSetup: reachWorkspace, masks: [scrollbarMask] },
  { name: 'activity-pill-busy', designPath: 'design/v3-fetch/project/activity-pill.jsx', designSetup: beginSpecify, shippedSetup: beginSpecify, masks: [timestampMask, scrollbarMask] },
  { name: 'customize-modal', designPath: 'design/v3-fetch/project/customize-modal.jsx', designSetup: async (page) => { await reachWorkspace(page); await openSettingsMenu(page); await clickMenuItem(page, /Customize/i); }, shippedSetup: async (page) => { await reachWorkspace(page); await openSettingsMenu(page); await clickMenuItem(page, /Customize/i); }, masks: [scrollbarMask] },
  { name: 'about-modal', designPath: 'design/v3-fetch/project/topbar.jsx', designSetup: async (page) => { await reachWorkspace(page); await openSettingsMenu(page); await clickMenuItem(page, /About/i); }, shippedSetup: async (page) => { await reachWorkspace(page); await openSettingsMenu(page); await clickMenuItem(page, /About/i); }, masks: [scrollbarMask] },
  { name: 'request-modal', designPath: 'design/v3-fetch/project/request-modal.jsx', designSetup: async (page) => { await reachWorkspace(page); await openSettingsMenu(page); await clickMenuItem(page, /File a request|Request access|Report a bug/i); }, shippedSetup: async (page) => { await reachWorkspace(page); await openSettingsMenu(page); await clickMenuItem(page, /Report a bug/i); }, masks: [scrollbarMask] }
];

export const screenByName = (name: string): VisualDiffScreen => {
  const screen = screens.find((entry) => entry.name === name);
  if (!screen) throw new Error(`Unknown visual-diff screen: ${name}`);
  return screen;
};
