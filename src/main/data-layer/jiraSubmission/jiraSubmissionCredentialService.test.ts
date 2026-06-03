import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createJiraSubmissionCredentialService, type SafeStorageAdapter } from './jiraSubmissionCredentialService';

const response = (body: unknown, init: { status?: number } = {}): Response =>
  new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json' }
  });

const createSafeStorage = (overrides: Partial<SafeStorageAdapter> = {}): SafeStorageAdapter => ({
  isEncryptionAvailable: () => true,
  getSelectedStorageBackend: () => 'unknown',
  encryptStringAsync: async (plainText) => Buffer.from(`cipher:${plainText}`, 'utf8'),
  decryptStringAsync: async (cipherText) => cipherText.toString('utf8').replace(/^cipher:/, ''),
  ...overrides
});

describe('jiraSubmissionCredentialService', () => {
  it('refuses to persist when secure storage is unavailable or basic_text-backed', async () => {
    const userDataPath = await mkdtemp(path.join(os.tmpdir(), 'jira-credential-'));
    const fetch = vi.fn<typeof globalThis.fetch>();

    await expect(createJiraSubmissionCredentialService({
      userDataPath,
      safeStorage: createSafeStorage({ isEncryptionAvailable: () => false }),
      fetch
    }).saveCredential({ email: 'person@example.com', token: 'secret-token', baseUrl: 'https://example.atlassian.net' }))
      .rejects.toThrow('secure storage unavailable');

    await expect(createJiraSubmissionCredentialService({
      userDataPath,
      safeStorage: createSafeStorage({ getSelectedStorageBackend: () => 'basic_text' }),
      fetch
    }).saveCredential({ email: 'person@example.com', token: 'secret-token', baseUrl: 'https://example.atlassian.net' }))
      .rejects.toThrow('secure storage unavailable');

    expect(fetch).not.toHaveBeenCalled();
  });

  it('validates with /myself, persists encrypted metadata, loads in main only, and reports warm auth state without token', async () => {
    const userDataPath = await mkdtemp(path.join(os.tmpdir(), 'jira-credential-'));
    const fetch = vi.fn<typeof globalThis.fetch>()
      .mockImplementation(async () => response({ accountId: 'acct-1', displayName: 'Pat User', emailAddress: 'person@example.com' }));
    const service = createJiraSubmissionCredentialService({ userDataPath, safeStorage: createSafeStorage(), fetch });

    const saved = await service.saveCredential({
      email: 'person@example.com',
      token: 'secret-token',
      baseUrl: 'https://example.atlassian.net/',
      expiryDate: '2026-12-31'
    });

    expect(saved).toEqual({
      ok: true,
      authState: {
        state: 'warm',
        displayName: 'Pat User',
        emailAddress: 'person@example.com',
        accountId: 'acct-1',
        expiryDate: '2026-12-31',
        baseUrl: 'https://example.atlassian.net'
      }
    });
    expect(JSON.stringify(saved)).not.toContain('secret-token');
    expect(fetch.mock.calls[0]![0]).toBe('https://example.atlassian.net/rest/api/3/myself');
    expect(fetch.mock.calls[0]![1]!.headers).toMatchObject({
      Authorization: `Basic ${Buffer.from('person@example.com:secret-token').toString('base64')}`
    });
    const encrypted = await readFile(path.join(userDataPath, 'jira-credential.enc'), 'utf8');
    expect(encrypted).not.toContain('secret-token');

    await expect(service.loadCredential()).resolves.toMatchObject({
      email: 'person@example.com',
      token: 'secret-token',
      baseUrl: 'https://example.atlassian.net'
    });
    await expect(service.getAuthState()).resolves.toMatchObject({
      state: 'warm',
      displayName: 'Pat User',
      accountId: 'acct-1'
    });
  });

  it('rejects invalid credentials, reports expired on 401 warmth ping, and clears stored credential', async () => {
    const userDataPath = await mkdtemp(path.join(os.tmpdir(), 'jira-credential-'));
    const fetch = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(response({ errorMessages: ['bad'] }, { status: 401 }))
      .mockResolvedValueOnce(response({ accountId: 'acct-1', displayName: 'Pat User' }))
      .mockResolvedValueOnce(response({ errorMessages: ['revoked'] }, { status: 401 }));
    const service = createJiraSubmissionCredentialService({ userDataPath, safeStorage: createSafeStorage(), fetch });

    await expect(service.saveCredential({
      email: 'person@example.com',
      token: 'bad-token',
      baseUrl: 'https://example.atlassian.net'
    })).rejects.toThrow('Jira credential validation failed');
    await expect(service.hasCredential()).resolves.toBe(false);

    await service.saveCredential({
      email: 'person@example.com',
      token: 'secret-token',
      baseUrl: 'https://example.atlassian.net'
    });

    await expect(service.getAuthState()).resolves.toEqual({
      state: 'expired',
      displayName: 'Pat User',
      accountId: 'acct-1',
      baseUrl: 'https://example.atlassian.net'
    });
    await service.clearCredential();
    await expect(service.hasCredential()).resolves.toBe(false);
    await expect(service.getAuthState()).resolves.toEqual({ state: 'none' });
  });
});
