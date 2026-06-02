import { describe, expect, it } from 'vitest';
import { buildSpecifyPrompt } from './copilotSpecify';

describe('buildSpecifyPrompt', () => {
  it('frames the description as a /speckit.specify invocation', () => {
    const desc = 'Remove the fake traffic lights from the dashboard';
    const prompt = buildSpecifyPrompt(desc);

    // --agent pins the agent file, but the prompt body must also frame the input
    // as a specification to spec (mirroring the interactive "run speckit.specify
    // with this specification: <desc>" invocation). Otherwise an imperative
    // description like "remove the traffic lights" gets implemented, not specced.
    expect(prompt).toContain('/speckit.specify');
    expect(prompt).toContain('specification:');
    expect(prompt.endsWith(desc)).toBe(true);
  });
});
