import { describe, expect, it } from 'vitest';
import { markdownToDeterministicAdf } from './adf';

describe('JIRA ADF conversion', () => {
  it('converts node markdown to byte-identical ADF without random localIds or raw bracket tags', () => {
    const markdown = [
      '**Contributes to:** Deterministic Step Completion',
      '',
      'Implement reconciliation in `src/main/domain/reconciliation/sessionReconciler.ts`',
      '',
      '### Done when',
      '',
      '* durable evidence exists -> reconciliation runs -> the step is shown as passed.'
    ].join('\n');

    const first = markdownToDeterministicAdf(markdown);
    const second = markdownToDeterministicAdf(markdown);

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(JSON.stringify(first)).not.toContain('localId');
    expect(JSON.stringify(first)).not.toContain('[US1]');
  });
});
