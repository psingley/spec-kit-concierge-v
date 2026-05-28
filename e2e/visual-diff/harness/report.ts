import { readFile, writeFile } from 'node:fs/promises';
import { resultsPath, visualDiffDir } from './paths';

type DiffResult = {
  screen: string;
  diffPercent: number;
  designPath: string;
  shippedPath: string;
  diffPath: string;
};

const results = JSON.parse(await readFile(resultsPath, 'utf8')) as DiffResult[];
const sorted = [...results].sort((a, b) => b.diffPercent - a.diffPercent);
const passing = results.filter((result) => result.diffPercent <= 9);
const lines = [
  '| Screen | Diff % | Gate |',
  '| --- | ---: | --- |',
  ...sorted.map((result) => `| ${result.screen} | ${result.diffPercent.toFixed(2)} | ${result.diffPercent <= 9 ? 'PASS' : 'FAIL'} |`),
  '',
  `Summary: ${passing.length} of ${results.length} screens <= 9%.`,
  `Worst 5: ${sorted.slice(0, 5).map((result) => `${result.screen} ${result.diffPercent.toFixed(2)}%`).join(', ')}`
];

const report = `${lines.join('\n')}\n`;
console.log(report);

const out = process.argv.includes('--write-baseline')
  ? `${visualDiffDir}/iteration-0-baseline.md`
  : process.argv.includes('--write-final')
    ? `${visualDiffDir}/final-report.md`
    : undefined;

if (out) {
  await writeFile(out, `# Visual Diff Report\n\n${report}`, 'utf8');
}
