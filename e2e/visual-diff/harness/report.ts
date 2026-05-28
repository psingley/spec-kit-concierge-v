import { readFile } from 'node:fs/promises';
import { resultsPath } from './paths';
import { writeMarkdownReport } from './report/writeMarkdownReport';
import type { VisualDiffReport } from './report/writeJsonReport';

const report = JSON.parse(await readFile(resultsPath, 'utf8')) as VisualDiffReport;
await writeMarkdownReport(report);
console.log(`wrote visual diff report: ${report.summary.pass}/${report.summary.total} PASS`);
