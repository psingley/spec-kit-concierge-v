import { describe, expect, it } from 'vitest';
import { verifyRequiredElements } from './verifyElements';
import type { VisualDiffContract } from '../contract/generateContract';

const baseContract: VisualDiffContract = {
  name: 'signin-fresh',
  designPath: 'design/v3-fetch/project/signin.jsx',
  primaryRegion: { designSelector: '.signin-card', shippedSelector: '.signin-card' },
  required: {
    texts: [{ value: 'GitHub Copilot CLI' }],
    headings: [{ level: 1, text: 'Spec-kit Concierge' }],
    controls: [{ role: 'button', name: 'Sign in', count: 3 }],
    visualMarkers: [{ name: 'signin-mark', selector: '[data-vd-role="signin-mark"]', designSelector: '.signin-mark' }]
  },
  styleSamples: [],
  pixel: { maxDiffPercent: 4 }
};

describe('required element verification', () => {
  it('reports missing text, missing heading, wrong button count, and missing visual markers', () => {
    const failures = verifyRequiredElements(baseContract, {
      text: 'Connect your tools GitHub CLI Copilot CLI',
      headings: [{ level: 1, text: 'Connect your tools' }],
      controls: [{ role: 'button', name: 'Sign in', count: 1 }],
      markers: []
    });

    expect(failures.map((failure) => failure.message)).toEqual([
      "missing text: expected 'GitHub Copilot CLI'",
      "missing heading level 1: expected 'Spec-kit Concierge'",
      "wrong control count: expected button 'Sign in' x3, got 1",
      "missing visual marker: expected 'signin-mark' at [data-vd-role=\"signin-mark\"]"
    ]);
  });
});
