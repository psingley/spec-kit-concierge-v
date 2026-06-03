import { mkdir, mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { sanitizeForSecrets } from './redaction';
import { buildJiraSubmissionPlan } from './plan';
import { materializePayload } from './runner';
import { createRestJiraCreateTurn } from './restCreateTurn';

const response = (body: unknown, init: { status?: number } = {}): Response =>
  new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json' }
  });

describe('Jira submission leak scrubbing', () => {
  it('scrubs token, Authorization header, and Basic base64 from error strings and objects', () => {
    const base64 = Buffer.from('person@example.com:secret-token').toString('base64');
    const scrubbed = sanitizeForSecrets({
      token: 'secret-token',
      nested: {
        authorization: `Basic ${base64}`,
        message: `Authorization: Basic ${base64} using secret-token`
      }
    }, ['secret-token']);

    const serialized = JSON.stringify(scrubbed);
    expect(serialized).toContain('[REDACTED]');
    expect(serialized).not.toContain('secret-token');
    expect(serialized).not.toContain(base64);
    expect(serialized).not.toContain('Authorization');
  });

  it('returns sanitized log copies without mutating outgoing request headers', () => {
    const base64 = Buffer.from('person@example.com:api.token=3E29F2AF+/_.-~').toString('base64');
    const request = {
      method: 'GET',
      headers: {
        Authorization: `Basic ${base64}`,
        Accept: 'application/json'
      }
    };

    const scrubbed = sanitizeForSecrets(request, [`Basic ${base64}`]);

    expect(request.headers.Authorization).toBe(`Basic ${base64}`);
    expect(JSON.stringify(scrubbed)).not.toContain(base64);
  });

  it('writes sanitized failed-fetch error details into the state record', async () => {
    const repositoryPath = await mkdtemp(path.join(os.tmpdir(), 'jira-rest-redact-'));
    const featureDir = path.join(repositoryPath, 'specs', '0016-rest-turn');
    await mkdir(featureDir, { recursive: true });
    const plan = buildJiraSubmissionPlan({
      repositoryPath,
      featureDir,
      specMarkdown: '# REST Turn\n\n## Requirements\n\n- **FR-001**: Create via REST.\n',
      tasksMarkdown: '# Tasks\n\n## Phase 1: Setup\n- [ ] T001 Create issue\n',
      config: { projectKey: 'SKC', baseLabels: ['spec-kit'], siteUrl: 'https://example.atlassian.net' }
    });
    const story = plan.nodes[1]!;
    const materialized = materializePayload(story, 'SKC-10');
    const base64 = Buffer.from('person@example.com:secret-token').toString('base64');
    const fetch = async (): Promise<Response> =>
      response({ errorMessages: [`Authorization: Basic ${base64}`, 'secret-token'] }, { status: 500 });

    await createRestJiraCreateTurn({
      credential: { email: 'person@example.com', token: 'secret-token', baseUrl: 'https://example.atlassian.net' },
      fetch,
      sleep: async () => undefined
    })({
      node: story,
      payload: materialized.payload,
      payloadHash: materialized.payloadHash,
      idempotencyLabel: materialized.idempotencyLabel,
      identityLabel: materialized.identityLabel
    });

    const rawRecord = await readFile(path.join(plan.stateDir, `${story.id}.json`), 'utf8');
    expect(rawRecord).toContain('[REDACTED]');
    expect(rawRecord).not.toContain('secret-token');
    expect(rawRecord).not.toContain(base64);
    expect(rawRecord).not.toContain('Authorization');
  });
});
