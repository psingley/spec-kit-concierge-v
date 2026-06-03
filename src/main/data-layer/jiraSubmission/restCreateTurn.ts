import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { markdownToDeterministicAdf } from './adf';
import type { JiraCreateTurn, JiraCreateTurnRequest } from './runner';

export type JiraRestCredential = {
  email: string;
  token: string;
  baseUrl: string;
};

export type CreateRestJiraCreateTurnOptions = {
  credential: JiraRestCredential;
  fetch?: typeof globalThis.fetch;
  now?: () => string;
  sleep?: (milliseconds: number) => Promise<void>;
};

type JiraIssueRead = {
  key: string;
  fields?: {
    summary?: string;
    parent?: { key?: string };
    labels?: string[];
  };
  renderedFields?: {
    description?: string;
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeBaseUrl = (baseUrl: string): string => baseUrl.replace(/\/+$/, '');

const authHeader = (credential: JiraRestCredential): string =>
  `Basic ${Buffer.from(`${credential.email}:${credential.token}`).toString('base64')}`;

const issueUrl = (baseUrl: string, key: string): string =>
  `${normalizeBaseUrl(baseUrl)}/browse/${key}`;

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

const requestJson = async (
  url: string,
  init: RequestInit,
  options: { fetch: typeof globalThis.fetch; sleep: (milliseconds: number) => Promise<void> }
): Promise<{ ok: true; body: unknown; response: Response } | { ok: false; status: number; body: unknown; response: Response }> => {
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
      return { ok: false, status: response.status, body, response };
    } catch (error) {
      if (attempt >= 5) {
        return { ok: false, status: 0, body: { error: error instanceof Error ? error.message : String(error) }, response: new Response(null, { status: 500 }) };
      }
      await options.sleep(100 * 2 ** Math.max(0, attempt - 1));
    }
  }
  return { ok: false, status: 0, body: {}, response: new Response(null, { status: 500 }) };
};

const atomicWriteStateRecord = async (request: JiraCreateTurnRequest, status: string, issueKey: string | null, baseUrl: string, error: unknown): Promise<void> => {
  await mkdir(request.payload.state_dir, { recursive: true });
  const record = {
    idempotency_id: request.node.id,
    status,
    issue_key: issueKey,
    issue_url: issueKey === null ? null : issueUrl(baseUrl, issueKey),
    payload_hash: request.payloadHash,
    idempotency_label: request.idempotencyLabel,
    identity_label: request.identityLabel,
    attempts: 1,
    error: error === null ? null : error
  };
  const finalPath = path.join(request.payload.state_dir, `${request.node.id}.json`);
  const tempPath = `${finalPath}.tmp.${process.pid}.${Date.now()}`;
  await writeFile(tempPath, JSON.stringify(record), 'utf8');
  await rename(tempPath, finalPath);
};

const jiraHeaders = (credential: JiraRestCredential): Record<string, string> => ({
  Authorization: authHeader(credential),
  'Content-Type': 'application/json',
  Accept: 'application/json'
});

const parseIssue = (value: unknown): JiraIssueRead | null => {
  if (!isRecord(value) || typeof value.key !== 'string') return null;
  const fields = isRecord(value.fields) ? value.fields : {};
  const parent = isRecord(fields.parent) ? fields.parent : undefined;
  const renderedFields = isRecord(value.renderedFields) ? value.renderedFields : {};
  return {
    key: value.key,
    fields: {
      summary: typeof fields.summary === 'string' ? fields.summary : undefined,
      parent: parent === undefined ? undefined : { key: typeof parent.key === 'string' ? parent.key : undefined },
      labels: Array.isArray(fields.labels) ? fields.labels.filter((label): label is string => typeof label === 'string') : []
    },
    renderedFields: {
      description: typeof renderedFields.description === 'string' ? renderedFields.description : ''
    }
  };
};

const expectedHeading = (request: JiraCreateTurnRequest): string | null => {
  if (request.node.issueType === 'Epic') return 'Key Outcomes';
  if (request.node.issueType === 'Story') return 'Acceptance Criteria';
  return 'Affected files';
};

const verifyIssue = (request: JiraCreateTurnRequest, issue: JiraIssueRead): string | null => {
  if (issue.fields?.summary !== request.payload.summary) return 'summary_mismatch';
  if (request.payload.parent_key !== null && issue.fields?.parent?.key !== request.payload.parent_key) return 'parent_mismatch';
  if (!issue.fields?.labels?.includes(request.identityLabel)) return 'identity_label_missing';
  const rendered = issue.renderedFields?.description ?? '';
  if (/class=["']error["']/i.test(rendered)) return 'jira_error_macro';
  const heading = expectedHeading(request);
  if (heading !== null && !rendered.toLowerCase().includes(heading.toLowerCase())) return 'description_heading_missing';
  return null;
};

const readBackIssue = async (
  request: JiraCreateTurnRequest,
  key: string,
  credential: JiraRestCredential,
  fetch: typeof globalThis.fetch,
  sleep: (milliseconds: number) => Promise<void>
): Promise<JiraIssueRead | null> => {
  const readUrl = `${normalizeBaseUrl(credential.baseUrl)}/rest/api/3/issue/${encodeURIComponent(key)}?expand=renderedFields`;
  const read = await requestJson(readUrl, { method: 'GET', headers: jiraHeaders(credential) }, { fetch, sleep });
  return read.ok ? parseIssue(read.body) : null;
};

const adoptSingleOrphan = async (
  request: JiraCreateTurnRequest,
  credential: JiraRestCredential,
  fetch: typeof globalThis.fetch,
  sleep: (milliseconds: number) => Promise<void>
): Promise<boolean> => {
  const searchUrl = new URL(`${normalizeBaseUrl(credential.baseUrl)}/rest/api/3/search`);
  searchUrl.searchParams.set('jql', `labels="${request.identityLabel}"`);
  const search = await requestJson(searchUrl.toString(), { method: 'GET', headers: jiraHeaders(credential) }, { fetch, sleep });
  if (!search.ok || !isRecord(search.body) || !Array.isArray(search.body.issues) || search.body.issues.length !== 1) {
    return false;
  }
  const key = isRecord(search.body.issues[0]) && typeof search.body.issues[0].key === 'string'
    ? search.body.issues[0].key
    : null;
  if (key === null) return false;
  const issue = await readBackIssue(request, key, credential, fetch, sleep);
  if (issue === null || verifyIssue(request, issue) !== null) return false;
  await atomicWriteStateRecord(request, 'verified', key, credential.baseUrl, null);
  return true;
};

export const createRestJiraCreateTurn = ({
  credential,
  fetch = globalThis.fetch,
  sleep = async (milliseconds: number) => {
    await new Promise((resolve) => setTimeout(resolve, milliseconds));
  }
}: CreateRestJiraCreateTurnOptions): JiraCreateTurn => async (request) => {
  if (await adoptSingleOrphan(request, credential, fetch, sleep)) {
    return;
  }

  const fields: Record<string, unknown> = {
    project: { key: request.payload.project_key },
    issuetype: { name: request.payload.issue_type },
    summary: request.payload.summary,
    description: markdownToDeterministicAdf(request.payload.description),
    labels: request.payload.labels
  };
  if (request.payload.parent_key !== null) {
    fields.parent = { key: request.payload.parent_key };
  }

  const createUrl = `${normalizeBaseUrl(credential.baseUrl)}/rest/api/3/issue`;
  const create = await requestJson(createUrl, {
    method: 'POST',
    headers: jiraHeaders(credential),
    body: JSON.stringify({ fields })
  }, { fetch, sleep });
  if (!create.ok) {
    await adoptSingleOrphan(request, credential, fetch, sleep);
    await atomicWriteStateRecord(request, 'create_failed', null, credential.baseUrl, create.body);
    return;
  }
  const key = isRecord(create.body) && typeof create.body.key === 'string' ? create.body.key : null;
  if (key === null) {
    await atomicWriteStateRecord(request, 'create_failed', null, credential.baseUrl, { reason: 'missing_issue_key' });
    return;
  }
  const issue = await readBackIssue(request, key, credential, fetch, sleep);
  const mismatch = issue === null ? 'unfetchable_issue_key' : verifyIssue(request, issue);
  if (mismatch !== null) {
    await atomicWriteStateRecord(request, 'verify_mismatch', key, credential.baseUrl, mismatch);
    return;
  }
  await atomicWriteStateRecord(request, 'verified', key, credential.baseUrl, null);
};
