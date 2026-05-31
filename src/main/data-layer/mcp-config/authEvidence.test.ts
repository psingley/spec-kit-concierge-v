import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { findOAuthEvidence } from './authEvidence';
import { ATLASSIAN_AUTHV2_URL } from './parse';

describe('copilot mcp oauth evidence', () => {
  it('requires exact serverUrl match and token companion presence without reading token contents', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'mcp-oauth-'));
    try {
      await writeFile(path.join(dir, 'legacy.json'), JSON.stringify({ serverUrl: 'https://mcp.atlassian.com/v1/mcp' }));
      await writeFile(path.join(dir, 'legacy.tokens.json'), 'not-json-token-file');
      await writeFile(path.join(dir, 'authv2.json'), JSON.stringify({ serverUrl: ATLASSIAN_AUTHV2_URL }));
      await writeFile(path.join(dir, 'authv2.tokens.json'), 'not-json-token-file');

      await expect(findOAuthEvidence(dir, ATLASSIAN_AUTHV2_URL)).resolves.toMatchObject({
        serverUrl: ATLASSIAN_AUTHV2_URL,
        tokenFilePresent: true,
        authenticated: true
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('does not authenticate metadata without a token companion', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'mcp-oauth-'));
    try {
      await writeFile(path.join(dir, 'authv2.json'), JSON.stringify({ serverUrl: ATLASSIAN_AUTHV2_URL }));
      await expect(findOAuthEvidence(dir, ATLASSIAN_AUTHV2_URL)).resolves.toMatchObject({
        tokenFilePresent: false,
        authenticated: false
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
