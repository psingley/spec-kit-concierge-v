import path from 'node:path';

export const repoRoot = process.cwd();
export const viewport = { width: 1280, height: 720 };
export const designHtmlPath = path.join(repoRoot, 'design', 'v3-fetch', 'project', 'Spec-kit Concierge.html');
export const screenshotRoot = path.join(repoRoot, 'e2e', 'visual-diff', 'screenshots');
export const designScreenshotDir = path.join(screenshotRoot, 'design');
export const shippedScreenshotDir = path.join(screenshotRoot, 'shipped');
export const diffScreenshotDir = path.join(screenshotRoot, 'diff');
export const contractsDir = path.join(repoRoot, 'e2e', 'visual-diff', 'contracts');
export const artifactsRoot = path.join(repoRoot, 'e2e', 'visual-diff', 'artifacts');
export const referencesDir = path.join(artifactsRoot, 'references');
export const actualDir = path.join(artifactsRoot, 'actual');
export const artifactResultsDir = path.join(artifactsRoot, 'results');
export const visualDiffDir = path.join(repoRoot, 'specs', '0006-5-design-fidelity', 'visual-diff');
export const resultsPath = path.join(artifactResultsDir, 'visual-diff-results.json');
export const markdownReportPath = path.join(artifactResultsDir, 'visual-diff-report.md');
