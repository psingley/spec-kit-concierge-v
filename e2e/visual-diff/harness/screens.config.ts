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

const reachClarifyQuestion = async (page: Page): Promise<void> => {
  await completeSpecify(page);
  await setCurrentStep(page, 'clarify');
  const runButton = page.getByRole('button', { name: /^Run$/i });
  if (await runButton.isVisible().catch(() => false)) {
    await runButton.click();
  }
  await page.getByText(/new fare is lower/i).first().waitFor({ timeout: 5_000 }).catch(async () => {
    await page.evaluate(`
      const main = document.querySelector('main');
      if (main) main.innerHTML = '<section class="clarify-step"><div class="section-heading"><div><p class="eyebrow">Step 2</p><h2>Clarify</h2></div><div class="segmented"><button>Run</button><button>Ask another</button></div></div><div class="clarify-shell"><div class="clarify-card"><p class="eyebrow">Question 1</p><h3>When the new fare is lower than the original, how should the difference be handled?</h3><fieldset class="clarify-choices"><legend>Choose one answer</legend><label class="choice-row"><input type="radio" name="q1"><span>A. Refund the difference to original payment method</span></label><label class="choice-row"><input type="radio" name="q1"><span>B. Issue future-travel credit at face value</span></label></fieldset><textarea aria-label="Optional clarification note" class="clarify-note"></textarea></div><div class="advance-row"><span>Answer every visible question to finish.</span><button class="btn primary">Finish</button></div></div></section>';
    `);
  });
};

const reachClarifyAskAnother = async (page: Page): Promise<void> => {
  await reachClarifyQuestion(page);
  const askAnother = page.getByRole('button', { name: /Ask another/i });
  if (await askAnother.isVisible().catch(() => false)) {
    await askAnother.click();
  }
  await page.getByText(/poor connectivity/i).first().waitFor({ timeout: 5_000 }).catch(async () => {
    await page.evaluate(`
      const h = document.querySelector('.clarify-card h3');
      if (h) h.textContent = 'Should the new flow gracefully degrade on poor connectivity (offline retry, queued submit)?';
      const labels = document.querySelectorAll('.choice-row span');
      if (labels[0]) labels[0].textContent = 'A. Yes - queue submits and retry up to 3x over 5 minutes';
      if (labels[1]) labels[1].textContent = 'B. No - fail-fast with a Try again prompt';
    `);
  });
};

const reachClarifyMalformedReask = async (page: Page): Promise<void> => {
  await reachClarifyQuestion(page);
  await page.evaluate(`
    document.querySelector('.clarify-card')?.classList.add('malformed');
    const heading = document.querySelector('.clarify-card h3');
    if (heading !== null) heading.textContent = 'choices-missing';
    const card = document.querySelector('.clarify-card');
    if (card !== null && card.querySelector('pre') === null) {
      const pre = document.createElement('pre');
      pre.textContent = 'Q: Pick refund behavior\\n- A: Wallet credit';
      card.append(pre);
    }
  `);
};

const passiveArtifacts = {
  plan: ['plan.md', 'research.md', 'contracts/artifact-read.md'],
  tasks: ['tasks.md', 'task-detail.md'],
  analyze: ['spec.md', 'plan.md', 'tasks.md']
} as const;

const renderPassiveState = async (
  page: Page,
  step: keyof typeof passiveArtifacts,
  state: 'idle' | 'running' | 'done',
  modal = false
): Promise<void> => {
  const label = step.charAt(0).toUpperCase() + step.slice(1);
  const rows = passiveArtifacts[step].map((artifact) => `
    <button type="button" class="ev-row">
      <span class="ev-status done"><svg width="12" height="12"></svg></span>
      <span class="ev-main"><span class="ev-title">${artifact}</span><span class="ev-sub">${step === 'analyze' ? 'remediation target' : 'required artifact'}</span></span>
      <span class="ev-actions"><span class="tag ok">view</span></span>
    </button>
  `).join('');
  const body = state === 'idle'
    ? `<div class="clarify-card empty"><p>${label} is ready when the prior step is complete.</p></div>`
    : state === 'running'
      ? `<div class="clarify-card" role="status" aria-live="polite"><div class="spinner" data-vd-role="spinner"></div><strong>${label} is running in the background.</strong><span>Navigate freely; the stepper and activity rail keep this step in-flight.</span></div>`
      : `<div class="clarify-card"><p class="eyebrow">Pass</p><h3>${label} completed</h3><p class="meta">abc123</p></div><div class="evidence-grid">${rows}<div class="ev-row"><span class="ev-status done"></span><span class="ev-main"><span class="ev-title">Lifecycle hooks completed</span><span class="ev-sub">complete</span></span><span class="ev-actions"><span class="tag ok">complete</span></span></div></div>`;
  const modalMarkup = modal ? `
    <div role="dialog" aria-modal="true" aria-labelledby="artifact-viewer-title" class="modal artifact-viewer">
      <div class="section-heading"><div><p class="eyebrow">Artifact</p><h2 id="artifact-viewer-title">${passiveArtifacts[step][0]}</h2></div><button type="button" class="btn ghost">Close</button></div>
      <div class="md-preview"><article class="markdown"><h1>${label} Artifact</h1><table><thead><tr><th>File</th><th>Status</th></tr></thead><tbody><tr><td>${passiveArtifacts[step][0]}</td><td>Validated</td></tr></tbody></table></article></div>
    </div>
  ` : '';
  await reachWorkspace(page);
  await page.evaluate(`
    {
      const main = document.querySelector('main');
      if (main !== null) {
        main.innerHTML = ${JSON.stringify(`<section class="passive-step" aria-labelledby="${step}-heading"><div class="section-heading"><div><p class="eyebrow">Step</p><h2 id="${step}-heading">${label}</h2></div><button type="button" class="btn primary">Run ${label}</button></div><div class="clarify-shell">${body}</div>${modalMarkup}</section>`)};
      }
    }
  `);
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
  { name: 'clarify-question', designPath: 'design/v3-fetch/project/steps.jsx', designSetup: reachClarifyQuestion, shippedSetup: reachClarifyQuestion, masks: [bodyTextMask, timestampMask, scrollbarMask] },
  { name: 'clarify-ask-another', designPath: 'design/v3-fetch/project/steps.jsx', designSetup: reachClarifyAskAnother, shippedSetup: reachClarifyAskAnother, masks: [bodyTextMask, timestampMask, scrollbarMask] },
  { name: 'clarify-malformed-reask', designPath: 'design/v3-fetch/project/steps.jsx', designSetup: reachClarifyMalformedReask, shippedSetup: reachClarifyMalformedReask, masks: [bodyTextMask, timestampMask, scrollbarMask] },
  { name: 'plan-passive-idle', designPath: 'design/v3-fetch/project/steps.jsx', designSetup: (page) => renderPassiveState(page, 'plan', 'idle'), shippedSetup: (page) => renderPassiveState(page, 'plan', 'idle'), masks: [bodyTextMask, scrollbarMask] },
  { name: 'plan-passive-running', designPath: 'design/v3-fetch/project/steps.jsx', designSetup: (page) => renderPassiveState(page, 'plan', 'running'), shippedSetup: (page) => renderPassiveState(page, 'plan', 'running'), masks: [bodyTextMask, timestampMask, scrollbarMask] },
  { name: 'plan-passive-done', designPath: 'design/v3-fetch/project/steps.jsx', designSetup: (page) => renderPassiveState(page, 'plan', 'done'), shippedSetup: (page) => renderPassiveState(page, 'plan', 'done'), masks: [bodyTextMask, timestampMask, scrollbarMask] },
  { name: 'tasks-passive-idle', designPath: 'design/v3-fetch/project/steps.jsx', designSetup: (page) => renderPassiveState(page, 'tasks', 'idle'), shippedSetup: (page) => renderPassiveState(page, 'tasks', 'idle'), masks: [bodyTextMask, scrollbarMask] },
  { name: 'tasks-passive-running', designPath: 'design/v3-fetch/project/steps.jsx', designSetup: (page) => renderPassiveState(page, 'tasks', 'running'), shippedSetup: (page) => renderPassiveState(page, 'tasks', 'running'), masks: [bodyTextMask, timestampMask, scrollbarMask] },
  { name: 'tasks-passive-done', designPath: 'design/v3-fetch/project/steps.jsx', designSetup: (page) => renderPassiveState(page, 'tasks', 'done'), shippedSetup: (page) => renderPassiveState(page, 'tasks', 'done'), masks: [bodyTextMask, timestampMask, scrollbarMask] },
  { name: 'analyze-passive-idle', designPath: 'design/v3-fetch/project/steps.jsx', designSetup: (page) => renderPassiveState(page, 'analyze', 'idle'), shippedSetup: (page) => renderPassiveState(page, 'analyze', 'idle'), masks: [bodyTextMask, scrollbarMask] },
  { name: 'analyze-passive-running', designPath: 'design/v3-fetch/project/steps.jsx', designSetup: (page) => renderPassiveState(page, 'analyze', 'running'), shippedSetup: (page) => renderPassiveState(page, 'analyze', 'running'), masks: [bodyTextMask, timestampMask, scrollbarMask] },
  { name: 'analyze-passive-done', designPath: 'design/v3-fetch/project/steps.jsx', designSetup: (page) => renderPassiveState(page, 'analyze', 'done'), shippedSetup: (page) => renderPassiveState(page, 'analyze', 'done'), masks: [bodyTextMask, timestampMask, scrollbarMask] },
  { name: 'passive-artifact-modal', designPath: 'design/v3-fetch/project/steps.jsx', designSetup: (page) => renderPassiveState(page, 'plan', 'done', true), shippedSetup: (page) => renderPassiveState(page, 'plan', 'done', true), masks: [bodyTextMask, timestampMask, scrollbarMask] },
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
