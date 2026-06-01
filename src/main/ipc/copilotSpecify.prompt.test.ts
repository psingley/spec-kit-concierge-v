import { describe, expect, it } from 'vitest';
import { buildSpecifyPrompt } from './copilotSpecify';

describe('buildSpecifyPrompt', () => {
  it('invokes the /speckit.specify slash command carrying the user feature description', () => {
    const prompt = buildSpecifyPrompt('Remove the fake traffic lights from the dashboard');

    expect(prompt.startsWith('/speckit.specify')).toBe(true);
    expect(prompt).toContain('Remove the fake traffic lights from the dashboard');
  });
});
