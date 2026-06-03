import { describe, expect, it, vi } from 'vitest';
import { resolveJiraSubmissionMechanism } from './jiraMechanismResolver';

const repo = '/repo';
const credential = { email: 'person@example.com', token: 'secret-token', baseUrl: 'https://example.atlassian.net' };

describe('jiraMechanismResolver', () => {
  it('chooses Direct for a warm stored credential even when MCP is also authenticated', async () => {
    const result = await resolveJiraSubmissionMechanism({
      repositoryPath: repo,
      credentialService: {
        loadCredential: vi.fn(async () => credential),
        getAuthState: vi.fn(async () => ({ state: 'warm' as const, accountId: 'acct-1', baseUrl: credential.baseUrl }))
      },
      boardMappingService: { getBoard: vi.fn(async () => ({ projectKey: 'SKC', source: 'user' as const })) },
      checkMcp: vi.fn(async () => ({ state: 'authenticated', tokenFilePresent: true }))
    });

    expect(result).toEqual({ status: 'direct', credential, projectKey: 'SKC', boardSource: 'user' });
  });

  it('halts stored-but-expired credentials without falling back to Delegated', async () => {
    const checkMcp = vi.fn(async () => ({ state: 'authenticated', tokenFilePresent: true }));

    const result = await resolveJiraSubmissionMechanism({
      repositoryPath: repo,
      credentialService: {
        loadCredential: vi.fn(async () => credential),
        getAuthState: vi.fn(async () => ({ state: 'expired' as const, accountId: 'acct-1', baseUrl: credential.baseUrl }))
      },
      boardMappingService: { getBoard: vi.fn(async () => ({ projectKey: 'SKC', source: 'user' as const })) },
      checkMcp
    });

    expect(result).toEqual({ status: 'reauth_required' });
    expect(checkMcp).not.toHaveBeenCalled();
  });

  it('chooses Delegated only when no stored credential and MCP is authenticated', async () => {
    const result = await resolveJiraSubmissionMechanism({
      repositoryPath: repo,
      credentialService: {
        loadCredential: vi.fn(async () => undefined),
        getAuthState: vi.fn(async () => ({ state: 'none' as const }))
      },
      boardMappingService: { getBoard: vi.fn(async () => ({ projectKey: 'SKC', source: 'seed' as const })) },
      checkMcp: vi.fn(async () => ({ state: 'authenticated', tokenFilePresent: true }))
    });

    expect(result).toEqual({ status: 'delegated', projectKey: 'SKC', boardSource: 'seed' });
  });

  it('reports not_configured or board_not_configured before submission can be accepted', async () => {
    await expect(resolveJiraSubmissionMechanism({
      repositoryPath: repo,
      credentialService: {
        loadCredential: vi.fn(async () => undefined),
        getAuthState: vi.fn(async () => ({ state: 'none' as const }))
      },
      boardMappingService: { getBoard: vi.fn(async () => ({ projectKey: undefined, source: 'none' as const })) },
      checkMcp: vi.fn(async () => ({ state: 'configured_needs_auth', tokenFilePresent: false }))
    })).resolves.toEqual({ status: 'not_configured' });

    await expect(resolveJiraSubmissionMechanism({
      repositoryPath: repo,
      credentialService: {
        loadCredential: vi.fn(async () => credential),
        getAuthState: vi.fn(async () => ({ state: 'warm' as const, accountId: 'acct-1', baseUrl: credential.baseUrl }))
      },
      boardMappingService: { getBoard: vi.fn(async () => ({ projectKey: undefined, source: 'none' as const })) },
      checkMcp: vi.fn()
    })).resolves.toEqual({ status: 'board_not_configured', mechanism: 'direct' });
  });
});
