import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildJiraSubmissionPlan } from './plan';
import { runJiraSubmissionLoop } from './runner';

const specMarkdown = `# Create Jira issues

## Requirements

- **FR-001**: Create a hierarchy.
`;

const tasksMarkdown = `# Tasks

## Phase 1: Setup

- [ ] T001 First child task
`;

describe('JIRA submission runner', () => {
  it('drives one bounded create turn per node and threads verified parent keys from disk truth', async () => {
    const repo = await mkdtemp(path.join(os.tmpdir(), 'jira-runner-'));
    const featureDir = path.join(repo, 'specs', '0015-send-jira-button');
    await mkdir(featureDir, { recursive: true });
    const plan = buildJiraSubmissionPlan({
      repositoryPath: repo,
      featureDir,
      specMarkdown,
      tasksMarkdown,
      config: { projectKey: 'SKC', baseLabels: ['spec-kit'] }
    });
    const calls: Array<{ id: string; parentKey: string | null }> = [];

    const result = await runJiraSubmissionLoop({
      plan,
      now: () => '2026-06-02T12:00:00.000Z',
      runCreateTurn: async ({ node, payload, payloadHash }) => {
        calls.push({ id: node.id, parentKey: payload.parent_key });
        await mkdir(plan.stateDir, { recursive: true });
        await writeFile(path.join(plan.stateDir, `${node.id}.json`), JSON.stringify({
          idempotency_id: node.id,
          status: 'verified',
          live_key: calls.length === 1 ? 'SKC-10' : calls.length === 2 ? 'SKC-11' : 'SKC-12',
          live_url: `https://collette.atlassian.net/browse/SKC-${9 + calls.length}`,
          payload_hash: payloadHash,
          attempts: 1,
          started_at: '2026-06-02T12:00:00.000Z',
          verified_at: '2026-06-02T12:00:01.000Z',
          agent_model: 'gpt-5-mini',
          agent_effort: null,
          copilot_session_id: null,
          cost_multiplier: 0,
          error: null
        }), 'utf8');
      }
    });

    expect(result.status).toBe('pass');
    expect(calls).toEqual([
      { id: '0015-send-jira-button-epic', parentKey: null },
      { id: '0015-send-jira-button-phase-1-setup', parentKey: 'SKC-10' },
      { id: '0015-send-jira-button-T001', parentKey: 'SKC-11' }
    ]);
    expect(result.issues.map((issue) => issue.key)).toEqual(['SKC-10', 'SKC-11', 'SKC-12']);
  });

  it('halts when the disk record payload hash does not match the app-rendered payload', async () => {
    const repo = await mkdtemp(path.join(os.tmpdir(), 'jira-runner-'));
    const featureDir = path.join(repo, 'specs', '0015-send-jira-button');
    await mkdir(featureDir, { recursive: true });
    const plan = buildJiraSubmissionPlan({
      repositoryPath: repo,
      featureDir,
      specMarkdown,
      tasksMarkdown,
      config: { projectKey: 'SKC', baseLabels: ['spec-kit'] }
    });

    const result = await runJiraSubmissionLoop({
      plan,
      now: () => '2026-06-02T12:00:00.000Z',
      runCreateTurn: async ({ node }) => {
        await mkdir(plan.stateDir, { recursive: true });
        await writeFile(path.join(plan.stateDir, `${node.id}.json`), JSON.stringify({
          idempotency_id: node.id,
          status: 'verified',
          live_key: 'SKC-10',
          live_url: 'https://collette.atlassian.net/browse/SKC-10',
          payload_hash: 'wrong',
          attempts: 1,
          started_at: '2026-06-02T12:00:00.000Z',
          verified_at: '2026-06-02T12:00:01.000Z',
          agent_model: 'gpt-5-mini',
          agent_effort: null,
          copilot_session_id: null,
          cost_multiplier: 0,
          error: null
        }), 'utf8');
      }
    });

    expect(result).toMatchObject({ status: 'fail', reason: 'payload_hash_mismatch' });
  });
});
