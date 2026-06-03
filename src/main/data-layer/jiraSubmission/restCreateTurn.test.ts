import { mkdir, mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { buildJiraSubmissionPlan } from './plan';
import { createRestJiraCreateTurn } from './restCreateTurn';
import { materializePayload } from './runner';

const response = (body: unknown, init: { status?: number } = {}): Response =>
  new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json' }
  });

describe('Direct REST JIRA create turn', () => {
  it('searches orphans, creates with ADF description and object parent, verifies read-back, and writes compatible state record', async () => {
    const repositoryPath = await mkdtemp(path.join(os.tmpdir(), 'jira-rest-turn-'));
    const featureDir = path.join(repositoryPath, 'specs', '0016-rest-turn');
    await mkdir(featureDir, { recursive: true });
    const plan = buildJiraSubmissionPlan({
      repositoryPath,
      featureDir,
      specMarkdown: `# REST Turn

## Requirements

### Functional Requirements

- **FR-001**: Create via REST.
`,
      tasksMarkdown: `# Tasks

## Phase 1: Setup
- [ ] T001 Create issue in \`src/main/data-layer/jiraSubmission/restCreateTurn.ts\`
`,
      config: { projectKey: 'SKC', baseLabels: ['spec-kit'], siteUrl: 'https://example.atlassian.net' }
    });
    const story = plan.nodes[1]!;
    const materialized = materializePayload(story, 'SKC-10');
    const { payload } = materialized;
    const fetch = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(response({ issues: [] }))
      .mockResolvedValueOnce(response({ key: 'SKC-11' }, { status: 201 }))
      .mockResolvedValueOnce(response({
        key: 'SKC-11',
        fields: {
          summary: payload.summary,
          parent: { key: 'SKC-10' },
          labels: payload.labels
        },
        renderedFields: {
          description: '<h2>Acceptance Criteria</h2><p>ok</p>'
        }
      }));

    await createRestJiraCreateTurn({
      credential: { email: 'person@example.com', token: 'api-token', baseUrl: 'https://example.atlassian.net' },
      fetch
    })({
      node: story,
      payload,
      payloadHash: materialized.payloadHash,
      idempotencyLabel: materialized.idempotencyLabel,
      identityLabel: materialized.identityLabel
    });

    expect(fetch).toHaveBeenCalledTimes(3);
    const searchUrl = new URL(fetch.mock.calls[0]![0] as string);
    expect(searchUrl.pathname).toBe('/rest/api/3/search');
    expect(searchUrl.searchParams.get('jql')).toBe(`labels="${materialized.identityLabel}"`);

    const createBody = JSON.parse(fetch.mock.calls[1]![1]!.body as string) as Record<string, unknown>;
    expect(fetch.mock.calls[1]![1]!.headers).toMatchObject({
      Authorization: `Basic ${Buffer.from('person@example.com:api-token').toString('base64')}`
    });
    expect(createBody).toMatchObject({
      fields: {
        project: { key: 'SKC' },
        issuetype: { name: 'Story' },
        summary: payload.summary,
        parent: { key: 'SKC-10' }
      }
    });
    expect((createBody.fields as { labels: string[] }).labels).toContain(materialized.identityLabel);
    expect((createBody.fields as { description: { type: string } }).description.type).toBe('doc');

    const rawRecord = await readFile(path.join(plan.stateDir, `${story.id}.json`), 'utf8');
    expect(JSON.parse(rawRecord)).toMatchObject({
      idempotency_id: story.id,
      status: 'verified',
      issue_key: 'SKC-11',
      issue_url: 'https://example.atlassian.net/browse/SKC-11',
      payload_hash: materialized.payloadHash,
      idempotency_label: materialized.idempotencyLabel,
      identity_label: materialized.identityLabel
    });
  });
});
