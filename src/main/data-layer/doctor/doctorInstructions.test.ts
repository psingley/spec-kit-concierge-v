import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const instructionsPath = path.join(process.cwd(), '.github', 'agents', 'speckit.doctor.agent.md');

describe('speckit doctor instructions', () => {
  it('states the bounded authority contract and approved tool limits', async () => {
    const text = await readFile(instructionsPath, 'utf8');

    expect(text).toContain('exactly 12 approved tools');
    expect(text).toContain('six read-only tools');
    expect(text).toContain('six guarded tools');
    expect(text).toContain('maximum two attempts per step');
    expect(text).toContain('MUST NOT mark a step complete');
    expect(text).toContain('MUST NOT write Concierge-Step trailers');
    expect(text).toContain('MUST NOT run raw git commands');
    expect(text).toContain('MUST NOT read or write raw files outside the approved tools');
    expect(text).toContain('Ambiguity escalates to the human');
  });
});
