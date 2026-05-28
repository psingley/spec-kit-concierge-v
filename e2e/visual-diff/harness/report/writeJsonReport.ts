import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { artifactResultsDir, resultsPath, viewport } from '../paths';
import type { ScreenVerificationResult } from '../verify/verifyScreen';

export type VisualDiffReport = {
  runId: string;
  viewport: typeof viewport;
  summary: { total: number; pass: number; fail: number; warn: number; worstScreen: string | null };
  screens: ScreenVerificationResult[];
};

export const buildReport = (screens: ScreenVerificationResult[]): VisualDiffReport => {
  const sorted = [...screens].sort((a, b) => b.priorityScore - a.priorityScore);
  return {
    runId: new Date().toISOString(),
    viewport,
    summary: {
      total: screens.length,
      pass: screens.filter((screen) => screen.status === 'PASS').length,
      fail: screens.filter((screen) => screen.status === 'FAIL').length,
      warn: screens.filter((screen) => screen.status === 'WARN').length,
      worstScreen: sorted[0]?.name ?? null
    },
    screens: sorted
  };
};

export const writeJsonReport = async (screens: ScreenVerificationResult[]): Promise<VisualDiffReport> => {
  const report = buildReport(screens);
  await mkdir(artifactResultsDir, { recursive: true });
  await writeFile(resultsPath, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(path.join(process.cwd(), 'specs/0006-5-design-fidelity/visual-diff/visual-diff-results.json'), `${JSON.stringify(report, null, 2)}\n`);
  return report;
};
