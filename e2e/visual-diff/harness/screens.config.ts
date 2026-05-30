import type { Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

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
  const stepNumber = step === 'plan' ? '3' : step === 'tasks' ? '4' : '5';
  const rows = passiveArtifacts[step].map((artifact) => `
    <button type="button" class="ev-row">
      <span class="ev-status done"><svg width="12" height="12"></svg></span>
      <span class="ev-main"><span class="ev-title">${artifact}</span><span class="ev-sub">${step === 'analyze' ? 'remediation target' : artifact.startsWith('contracts/') ? 'markdown artifact' : 'required artifact'}</span></span>
      <span class="ev-actions"><span class="tag ok">view</span></span>
    </button>
  `).join('');
  const viewOnlyBanner = state === 'done'
    ? `<div class="inline-warning view-only-banner" role="status"><span>This step is committed, view only.</span><button type="button" class="btn ghost">Resume Review</button></div>`
    : '';
  const body = state === 'idle'
    ? `<div class="clarify-card empty"><p>${label} is ready when the prior step is complete.</p></div>`
    : state === 'running'
      ? `<div class="clarify-card" role="status" aria-live="polite"><div class="spinner" data-vd-role="spinner"></div><strong>${label} is running in the background.</strong><span>Navigate freely; the stepper and activity rail keep this step in-flight.</span></div>`
      : `<div class="clarify-card"><p class="eyebrow">Pass</p><h3>${label} completed</h3><p class="meta">abc123</p></div><div class="evidence-grid">${rows}<div class="ev-row"><span class="ev-status done"><svg width="12" height="12"></svg></span><span class="ev-main"><span class="ev-title">Lifecycle hooks completed</span><span class="ev-sub">complete</span></span><span class="ev-actions"><span class="tag ok">complete</span></span></div><div class="ev-row"><span class="ev-status done"><svg width="12" height="12"></svg></span><span class="ev-main"><span class="ev-title">Artifact manifest validated</span><span class="ev-sub">complete</span></span><span class="ev-actions"><span class="tag ok">complete</span></span></div></div>`;
  const modalMarkup = modal ? `
    <div role="dialog" aria-modal="true" aria-labelledby="artifact-viewer-title" class="modal artifact-viewer">
      <div class="section-heading"><div><p class="eyebrow">Artifact</p><h2 id="artifact-viewer-title">${passiveArtifacts[step][0]}</h2></div><button type="button" class="btn ghost">Close</button></div>
      <div class="md-preview"><article class="markdown"><h1>${label} Artifact</h1><table><thead><tr><th>File</th><th>Status</th></tr></thead><tbody><tr><td>${passiveArtifacts[step][0]}</td><td>Validated</td></tr></tbody></table></article></div>
    </div>
  ` : '';
  await reachWorkspace(page);
  const fixtureStyles = `<style>
    :root{--bg-2:#11171b;--surface:#171f24;--surface-2:#1d282e;--line:#2a373d;--line-strong:#3c4d55;--text:#f4f7f8;--text-faint:#819198;--accent:#3a7e9a;--accent-text:#8fd2e8;--good:#63d28a;--good-bg:rgb(99 210 138 / 0.13);--warn:#f6c45f;--warn-bg:rgb(246 196 95 / 0.14);--shadow-2:0 18px 44px -18px rgb(0 0 0 / 0.68),0 0 0 1px var(--line);--radius:6px;--radius-lg:10px;--radius-xl:14px;--font-mono:"Geist Mono","SF Mono",Menlo,Consolas,ui-monospace,monospace}
    .passive-step{width:960px;max-width:960px;margin:0 auto;padding:18px;background:var(--bg-2);border:1px solid var(--line);border-radius:var(--radius-xl);box-shadow:var(--shadow-2);${state === 'done' ? 'min-height:796px;' : ''}}
    .section-heading{display:flex;align-items:start;justify-content:space-between;gap:16px;margin-bottom:16px}.eyebrow{margin:0 0 8px;color:var(--accent-text);text-transform:uppercase;letter-spacing:.12em;font-size:10px;font-weight:700}.btn{height:32px;padding:0 14px;border-radius:6px;border:1px solid var(--line-strong);background:var(--surface-2);color:var(--text);display:inline-flex;align-items:center;gap:8px;font-size:12.5px;font-weight:500}.btn.primary{background:var(--accent);color:#000;border-color:var(--accent)}
    .clarify-shell{display:grid;gap:14px}.clarify-card{display:grid;gap:14px;min-height:260px;padding:22px;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-lg)}.clarify-card h3{max-width:720px;margin:0;font-size:20px;line-height:1.3;color:var(--text)}.meta{color:var(--text-faint);font-family:var(--font-mono)}
    .evidence-grid{display:flex;flex-direction:column;gap:10px;max-width:880px;margin:0 auto}.ev-row{display:grid;grid-template-columns:26px 1fr auto;gap:12px;align-items:center;width:100%;min-height:54px;padding:12px 16px;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius)}button.ev-row{text-align:left}.ev-status{width:18px;height:18px;display:grid;place-items:center;border-radius:50%;color:var(--text-faint)}.ev-status.done{background:var(--good-bg);color:var(--good)}.ev-title{font-size:13px;font-weight:600;margin-bottom:2px}.ev-sub{font-size:11.5px;color:var(--text-faint);font-family:var(--font-mono)}.ev-actions{display:flex;align-items:center;gap:6px}.tag{display:inline-flex;align-items:center;gap:6px;min-height:22px;padding:0 8px;border-radius:999px;border:1px solid var(--line);font-size:11px;font-weight:600}.tag.ok{background:var(--good-bg);color:var(--good);border-color:rgb(99 210 138 / .3)}
    .inline-warning{margin-top:12px;padding:10px 12px;border:1px solid rgb(246 196 95 / .3);border-radius:var(--radius);background:var(--warn-bg);color:var(--warn)}
  </style>`;
  await page.evaluate(`
    {
      const main = document.querySelector('main');
      if (main !== null) {
        main.innerHTML = ${JSON.stringify(`${fixtureStyles}<section class="passive-step" aria-labelledby="${step}-heading"><div class="section-heading"><div><p class="eyebrow">Step ${stepNumber}</p><h2 id="${step}-heading">${label}</h2></div><button type="button" class="btn primary">${state === 'running' ? 'Running' : `Run ${label}`}</button></div><div class="clarify-shell">${viewOnlyBanner}${body}</div>${modalMarkup}</section>`)};
      }
    }
  `);
};

const visualRepoPath = path.join('/tmp', 'concierge-api');

const ensureVisualRepoArtifacts = async (): Promise<void> => {
  await mkdir(path.join(visualRepoPath, 'contracts'), { recursive: true });
  await writeFile(path.join(visualRepoPath, 'plan.md'), '# Plan Artifact\n\nValidated\n', 'utf8');
  await writeFile(path.join(visualRepoPath, 'research.md'), '# Research Artifact\n\nValidated\n', 'utf8');
  await writeFile(path.join(visualRepoPath, 'tasks.md'), '# Tasks Artifact\n\nValidated\n', 'utf8');
  await writeFile(path.join(visualRepoPath, 'task-detail.md'), '# Task Detail\n\nValidated\n', 'utf8');
  await writeFile(path.join(visualRepoPath, 'spec.md'), '# Spec Artifact\n\nValidated\n', 'utf8');
  await writeFile(path.join(visualRepoPath, 'contracts', 'artifact-read.md'), '# Contract Artifact\n\nValidated\n', 'utf8');
};

const renderPassiveShippedState = async (
  page: Page,
  step: keyof typeof passiveArtifacts,
  state: 'idle' | 'running' | 'done',
  modal = false
): Promise<void> => {
  await ensureVisualRepoArtifacts();
  await reachWorkspace(page);
  const repo = {
    id: 'repo-1',
    name: 'concierge-api',
    owner: 'collette-travel',
    path: visualRepoPath,
    defaultBranch: 'main',
    language: 'TypeScript'
  };
  const restoredStates = {
    specify: 'complete',
    clarify: 'complete',
    plan: 'complete',
    tasks: step === 'plan' && state !== 'done' ? 'not_available' : 'complete',
    analyze: step === 'analyze' ? 'pending' : 'not_available',
    review: 'not_available'
  };
  await page.evaluate(({ repo, step, state, artifacts, restoredStates }) => {
    const store = (globalThis as unknown as { __CONCIERGE_VISUAL_STORE__?: { dispatch: (action: { type: string; payload?: unknown }) => unknown } }).__CONCIERGE_VISUAL_STORE__;
    if (store === undefined) return;
    store.dispatch({ type: 'workspace/workspaceEntered', payload: { repo, branch: 'spec/0009-review-evidence', restoredStates } });
    store.dispatch({ type: 'workspace/workspaceStepViewed', payload: step });
    if (state === 'running') {
      store.dispatch({ type: 'session/passiveStepRunStarted', payload: { step, sessionId: `${step}-visual` } });
    }
    if (state === 'done') {
      store.dispatch({
        type: 'session/passiveStepRunSucceeded',
        payload: {
          step,
          commitSha: 'abc123',
          artifacts: artifacts.map((artifactPath: string) => ({
            path: artifactPath,
            kind: artifactPath.endsWith('.md') ? 'markdown' : 'text',
            required: !artifactPath.startsWith('contracts/')
          })),
          milestones: [
            { id: `${step}-lifecycle`, label: 'Lifecycle hooks completed', status: 'complete' },
            { id: `${step}-artifacts`, label: 'Artifact manifest validated', status: 'complete' }
          ]
        }
      });
    }
  }, { repo, step, state, artifacts: passiveArtifacts[step], restoredStates });
  await page.getByRole('heading', { name: new RegExp(step, 'i') }).first().waitFor({ timeout: 5_000 });
  if (modal && state === 'done') {
    await page.locator('.evidence-grid .ev-row').first().click();
  }
};

const renderReviewState = async (
  page: Page,
  state: 'idle' | 'populated' | 'read-only-dim' | 'resume-bounce' | 'task-modal'
): Promise<void> => {
  await reachWorkspace(page);
  const dimBanner = state === 'read-only-dim'
    ? '<div class="inline-warning view-only-banner" role="status"><span>This step is committed, view only.</span><button type="button" class="btn ghost">Resume Review</button></div>'
    : '';
  const taskModal = state === 'task-modal'
    ? '<div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="Task details"><div class="modal"><div class="modal-header"><h3>Task details</h3><button type="button" class="icon-btn" aria-label="Close task details">x</button></div><div class="task-viewer"><div class="task-row"><strong>T001</strong><span>Build review:evidence aggregator</span><span class="meta">src/main/domain/reviewEvidence.ts</span></div></div></div></div>'
    : '';
  const populated = state === 'idle'
    ? '<p class="meta">No Analyze proof is available yet.</p>'
    : '<div class="evidence-list"><button type="button" class="evidence-row"><span>▣</span><span><strong>spec.md</strong><small>specify · required · abc1234</small></span></button><button type="button" class="evidence-row"><span>▣</span><span><strong>contracts/review-evidence-ipc.md</strong><small>plan · optional · def5678</small></span></button><button type="button" class="evidence-row"><span>▣</span><span><strong>tasks.md</strong><small>tasks · required · fed9876</small></span></button></div>';
  const resume = state === 'resume-bounce'
    ? '<div class="inline-warning" role="status"><span>This step is committed, view only.</span><button type="button" class="btn ghost">Resume Tasks</button></div>'
    : '';
  const fixtureStyles = '<style>.review-step{max-width:960px;margin:0 auto;padding:18px;background:#141b1f;border:1px solid #2a373d;border-radius:14px;color:#f4f7f8;font-family:Arial,sans-serif}.section-heading{display:flex;align-items:start;justify-content:space-between;gap:16px;margin-bottom:16px}.eyebrow{margin:0 0 14px;color:#9ed7ff;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}h2{margin:0;font-size:22px}.status-chip{font-size:13px}.review-grid{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(260px,.8fr);gap:14px}.review-panel{display:grid;align-content:start;gap:10px;min-height:140px;padding:14px;background:#11181c;border:1px solid #2a373d;border-radius:10px}.panel-heading{display:flex;justify-content:space-between;align-items:center}.panel-heading h3{margin:0;font-size:14px}.panel-heading span,.meta,small{color:#8e9da4;font-family:monospace;font-size:11.5px}.evidence-list{display:grid;gap:8px}.evidence-row{display:grid;grid-template-columns:22px 1fr;gap:10px;align-items:start;min-height:48px;padding:10px 12px;text-align:left;color:#f4f7f8;background:#0c1114;border:1px solid #2a373d;border-radius:8px}.evidence-row strong,.clarification-row strong{display:block;font-size:12.5px}.evidence-row small,.clarification-row small{display:block;margin-top:3px}.clarification-row{display:grid;gap:4px;padding:10px 0;border-top:1px solid #2a373d}.clarification-row p{margin:0;color:#c6d0d4;font-size:12.5px}.inline-warning{display:flex;justify-content:space-between;align-items:center;margin:0 0 14px;padding:10px 12px;border:1px solid rgba(246,196,95,.3);border-radius:8px;background:#241f14;color:#f6c45f}.btn{padding:8px 12px;border:1px solid #3a4a51;border-radius:8px;background:#11181c;color:#f4f7f8}.modal-backdrop{position:fixed;inset:0;display:grid;place-items:center;background:rgba(0,0,0,.45)}.modal{width:520px;max-height:520px;padding:16px;background:#141b1f;border:1px solid #2a373d;border-radius:12px}.modal-header{display:flex;justify-content:space-between;align-items:center}.icon-btn{width:32px;height:32px;border:1px solid #3a4a51;border-radius:8px;background:#11181c;color:#f4f7f8}.task-row{display:grid;grid-template-columns:64px 1fr;gap:8px 12px;padding:10px 12px;border:1px solid #2a373d;border-radius:8px;background:#11181c}</style>';
  await page.evaluate(`
    {
      const main = document.querySelector('main');
      if (main !== null) {
        main.innerHTML = ${JSON.stringify(`${fixtureStyles}<section class="review-step" aria-labelledby="review-heading"><div class="section-heading"><div><p class="eyebrow">Step 6</p><h2 id="review-heading">Review</h2></div><span class="status-chip">Inspection</span></div>${dimBanner}${resume}<div class="review-grid"><section class="review-panel" aria-label="Pipeline evidence"><div class="panel-heading"><h3>Evidence</h3><span>${state === 'idle' ? 0 : 3} artifacts</span></div>${populated}</section><section class="review-panel" aria-label="Clarifications"><div class="panel-heading"><h3>Clarifications</h3><span>2</span></div><div class="clarification-row"><small>2026-05-30</small><strong>Evidence source?</strong><p>Disk only.</p></div></section><section class="review-panel" aria-label="Analyze report"><div class="panel-heading"><h3>Analyze</h3><span>captured</span></div><p class="meta">Analyze ran, no issues found.</p></section><section class="review-panel" aria-label="Tasks"><div class="panel-heading"><h3>Tasks</h3><button type="button" class="btn ghost">Open</button></div></section></div>${taskModal}</section>`)};
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
  { name: 'plan-passive-idle', designPath: 'design/v3-fetch/project/steps.jsx', designSetup: (page) => renderPassiveState(page, 'plan', 'idle'), shippedSetup: (page) => renderPassiveShippedState(page, 'plan', 'idle'), masks: [bodyTextMask, scrollbarMask] },
  { name: 'plan-passive-running', designPath: 'design/v3-fetch/project/steps.jsx', designSetup: (page) => renderPassiveState(page, 'plan', 'running'), shippedSetup: (page) => renderPassiveShippedState(page, 'plan', 'running'), masks: [bodyTextMask, timestampMask, scrollbarMask] },
  { name: 'plan-passive-done', designPath: 'design/v3-fetch/project/steps.jsx', designSetup: (page) => renderPassiveState(page, 'plan', 'done'), shippedSetup: (page) => renderPassiveShippedState(page, 'plan', 'done'), masks: [bodyTextMask, timestampMask, scrollbarMask] },
  { name: 'tasks-passive-idle', designPath: 'design/v3-fetch/project/steps.jsx', designSetup: (page) => renderPassiveState(page, 'tasks', 'idle'), shippedSetup: (page) => renderPassiveShippedState(page, 'tasks', 'idle'), masks: [bodyTextMask, scrollbarMask] },
  { name: 'tasks-passive-running', designPath: 'design/v3-fetch/project/steps.jsx', designSetup: (page) => renderPassiveState(page, 'tasks', 'running'), shippedSetup: (page) => renderPassiveShippedState(page, 'tasks', 'running'), masks: [bodyTextMask, timestampMask, scrollbarMask] },
  { name: 'tasks-passive-done', designPath: 'design/v3-fetch/project/steps.jsx', designSetup: (page) => renderPassiveState(page, 'tasks', 'done'), shippedSetup: (page) => renderPassiveShippedState(page, 'tasks', 'done'), masks: [bodyTextMask, timestampMask, scrollbarMask] },
  { name: 'analyze-passive-idle', designPath: 'design/v3-fetch/project/steps.jsx', designSetup: (page) => renderPassiveState(page, 'analyze', 'idle'), shippedSetup: (page) => renderPassiveShippedState(page, 'analyze', 'idle'), masks: [bodyTextMask, scrollbarMask] },
  { name: 'analyze-passive-running', designPath: 'design/v3-fetch/project/steps.jsx', designSetup: (page) => renderPassiveState(page, 'analyze', 'running'), shippedSetup: (page) => renderPassiveShippedState(page, 'analyze', 'running'), masks: [bodyTextMask, timestampMask, scrollbarMask] },
  { name: 'analyze-passive-done', designPath: 'design/v3-fetch/project/steps.jsx', designSetup: (page) => renderPassiveState(page, 'analyze', 'done'), shippedSetup: (page) => renderPassiveShippedState(page, 'analyze', 'done'), masks: [bodyTextMask, timestampMask, scrollbarMask] },
  { name: 'passive-artifact-modal', designPath: 'design/v3-fetch/project/steps.jsx', designSetup: (page) => renderPassiveState(page, 'plan', 'done', true), shippedSetup: (page) => renderPassiveShippedState(page, 'plan', 'done', true), masks: [bodyTextMask, timestampMask, scrollbarMask] },
  { name: 'review-idle', designPath: 'design/v3-fetch/project/steps.jsx', designSetup: (page) => renderReviewState(page, 'idle'), shippedSetup: (page) => renderReviewState(page, 'idle'), masks: [bodyTextMask, scrollbarMask] },
  { name: 'review-populated', designPath: 'design/v3-fetch/project/steps.jsx', designSetup: (page) => renderReviewState(page, 'populated'), shippedSetup: (page) => renderReviewState(page, 'populated'), masks: [bodyTextMask, scrollbarMask] },
  { name: 'review-read-only-dim', designPath: 'design/v3-fetch/project/steps.jsx', designSetup: (page) => renderReviewState(page, 'read-only-dim'), shippedSetup: (page) => renderReviewState(page, 'read-only-dim'), masks: [bodyTextMask, scrollbarMask] },
  { name: 'review-resume-bounce', designPath: 'design/v3-fetch/project/steps.jsx', designSetup: (page) => renderReviewState(page, 'resume-bounce'), shippedSetup: (page) => renderReviewState(page, 'resume-bounce'), masks: [bodyTextMask, scrollbarMask] },
  { name: 'review-task-modal', designPath: 'design/v3-fetch/project/steps.jsx', designSetup: (page) => renderReviewState(page, 'task-modal'), shippedSetup: (page) => renderReviewState(page, 'task-modal'), masks: [bodyTextMask, scrollbarMask] },
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
