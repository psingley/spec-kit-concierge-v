import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { markdownToDeterministicAdf } from './adf';
import { jiraHeaders, normalizeBaseUrl, requestJson } from './jiraRestClient';
import { sanitizeForSecrets } from './redaction';
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

const issueUrl = (baseUrl: string, key: string): string =>
  `${normalizeBaseUrl(baseUrl)}/browse/${key}`;

const atomicWriteStateRecord = async (
  request: JiraCreateTurnRequest,
  status: string,
  issueKey: string | null,
  baseUrl: string,
  error: unknown,
  secrets: readonly string[]
): Promise<void> => {
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
    error: error === null ? null : sanitizeForSecrets(error, secrets)
  };
  const finalPath = path.join(request.payload.state_dir, `${request.node.id}.json`);
  const tempPath = `${finalPath}.tmp.${process.pid}.${Date.now()}`;
  await writeFile(tempPath, JSON.stringify(record), 'utf8');
  await rename(tempPath, finalPath);
};

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
  const read = await requestJson(readUrl, { method: 'GET', headers: jiraHeaders(credential) }, { fetch, sleep, secrets: [credential.token] });
  return read.ok ? parseIssue(read.body) : null;
};

const adoptSingleOrphan = async (
  request: JiraCreateTurnRequest,
  credential: JiraRestCredential,
  fetch: typeof globalThis.fetch,
  sleep: (milliseconds: number) => Promise<void>
): Promise<boolean> => {
  const searchUrl = new URL(`${normalizeBaseUrl(credential.baseUrl)}/rest/api/3/search/jql`);
  searchUrl.searchParams.set('jql', `labels="${request.identityLabel}"`);
  searchUrl.searchParams.set('fields', 'key');
  const search = await requestJson(searchUrl.toString(), { method: 'GET', headers: jiraHeaders(credential) }, { fetch, sleep, secrets: [credential.token] });
  if (!search.ok || !isRecord(search.body) || !Array.isArray(search.body.issues) || search.body.issues.length !== 1) {
    return false;
  }
  const key = isRecord(search.body.issues[0]) && typeof search.body.issues[0].key === 'string'
    ? search.body.issues[0].key
    : null;
  if (key === null) return false;
  const issue = await readBackIssue(request, key, credential, fetch, sleep);
  if (issue === null || verifyIssue(request, issue) !== null) return false;
  await atomicWriteStateRecord(request, 'verified', key, credential.baseUrl, null, [credential.token]);
  return true;
};

export const createRestJiraCreateTurn = ({
  credential,
  fetch = globalThis.fetch,
  sleep = async (milliseconds: number) => {
    await new Promise((resolve) => setTimeout(resolve, milliseconds));
  }
}: CreateRestJiraCreateTurnOptions): JiraCreateTurn => async (request) => {
  const secrets = [credential.token];
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
  }, { fetch, sleep, secrets });
  if (!create.ok) {
    await adoptSingleOrphan(request, credential, fetch, sleep);
    await atomicWriteStateRecord(request, 'create_failed', null, credential.baseUrl, create.body, secrets);
    return;
  }
  const key = isRecord(create.body) && typeof create.body.key === 'string' ? create.body.key : null;
  if (key === null) {
    await atomicWriteStateRecord(request, 'create_failed', null, credential.baseUrl, { reason: 'missing_issue_key' }, secrets);
    return;
  }
  const issue = await readBackIssue(request, key, credential, fetch, sleep);
  const mismatch = issue === null ? 'unfetchable_issue_key' : verifyIssue(request, issue);
  if (mismatch !== null) {
    await atomicWriteStateRecord(request, 'verify_mismatch', key, credential.baseUrl, mismatch, secrets);
    return;
  }
  await atomicWriteStateRecord(request, 'verified', key, credential.baseUrl, null, secrets);
};
