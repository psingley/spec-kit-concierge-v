import { _electron as electron, chromium, type Browser, type ElectronApplication, type Page } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRun6BoundaryFixture } from '../../../support/boundaries';
import { loadContract } from '../contract/loadContract';
import { screenshotElementOrPage } from '../capture/screenshot';
import { snapshotAom } from '../capture/snapshotAom';
import { snapshotDom } from '../capture/snapshotDom';
import { snapshotStyles } from '../capture/snapshotStyles';
import { actualDir, designHtmlPath, referencesDir, viewport } from '../paths';
import type { VisualDiffScreen } from '../screens.config';

export type CaptureStep = 'design' | 'shipped';

export type DevSessionPhase = 'cold' | 'design-ready' | 'warm' | 'restart-electron';

export type DevSessionState = {
  phase: DevSessionPhase;
  designReady: boolean;
  shippedReady: boolean;
  lastFailure?: {
    step: CaptureStep;
    message: string;
  };
};

export const createInitialDevSessionState = (): DevSessionState => ({
  phase: 'cold',
  designReady: false,
  shippedReady: false
});

export const markCaptureSuccess = (state: DevSessionState, step: CaptureStep): DevSessionState => {
  const next = {
    ...state,
    designReady: state.designReady || step === 'design',
    shippedReady: state.shippedReady || step === 'shipped',
    lastFailure: undefined
  };
  return {
    ...next,
    phase: next.designReady && next.shippedReady ? 'warm' : next.designReady ? 'design-ready' : 'cold'
  };
};

export const markCaptureFailure = (state: DevSessionState, step: CaptureStep, error: unknown): DevSessionState => ({
  ...state,
  phase: step === 'shipped' ? 'restart-electron' : 'cold',
  shippedReady: step === 'shipped' ? false : state.shippedReady,
  lastFailure: {
    step,
    message: error instanceof Error ? error.message : String(error)
  }
});

export const shouldRestartElectron = (state: DevSessionState): boolean => state.phase === 'restart-electron';

const contentTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jsx': 'text/babel; charset=utf-8'
};

const withTimeout = async <T>(label: string, ms: number, work: () => Promise<T>): Promise<T> => {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      work(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      })
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};

export const startDesignServer = async (): Promise<{ url: string; close: () => Promise<void> }> => {
  const designDir = path.dirname(designHtmlPath);
  const server: Server = createServer(async (request, response) => {
    try {
      const requestPath = decodeURIComponent(new URL(request.url ?? '/', 'http://127.0.0.1').pathname);
      const normalizedPath = path.normalize(requestPath === '/' ? '/Spec-kit Concierge.html' : requestPath);
      const filePath = path.join(designDir, normalizedPath);
      if (!filePath.startsWith(designDir)) return void response.writeHead(403).end('Forbidden');
      response.writeHead(200, { 'content-type': contentTypes[path.extname(filePath)] ?? 'application/octet-stream' });
      response.end(await readFile(filePath));
    } catch {
      response.writeHead(404).end('Not found');
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (typeof address === 'string' || address === null) throw new Error('Failed to start design fixture server.');
  return {
    url: `http://127.0.0.1:${address.port}/Spec-kit%20Concierge.html`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve()))
  };
};

export const runCommand = async (command: string, args: string[]): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { cwd: process.cwd(), stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited ${code}`));
    });
  });
};

const newestSourceTime = async (dir: string): Promise<number> => {
  const entries = await import('node:fs/promises').then((fs) => fs.readdir(dir, { withFileTypes: true }).catch(() => []));
  const times = await Promise.all(entries.map(async (entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return newestSourceTime(file);
    return (await stat(file)).mtimeMs;
  }));
  return Math.max(0, ...times);
};

const draftNowByScreen: Record<string, string> = {
  'specify-running': String(Number.parseInt('rpg3', 36)),
  'specify-complete': String(Number.parseInt('rr6q', 36)),
  'activity-rail-busy': String(Number.parseInt('rwgq', 36)),
  'activity-pill-busy': String(Number.parseInt('rwgq', 36))
};

const specifyDelayByScreen = (screenName?: string): string | undefined =>
  screenName === 'specify-running' || screenName === 'activity-rail-busy' || screenName === 'activity-pill-busy'
    ? '2000'
    : undefined;

export const ensureElectronBuild = async (): Promise<void> => {
  const mainBuild = path.join(process.cwd(), '.vite/build/main.js');
  const buildTime = await stat(mainBuild).then((stats) => stats.mtimeMs).catch(() => 0);
  const sourceTime = Math.max(
    await newestSourceTime(path.join(process.cwd(), 'src/main')),
    await newestSourceTime(path.join(process.cwd(), 'src/preload')),
    await newestSourceTime(path.join(process.cwd(), 'src/renderer')),
    await stat(path.join(process.cwd(), 'vite.main.config.ts')).then((stats) => stats.mtimeMs),
    await stat(path.join(process.cwd(), 'vite.preload.config.ts')).then((stats) => stats.mtimeMs),
    await stat(path.join(process.cwd(), 'vite.renderer.config.ts')).then((stats) => stats.mtimeMs)
  );
  if (buildTime >= sourceTime) return;
  await runCommand('npm', ['run', 'e2e', '--', '--list']);
};

export class DevCaptureSession {
  private browser?: Browser;
  private electronApp?: ElectronApplication;
  private shippedPage?: Page;
  private server?: { url: string; close: () => Promise<void> };
  private shippedEnvKey = '';
  private state: DevSessionState = createInitialDevSessionState();

  getState(): DevSessionState {
    return this.state;
  }

  async start(): Promise<void> {
    this.server = await startDesignServer();
    this.browser = await chromium.launch();
    await this.restartElectron();
  }

  async close(): Promise<void> {
    await this.electronApp?.close().catch(() => undefined);
    await this.browser?.close().catch(() => undefined);
    await this.server?.close().catch(() => undefined);
  }

  async captureDesign(screen: VisualDiffScreen): Promise<void> {
    await withTimeout(`design capture ${screen.name}`, 90_000, async () => {
      if (!this.browser || !this.server) throw new Error('Dev session has not started.');
      const contract = await loadContract(screen.name);
      const dir = path.join(referencesDir, screen.name);
      await mkdir(dir, { recursive: true });
      const page = await this.browser.newPage({ viewport });
      try {
        await page.goto(this.server.url);
        await page.waitForLoadState('networkidle');
        await screen.designSetup?.(page);
        await page.waitForTimeout(250);
        await screenshotElementOrPage(page, contract.primaryRegion.designSelector, path.join(dir, 'design.png'));
        await writeFile(path.join(dir, 'design.dom.json'), JSON.stringify(await snapshotDom(page, contract.primaryRegion.designSelector), null, 2));
        await writeFile(path.join(dir, 'design.aom.json'), JSON.stringify(await snapshotAom(page, contract.primaryRegion.designSelector), null, 2));
        await writeFile(path.join(dir, 'design.styles.json'), JSON.stringify(await snapshotStyles(page, contract.styleSamples, 'design'), null, 2));
      } finally {
        await page.close().catch(() => undefined);
      }
    });
    this.state = markCaptureSuccess(this.state, 'design');
  }

  async captureShipped(screen: VisualDiffScreen): Promise<void> {
    await this.captureShippedWithFallback(screen, false);
  }

  private async captureShippedWithFallback(screen: VisualDiffScreen, alreadyRetried: boolean): Promise<void> {
    try {
      await withTimeout(`shipped capture ${screen.name}`, 90_000, async () => {
        const contract = await loadContract(screen.name);
        const page = await this.getHealthyShippedPage(screen.name);
        const dir = path.join(actualDir, screen.name);
        await mkdir(dir, { recursive: true });
        await screen.shippedSetup?.(page);
        await page.waitForTimeout(250);
        await screenshotElementOrPage(page, contract.primaryRegion.shippedSelector, path.join(dir, 'shipped.png'));
        await writeFile(path.join(dir, 'shipped.dom.json'), JSON.stringify(await snapshotDom(page, contract.primaryRegion.shippedSelector), null, 2));
        await writeFile(path.join(dir, 'shipped.aom.json'), JSON.stringify(await snapshotAom(page, contract.primaryRegion.shippedSelector), null, 2));
        await writeFile(path.join(dir, 'shipped.styles.json'), JSON.stringify(await snapshotStyles(page, contract.styleSamples, 'shipped'), null, 2));
      });
      this.state = markCaptureSuccess(this.state, 'shipped');
    } catch (error) {
      this.state = markCaptureFailure(this.state, 'shipped', error);
      if (alreadyRetried) throw error;
      await this.restartElectron(screen.name);
      await this.captureShippedWithFallback(screen, true);
    }
  }

  private async getHealthyShippedPage(screenName?: string): Promise<Page> {
    const envKey = `${draftNowByScreen[screenName ?? ''] ?? ''}:${specifyDelayByScreen(screenName) ?? ''}`;
    if (this.shippedEnvKey !== envKey) await this.restartElectron(screenName);
    if (!this.shippedPage || this.shippedPage.isClosed()) await this.restartElectron(screenName);
    if (!this.shippedPage) throw new Error('Electron page is unavailable.');
    await this.shippedPage.locator('body').waitFor({ timeout: 5_000 });
    return this.shippedPage;
  }

  private async restartElectron(screenName?: string): Promise<void> {
    await this.electronApp?.close().catch(() => undefined);
    const fixture = await createRun6BoundaryFixture();
    this.shippedEnvKey = `${draftNowByScreen[screenName ?? ''] ?? ''}:${specifyDelayByScreen(screenName) ?? ''}`;
    this.electronApp = await electron.launch({
      args: [path.join(process.cwd(), '.vite/build/main.js')],
      env: {
        ...process.env,
        CONCIERGE_TEST_GH_ADAPTER: fixture.ghAdapterPath,
        CONCIERGE_TEST_REPOS_ADAPTER: fixture.reposAdapterPath,
        CONCIERGE_TEST_COPILOT_ADAPTER: fixture.copilotAdapterPath,
        CONCIERGE_TEST_ACP_ADAPTER: fixture.acpAdapterPath,
        CONCIERGE_TEST_ENSURE_LOCAL_ADAPTER: fixture.ensureLocalAdapterPath,
        CONCIERGE_TEST_DRAFT_NOW: draftNowByScreen[screenName ?? ''] ?? '',
        CONCIERGE_TEST_ACP_PROMPT_DELAY_MS: specifyDelayByScreen(screenName) ?? ''
      }
    });
    this.shippedPage = await this.electronApp.firstWindow();
    await this.shippedPage.setViewportSize(viewport);
    await this.shippedPage.waitForLoadState('domcontentloaded');
  }
}
