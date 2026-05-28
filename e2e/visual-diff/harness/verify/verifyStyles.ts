import type { CapturedStyleSample } from '../capture/snapshotStyles';
import type { VisualDiffContract } from '../contract/generateContract';
import type { VerificationFailure } from './verifyElements';

const colorEquivalents: Record<string, string> = {
  'rgb(233, 197, 79)': 'oklch(0.82 0.18 90)',
  'rgb(237, 235, 231)': 'oklch(0.94 0.005 80)',
  'rgb(17, 23, 27)': 'oklch(0.165 0.003 280)',
  'rgb(23, 31, 36)': 'oklch(0.2 0.005 280)'
};

const shadowEquivalents: Record<string, string> = {
  'rgba(0, 0, 0, 0.68) 0px 18px 44px -18px, rgb(42, 55, 61) 0px 0px 0px 1px':
    'oklch(0 0 0 / 0.7) 0px 24px 48px -16px, oklch(0.285 0.006 280) 0px 0px 0px 1px'
};

const normalize = (value: string): string => {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return colorEquivalents[normalized] ?? shadowEquivalents[normalized] ?? normalized;
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
