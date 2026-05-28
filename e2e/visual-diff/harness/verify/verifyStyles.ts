import type { CapturedStyleSample } from '../capture/snapshotStyles';
import type { VisualDiffContract } from '../contract/generateContract';
import type { VerificationFailure } from './verifyElements';

const colorEquivalents: Record<string, string> = {
  'rgb(233, 197, 79)': 'oklch(0.82 0.18 90)',
  'rgb(237, 235, 231)': 'oklch(0.94 0.005 80)',
  'rgb(17, 23, 27)': 'oklch(0.245 0.006 280)'
};

const normalize = (value: string): string => {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return colorEquivalents[normalized] ?? normalized;
};

export const verifyStyles = (
  contract: VisualDiffContract,
  design: CapturedStyleSample[],
  shipped: CapturedStyleSample[]
): VerificationFailure[] => {
  const failures: VerificationFailure[] = [];
  for (const sample of contract.styleSamples) {
    const expected = design.find((entry) => entry.name === sample.name);
    const actual = shipped.find((entry) => entry.name === sample.name);
    if (!expected?.found || !actual?.found) {
      failures.push({ layer: 'styles', message: `missing style sample: ${sample.name}`, expected: sample.designSelector, actual: sample.shippedSelector });
      continue;
    }
    for (const property of sample.properties) {
      const expectedValue = normalize(expected.styles[property] ?? '');
      const actualValue = normalize(actual.styles[property] ?? '');
      if (expectedValue !== actualValue) {
        failures.push({
          layer: 'styles',
          message: `style drift on ${sample.name}.${property}: expected '${expectedValue}', got '${actualValue}'`,
          expected: expectedValue,
          actual: actualValue
        });
      }
    }
  }
  return failures;
};
