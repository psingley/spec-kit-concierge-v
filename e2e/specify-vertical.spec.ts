import { expect, test, _electron as electron } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createRun6BoundaryFixture, gitLogLastMessage } from './support/boundaries';

test('fresh user completes Specify with OS-boundary adapters and a real Step Commit trailer', async () => {
  const fixture = await createRun6BoundaryFixture();
  const artifactDir = path.join(process.cwd(), 'e2e', 'artifacts', 'run6-manual-trace');
  const screenshotPath = path.join(artifactDir, 'rendered-spec-md.png');
  const tracePath = path.join(artifactDir, 'trace.zip');
  await mkdir(artifactDir, { recursive: true });
  const electronApp = await electron.launch({
    args: [path.join(process.cwd(), '.vite/build/main.js')],
    env: {
      ...process.env,
      CONCIERGE_TEST_GH_ADAPTER: fixture.ghAdapterPath,
      CONCIERGE_TEST_COPILOT_ADAPTER: fixture.copilotAdapterPath,
      CONCIERGE_TEST_ACP_ADAPTER: fixture.acpAdapterPath
    }
  });

  try {
    const page = await electronApp.firstWindow();
    await electronApp.context().tracing.start({ screenshots: true, snapshots: true });
    await page.waitForLoadState('domcontentloaded');
    const expectNoSeriousA11yViolations = async (): Promise<void> => {
      const results = await new AxeBuilder({ page }).setLegacyMode().withTags(['wcag2a', 'wcag2aa']).analyze();
      expect(results.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')).toEqual([]);
    };
    await expectNoSeriousA11yViolations();

    await page.getByRole('button', { name: /Sign in/i }).first().click();
    await expect(page.getByText(/Signed in as a.kim/i)).toBeVisible();
    await page.getByRole('button', { name: /Sign in/i }).first().click();
    await expect(page.getByRole('heading', { name: /Pick a repository/i })).toBeVisible();

    await expectNoSeriousA11yViolations();
    await page.getByRole('button', { name: new RegExp(fixture.repoName) }).click();
    await page.getByRole('button', { name: /Start a new session/i }).click();

    await expect(page.getByRole('tab', { name: /specify/i })).toContainText('pending');
    await page.getByLabel('Specify prompt').fill('Build a hello-world feature');
    await page.getByRole('button', { name: /Begin Specify/i }).click();
    await expect(page.getByText(/Specify is generating|Preparing Specify|Sending prompt/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('spec-markdown')).toContainText('Hello-world feature', { timeout: 20_000 });
    await page.screenshot({ path: screenshotPath, fullPage: true });
    await expect(page.getByTestId('step-specify')).toContainText('complete');
    await expect(page.getByTestId('step-clarify')).toContainText('pending');
    await expectNoSeriousA11yViolations();

    const log = await gitLogLastMessage(fixture.repoPath);
    expect((log.match(/Concierge-Step: specify:pass/g) ?? []).length).toBe(1);
    await electronApp.context().tracing.stop({ path: tracePath });
    await writeFile(
      path.join(artifactDir, 'manual-run.json'),
      JSON.stringify(
        {
          repoPath: fixture.repoPath,
          repoName: fixture.repoName,
          branchAfterSpecify: await page.getByText(/spec\/draft-[a-z0-9]+/).first().textContent(),
          screenshotPath: 'e2e/artifacts/run6-manual-trace/rendered-spec-md.png',
          tracePath: 'e2e/artifacts/run6-manual-trace/trace.zip',
          gitLogOutput: log
        },
        null,
        2
      ),
      'utf8'
    );
  } finally {
    await electronApp.close();
  }
});
