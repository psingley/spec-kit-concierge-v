import type { VisualDiffContract } from '../contract/generateContract';

export type CapturedElementState = {
  text: string;
  headings: Array<{ level: number; text: string }>;
  controls: Array<{ role: string; name: string; count: number }>;
  markers: string[];
};

export type VerificationFailure = {
  layer: 'elements' | 'structure' | 'styles' | 'pixels';
  message: string;
  expected?: string;
  actual?: string;
};

export const verifyRequiredElements = (contract: VisualDiffContract, actual: CapturedElementState): VerificationFailure[] => {
  const failures: VerificationFailure[] = [];

  for (const required of contract.required.texts) {
    if (!actual.text.includes(required.value)) {
      failures.push({ layer: 'elements', message: `missing text: expected '${required.value}'`, expected: required.value, actual: 'missing' });
    }
  }

  for (const expected of contract.required.headings) {
    const matching = actual.headings.find((heading) => heading.level === expected.level);
    if (!matching) {
      failures.push({ layer: 'elements', message: `missing heading level ${expected.level}: expected '${expected.text}'`, expected: expected.text, actual: 'missing' });
    } else if (matching.text !== expected.text) {
      failures.push({
        layer: 'elements',
        message: `wrong heading level ${expected.level}: expected '${expected.text}', got '${matching.text}'`,
        expected: expected.text,
        actual: matching.text
      });
    }
  }

  for (const expected of contract.required.controls) {
    const actualControl = actual.controls.find((control) => control.role === expected.role && control.name === expected.name);
    const count = actualControl?.count ?? 0;
    if (count !== expected.count) {
      failures.push({
        layer: 'elements',
        message: `wrong control count: expected ${expected.role} '${expected.name}' x${expected.count}, got ${count}`,
        expected: `${expected.count}`,
        actual: `${count}`
      });
    }
  }

  for (const marker of contract.required.visualMarkers) {
    if (!actual.markers.includes(marker.name)) {
      failures.push({
        layer: 'elements',
        message: `missing visual marker: expected '${marker.name}' at ${marker.selector}`,
        expected: marker.selector,
        actual: 'missing'
      });
    }
  }

  return failures;
};
