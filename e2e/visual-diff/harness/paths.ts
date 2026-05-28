import path from 'node:path';

export const repoRoot = process.cwd();
export const viewport = { width: 1280, height: 720 };
export const designHtmlPath = path.join(repoRoot, 'design', 'v3-fetch', 'project', 'Spec-kit Concierge.html');
export const screenshotRoot = path.join(repoRoot, 'e2e', 'visual-diff', 'screenshots');
export const designScreenshotDir = path.join(screenshotRoot, 'design');
export const shippedScreenshotDir = path.join(screenshotRoot, 'shipped');
export const diffScreenshotDir = path.join(screenshotRoot, 'diff');
export const visualDiffDir = path.join(repoRoot, 'specs', '0006-5-design-fidelity', 'visual-diff');
export const resultsPath = path.join(visualDiffDir, 'visual-diff-results.json');
