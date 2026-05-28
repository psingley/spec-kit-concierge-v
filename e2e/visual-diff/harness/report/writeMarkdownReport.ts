import { writeFile } from 'node:fs/promises';
import { markdownReportPath } from '../paths';
import type { VisualDiffReport } from './writeJsonReport';

export const renderMarkdownReport = (report: VisualDiffReport): string => {
  const lines = [
    '# Visual Diff Report',
    '',
    `Run: ${report.runId}`,
    '',
    `Summary: ${report.summary.pass}/${report.summary.total} PASS, ${report.summary.fail} FAIL, ${report.summary.warn} WARN`,
    '',
    '| Screen | Status | Priority | Pixel residual | Top failures |',
    '| --- | --- | ---: | ---: | --- |'
  ];
  for (const screen of report.screens) {
    const topFailures = screen.failures
      .slice(0, 3)
      .map((failure) => failure.message.replace(/\|/g, '\\|'))
      .join('<br>');
    lines.push(`| ${screen.name} | ${screen.status} | ${screen.priorityScore} | ${screen.pixelResidual}% | ${topFailures || 'None'} |`);
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
};

export const writeMarkdownReport = async (report: VisualDiffReport): Promise<void> => {
  const markdown = renderMarkdownReport(report);
  await writeFile(markdownReportPath, markdown);
  await writeFile(`${process.cwd()}/specs/0006-5-design-fidelity/visual-diff/final-report.md`, markdown);
};
