import { describe, expect, it } from 'vitest';
import { scoreScreen } from './score';

describe('visual-diff priority scoring', () => {
  it('prioritizes element gates over structural, style, and residual pixel drift', () => {
    expect(
      scoreScreen({
        elementFailures: 2,
        structureFailures: 1,
        styleFailures: 1,
        pixelResidual: 4
      })
    ).toBe(77);
  });
});
