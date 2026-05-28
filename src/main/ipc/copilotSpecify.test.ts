import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('copilot specify IPC boundary', () => {
  it('does not read CONCIERGE_TEST env toggles in the IPC handler', async () => {
    const source = await readFile(path.join(process.cwd(), 'src/main/ipc/copilotSpecify.ts'), 'utf8');

    expect(source).not.toContain('process.env.CONCIERGE_TEST_');
  });
});
