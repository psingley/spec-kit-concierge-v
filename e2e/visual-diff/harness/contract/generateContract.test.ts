import { describe, expect, it } from 'vitest';
import { extractContractFromSource, parseCommentedJson } from './generateContract';

describe('visual-diff contract generation', () => {
  it('extracts visible strings, buttons, headings, and visual markers from JSX', () => {
    const contract = extractContractFromSource(
      'sample-screen',
      'design/v3-fetch/project/sample.jsx',
      `
        function Screen() {
          return <section className="signin-card">
            <div className="signin-mark"><span className="dot" /></div>
            <h1>Spec-kit Concierge</h1>
            <p>Connect repos with confidence.</p>
            <button className="btn primary">Sign in</button>
          </section>;
        }
      `
    );

    expect(contract.required.texts.map((entry) => entry.value)).toContain('Connect repos with confidence.');
    expect(contract.required.headings).toContainEqual({ level: 1, text: 'Spec-kit Concierge' });
    expect(contract.required.controls).toContainEqual({ role: 'button', name: 'Sign in', count: 1 });
    expect(contract.required.visualMarkers).toContainEqual({
      name: 'signin-mark',
      selector: '[data-vd-role="signin-mark"]',
      designSelector: '.signin-mark'
    });
  });

  it('parses markdown-flavored JSON comments used in reviewed contracts', () => {
    expect(parseCommentedJson('{\n  // reviewed marker\n  "name": "signin-fresh"\n}')).toEqual({ name: 'signin-fresh' });
  });
});
