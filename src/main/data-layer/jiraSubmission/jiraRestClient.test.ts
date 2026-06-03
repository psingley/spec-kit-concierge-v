import { describe, expect, it, vi } from 'vitest';
import { createJiraRestClient } from './jiraRestClient';

const response = (body: unknown, init: { status?: number } = {}): Response =>
  new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json' }
  });

describe('jiraRestClient', () => {
  it('calls /myself with in-memory Basic auth and returns identity metadata', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(response({
      accountId: 'acct-1',
      displayName: 'Pat User',
      emailAddress: 'person@example.com'
    }));
    const client = createJiraRestClient({
      credential: { email: 'person@example.com', token: 'secret-token', baseUrl: 'https://example.atlassian.net/' },
      fetch
    });

    await expect(client.myself()).resolves.toEqual({
      status: 200,
      accountId: 'acct-1',
      displayName: 'Pat User',
      emailAddress: 'person@example.com'
    });
    expect(fetch.mock.calls[0]![0]).toBe('https://example.atlassian.net/rest/api/3/myself');
    expect(fetch.mock.calls[0]![1]!.headers).toMatchObject({
      Authorization: `Basic ${Buffer.from('person@example.com:secret-token').toString('base64')}`
    });
  });

  it('suggests distinct boards from recent activity and treats empty activity as non-error', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(response({
        issues: [
          { fields: { project: { key: 'SKC', name: 'Spec Kit' } } },
          { fields: { project: { key: 'SKC', name: 'Spec Kit' } } },
          { fields: { project: { key: 'OPS', name: 'Ops' } } }
        ]
      }))
      .mockResolvedValueOnce(response({ issues: [] }));
    const client = createJiraRestClient({
      credential: { email: 'person@example.com', token: 'secret-token', baseUrl: 'https://example.atlassian.net' },
      fetch
    });

    await expect(client.suggestBoards()).resolves.toEqual([
      { key: 'SKC', name: 'Spec Kit' },
      { key: 'OPS', name: 'Ops' }
    ]);
    await expect(client.suggestBoards()).resolves.toEqual([]);
    const url = new URL(fetch.mock.calls[0]![0] as string);
    expect(url.pathname).toBe('/rest/api/3/search/jql');
    expect(url.searchParams.get('jql')).toBe('reporter=currentUser() ORDER BY created DESC');
    expect(url.searchParams.get('fields')).toBe('project');
  });

  it('lists projects via paginated /project/search and sanitizes thrown errors', async () => {
    const base64 = Buffer.from('person@example.com:secret-token').toString('base64');
    const fetch = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(response({
        values: [{ key: 'SKC', name: 'Spec Kit' }],
        isLast: false,
        nextPage: 'https://example.atlassian.net/rest/api/3/project/search?startAt=50'
      }))
      .mockResolvedValueOnce(response({ values: [{ key: 'OPS', name: 'Ops' }], isLast: true }))
      .mockImplementation(async () => response({
        errorMessages: [`Authorization: Basic ${base64}`, 'secret-token']
      }, { status: 500 }));
    const client = createJiraRestClient({
      credential: { email: 'person@example.com', token: 'secret-token', baseUrl: 'https://example.atlassian.net' },
      fetch,
      sleep: async () => undefined
    });

    await expect(client.listProjects('sp')).resolves.toEqual([
      { key: 'SKC', name: 'Spec Kit' },
      { key: 'OPS', name: 'Ops' }
    ]);
    await expect(client.listProjects()).rejects.toThrow(/\[REDACTED]/);
    await expect(client.listProjects()).rejects.not.toThrow(/secret-token|Authorization|Basic|cGVyc29u/);
  });
});
