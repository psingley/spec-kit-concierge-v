import type { JiraRestCredential } from './restCreateTurn';
import { sanitizeForSecrets } from './redaction';

export type JiraIdentity = {
  accountId?: string;
  displayName?: string;
  emailAddress?: string;
};

export type JiraBoardSuggestion = {
  key: string;
  name?: string;
};

export type JiraProject = {
  key: string;
  name?: string;
};

export type JiraRestClient = {
  myself: () => Promise<(JiraIdentity & { status: 200 }) | { status: 401 }>;
  suggestBoards: () => Promise<JiraBoardSuggestion[]>;
  listProjects: (query?: string) => Promise<JiraProject[]>;
};

export type JiraRequestResult =
  | { ok: true; body: unknown; response: Response }
  | { ok: false; status: number; body: unknown; response: Response };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const normalizeBaseUrl = (baseUrl: string): string => baseUrl.replace(/\/+$/, '');

export const jiraAuthHeader = (credential: JiraRestCredential): string =>
  `Basic ${Buffer.from(`${credential.email}:${credential.token}`).toString('base64')}`;

export const jiraHeaders = (credential: JiraRestCredential): Record<string, string> => ({
  Authorization: jiraAuthHeader(credential),
  'Content-Type': 'application/json',
  Accept: 'application/json'
});

const readJson = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  return text.length === 0 ? {} : JSON.parse(text);
};

const retryDelayMs = (response: Response, attempt: number): number => {
  const retryAfter = response.headers.get('Retry-After');
  const seconds = retryAfter === null ? Number.NaN : Number(retryAfter);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  return 100 * 2 ** Math.max(0, attempt - 1);
};

export const requestJson = async (
  url: string,
  init: RequestInit,
  options: { fetch: typeof globalThis.fetch; sleep: (milliseconds: number) => Promise<void>; secrets?: readonly string[] }
): Promise<JiraRequestResult> => {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const response = await options.fetch(url, init);
      const body = await readJson(response);
      if (response.ok) {
        return { ok: true, body, response };
      }
      if (response.status === 429 || response.status >= 500) {
        if (attempt < 5) {
          await options.sleep(retryDelayMs(response, attempt));
          continue;
        }
      }
      return { ok: false, status: response.status, body: sanitizeForSecrets(body, options.secrets), response };
    } catch (error) {
      if (attempt >= 5) {
        return {
          ok: false,
          status: 0,
          body: { error: sanitizeForSecrets(error instanceof Error ? error.message : String(error), options.secrets) },
          response: new Response(null, { status: 500 })
        };
      }
      await options.sleep(100 * 2 ** Math.max(0, attempt - 1));
    }
  }
  return { ok: false, status: 0, body: {}, response: new Response(null, { status: 500 }) };
};

const parseIdentity = (value: unknown): JiraIdentity => {
  if (!isRecord(value)) return {};
  return {
    accountId: typeof value.accountId === 'string' ? value.accountId : undefined,
    displayName: typeof value.displayName === 'string' ? value.displayName : undefined,
    emailAddress: typeof value.emailAddress === 'string' ? value.emailAddress : undefined
  };
};

const parseProjects = (value: unknown): JiraProject[] => {
  if (!isRecord(value) || !Array.isArray(value.values)) return [];
  return value.values.flatMap((candidate) => {
    if (!isRecord(candidate) || typeof candidate.key !== 'string') return [];
    return [{ key: candidate.key, name: typeof candidate.name === 'string' ? candidate.name : undefined }];
  });
};

const throwSanitized = (message: string, body: unknown, secrets: readonly string[]): never => {
  throw new Error(`${message}: ${JSON.stringify(sanitizeForSecrets(body, secrets))}`);
};

export const createJiraRestClient = ({
  credential,
  fetch = globalThis.fetch,
  sleep = async (milliseconds: number) => {
    await new Promise((resolve) => setTimeout(resolve, milliseconds));
  }
}: {
  credential: JiraRestCredential;
  fetch?: typeof globalThis.fetch;
  sleep?: (milliseconds: number) => Promise<void>;
}): JiraRestClient => {
  const secrets = [credential.token, jiraAuthHeader(credential)];
  const request = (url: string, init: RequestInit): Promise<JiraRequestResult> =>
    requestJson(url, init, { fetch, sleep, secrets });

  return {
    myself: async () => {
      const result = await request(`${normalizeBaseUrl(credential.baseUrl)}/rest/api/3/myself`, {
        method: 'GET',
        headers: jiraHeaders(credential)
      });
      if (result.ok) return { status: 200, ...parseIdentity(result.body) };
      if (result.status === 401) return { status: 401 };
      return throwSanitized('Jira /myself failed', result.body, secrets);
    },
    suggestBoards: async () => {
      const url = new URL(`${normalizeBaseUrl(credential.baseUrl)}/rest/api/3/search/jql`);
      url.searchParams.set('jql', 'reporter=currentUser() ORDER BY created DESC');
      url.searchParams.set('fields', 'project');
      const result = await request(url.toString(), { method: 'GET', headers: jiraHeaders(credential) });
      if (!result.ok) throwSanitized('Jira board suggestion failed', result.body, secrets);
      if (!isRecord(result.body) || !Array.isArray(result.body.issues)) return [];
      const boards = new Map<string, JiraBoardSuggestion>();
      for (const issue of result.body.issues) {
        const fields = isRecord(issue) && isRecord(issue.fields) ? issue.fields : {};
        const project = isRecord(fields.project) ? fields.project : {};
        if (typeof project.key !== 'string' || boards.has(project.key)) continue;
        boards.set(project.key, { key: project.key, name: typeof project.name === 'string' ? project.name : undefined });
      }
      return [...boards.values()];
    },
    listProjects: async (query?: string) => {
      const projects: JiraProject[] = [];
      let nextUrl: string | undefined;
      do {
        const url = new URL(nextUrl ?? `${normalizeBaseUrl(credential.baseUrl)}/rest/api/3/project/search`);
        if (nextUrl === undefined) {
          url.searchParams.set('orderBy', 'key');
          if (query !== undefined && query.trim().length > 0) url.searchParams.set('query', query.trim());
        }
        const result = await request(url.toString(), { method: 'GET', headers: jiraHeaders(credential) });
        if (!result.ok) throwSanitized('Jira project search failed', result.body, secrets);
        projects.push(...parseProjects(result.body));
        nextUrl = isRecord(result.body) && typeof result.body.nextPage === 'string' && result.body.isLast !== true
          ? result.body.nextPage
          : undefined;
      } while (nextUrl !== undefined);
      return projects;
    }
  };
};
