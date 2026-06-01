import { describe, expect, it } from 'vitest';
import { buildSpecifyPrompt } from './copilotSpecify';

describe('buildSpecifyPrompt', () => {
  it('returns the raw feature description with no slash-command prefix', () => {
    const desc = 'Remove the fake traffic lights from the dashboard';
    const prompt = buildSpecifyPrompt(desc);

    // Agent is pinned via --agent speckit.specify flag; -p receives only the
    // raw user description so it becomes $ARGUMENTS in the agent file.
    expect(prompt).toBe(desc);
    expect(prompt).not.toContain('/speckit.specify');
  });
});
