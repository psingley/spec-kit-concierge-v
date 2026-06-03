import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { buildJiraSubmissionPlan } from './plan';
import { canonicalIdentityLabel, materializePayload } from './runner';
import { runJiraSubmissionLoop } from './runner';

const specMarkdown = `# Create Jira issues

## Requirements

- **FR-001**: Create a hierarchy.
`;

const tasksMarkdown = `# Tasks

## Phase 1: Setup

- [ ] T001 First child task
`;

const createPlan = async (config: { siteUrl?: string } = {}) => {
  const repo = await mkdtemp(path.join(os.tmpdir(), 'jira-runner-'));
  const featureDir = path.join(repo, 'specs', '0015-send-jira-button');
  await mkdir(featureDir, { recursive: true });
  return buildJiraSubmissionPlan({
    repositoryPath: repo,
    featureDir,
    specMarkdown,
    tasksMarkdown,
    config: { projectKey: 'SKC', baseLabels: ['spec-kit'], ...config }
  });
};

const writeStateRecord = async (
  stateDir: string,
  nodeId: string,
  record: Record<string, unknown>
): Promise<void> => {
  await mkdir(stateDir, { recursive: true });
  await writeFile(path.join(stateDir, `${nodeId}.json`), JSON.stringify(record), 'utf8');
};

const idempotencyLabel = (payloadHash: string): string => `SKC-idem-${payloadHash.slice(0, 12)}`;
const identityLabel = (nodeId: string): string => canonicalIdentityLabel('SKC', nodeId);

describe('JIRA submission runner', () => {
  it('drives one bounded create turn per node and threads verified parent keys from disk truth', async () => {
    const plan = await createPlan();
    const calls: Array<{ id: string; parentKey: string | null }> = [];

    const result = await runJiraSubmissionLoop({
      plan,
      now: () => '2026-06-02T12:00:00.000Z',
      runCreateTurn: async ({ node, payload, payloadHash }) => {
        calls.push({ id: node.id, parentKey: payload.parent_key });
        await writeStateRecord(plan.stateDir, node.id, {
          idempotency_id: node.id,
          status: 'verified',
          live_key: calls.length === 1 ? 'SKC-10' : calls.length === 2 ? 'SKC-11' : 'SKC-12',
          live_url: `https://collette.atlassian.net/browse/SKC-${9 + calls.length}`,
          payload_hash: payloadHash,
          idempotency_label: idempotencyLabel(payloadHash),
          identity_label: identityLabel(node.id),
          attempts: 1,
          started_at: '2026-06-02T12:00:00.000Z',
          verified_at: '2026-06-02T12:00:01.000Z',
          agent_model: 'gpt-5-mini',
          agent_effort: null,
          copilot_session_id: null,
          cost_multiplier: 0,
          error: null
        });
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
    const plan = await createPlan();
    const stalePayloadHash = 'f'.repeat(64);

    const result = await runJiraSubmissionLoop({
      plan,
      now: () => '2026-06-02T12:00:00.000Z',
      runCreateTurn: async ({ node }) => {
        await writeStateRecord(plan.stateDir, node.id, {
          idempotency_id: node.id,
          status: 'verified',
          live_key: 'SKC-10',
          live_url: 'https://collette.atlassian.net/browse/SKC-10',
          payload_hash: stalePayloadHash,
          idempotency_label: idempotencyLabel(stalePayloadHash),
          identity_label: identityLabel(node.id),
          attempts: 1,
          started_at: '2026-06-02T12:00:00.000Z',
          verified_at: '2026-06-02T12:00:01.000Z',
          agent_model: 'gpt-5-mini',
          agent_effort: null,
          copilot_session_id: null,
          cost_multiplier: 0,
          error: null
        });
      }
    });

    expect(result).toMatchObject({
      status: 'fail',
      reason: 'payload_hash_mismatch',
      failedNodeId: '0015-send-jira-button-epic',
      remainingNodeIds: ['0015-send-jira-button-phase-1-setup', '0015-send-jira-button-T001']
    });
  });

  it('advances a live-shaped SKC-239 verified record without requiring a URL and threads the key', async () => {
    const plan = await createPlan();
    const calls: Array<{ id: string; parentKey: string | null }> = [];

    const result = await runJiraSubmissionLoop({
      plan,
      now: () => '2026-06-02T12:00:00.000Z',
      runCreateTurn: async ({ node, payload, payloadHash }) => {
        calls.push({ id: node.id, parentKey: payload.parent_key });
        await writeStateRecord(plan.stateDir, node.id, {
          idempotency_id: node.id,
          status: 'verified',
          issue_key: calls.length === 1 ? 'SKC-239' : calls.length === 2 ? 'SKC-240' : 'SKC-241',
          payload_hash: payloadHash,
          idempotency_label: idempotencyLabel(payloadHash),
          identity_label: identityLabel(node.id)
        });
      }
    });

    expect(result.status).toBe('pass');
    expect(result.issues).toEqual([
      { nodeId: '0015-send-jira-button-epic', key: 'SKC-239', url: '' },
      { nodeId: '0015-send-jira-button-phase-1-setup', key: 'SKC-240', url: '' },
      { nodeId: '0015-send-jira-button-T001', key: 'SKC-241', url: '' }
    ]);
    expect(calls[1]).toEqual({ id: '0015-send-jira-button-phase-1-setup', parentKey: 'SKC-239' });
  });

  it('pre-adopts a verified matching Epic record and skips its create turn while continuing children', async () => {
    const plan = await createPlan();
    const calls: Array<{ id: string; parentKey: string | null }> = [];
    const epic = plan.nodes[0]!;
    const epicPayloadHash = epic.payloadHash;
    await writeStateRecord(plan.stateDir, epic.id, {
      idempotency_id: epic.id,
      status: 'verified',
      issue_key: 'SKC-239',
      payload_hash: epicPayloadHash,
      idempotency_label: idempotencyLabel(epicPayloadHash),
      identity_label: identityLabel(epic.id)
    });

    const result = await runJiraSubmissionLoop({
      plan,
      now: () => '2026-06-02T12:00:00.000Z',
      runCreateTurn: async ({ node, payload, payloadHash }) => {
        calls.push({ id: node.id, parentKey: payload.parent_key });
        await writeStateRecord(plan.stateDir, node.id, {
          idempotency_id: node.id,
          status: 'verified',
          issue_key: calls.length === 1 ? 'SKC-240' : 'SKC-241',
          payload_hash: payloadHash,
          idempotency_label: idempotencyLabel(payloadHash),
          identity_label: identityLabel(node.id)
        });
      }
    });

    expect(result.status).toBe('pass');
    expect(calls).toEqual([
      { id: '0015-send-jira-button-phase-1-setup', parentKey: 'SKC-239' },
      { id: '0015-send-jira-button-T001', parentKey: 'SKC-240' }
    ]);
    expect(result.issues.map((issue) => issue.key)).toEqual(['SKC-239', 'SKC-240', 'SKC-241']);
  });

  it('threads a matching verified parent key into child create payloads', async () => {
    const plan = await createPlan();
    const calls: Array<{ id: string; parentKey: string | null }> = [];

    await runJiraSubmissionLoop({
      plan,
      now: () => '2026-06-02T12:00:00.000Z',
      runCreateTurn: async ({ node, payload, payloadHash }) => {
        calls.push({ id: node.id, parentKey: payload.parent_key });
        await writeStateRecord(plan.stateDir, node.id, {
          idempotency_id: node.id,
          status: 'verified',
          issue_key: calls.length === 1 ? 'SKC-10' : calls.length === 2 ? 'SKC-11' : 'SKC-12',
          payload_hash: payloadHash,
          idempotency_label: idempotencyLabel(payloadHash),
          identity_label: identityLabel(node.id)
        });
      }
    });

    expect(calls[1]).toEqual({ id: '0015-send-jira-button-phase-1-setup', parentKey: 'SKC-10' });
    expect(calls[2]).toEqual({ id: '0015-send-jira-button-T001', parentKey: 'SKC-11' });
  });

  it('halts when the disk record idempotency label does not match the canonical payload label', async () => {
    const plan = await createPlan();

    const result = await runJiraSubmissionLoop({
      plan,
      now: () => '2026-06-02T12:00:00.000Z',
      runCreateTurn: async ({ node, payloadHash }) => {
        await writeStateRecord(plan.stateDir, node.id, {
          idempotency_id: node.id,
          status: 'verified',
          issue_key: 'SKC-10',
          payload_hash: payloadHash,
          idempotency_label: 'SKC-idem-stale000000',
          identity_label: identityLabel(node.id)
        });
      }
    });

    expect(result).toMatchObject({ status: 'fail', reason: 'idempotency_label_mismatch' });
  });

  it('halts when the disk record is bound to a different idempotency id', async () => {
    const plan = await createPlan();

    const result = await runJiraSubmissionLoop({
      plan,
      now: () => '2026-06-02T12:00:00.000Z',
      runCreateTurn: async ({ node, payloadHash }) => {
        await writeStateRecord(plan.stateDir, node.id, {
          idempotency_id: 'copied-from-another-node',
          status: 'verified',
          issue_key: 'SKC-10',
          payload_hash: payloadHash,
          idempotency_label: idempotencyLabel(payloadHash),
          identity_label: identityLabel(node.id)
        });
      }
    });

    expect(result).toMatchObject({ status: 'fail', reason: 'idempotency_id_mismatch' });
  });

  it('halts when the disk record payload hash is not a lower-case SHA-256 hex digest', async () => {
    const plan = await createPlan();

    const result = await runJiraSubmissionLoop({
      plan,
      now: () => '2026-06-02T12:00:00.000Z',
      runCreateTurn: async ({ node }) => {
        await writeStateRecord(plan.stateDir, node.id, {
          idempotency_id: node.id,
          status: 'verified',
          issue_key: 'SKC-10',
          payload_hash: 'not-a-sha',
          idempotency_label: 'SKC-idem-not-a-sha',
          identity_label: identityLabel(node.id)
        });
      }
    });

    expect(result).toMatchObject({ status: 'fail', reason: 'malformed_payload_hash' });
  });

  it('halts when the disk record label is not internally consistent with its payload hash', async () => {
    const plan = await createPlan();
    const stalePayloadHash = 'e'.repeat(64);

    const result = await runJiraSubmissionLoop({
      plan,
      now: () => '2026-06-02T12:00:00.000Z',
      runCreateTurn: async ({ node }) => {
        await writeStateRecord(plan.stateDir, node.id, {
          idempotency_id: node.id,
          status: 'verified',
          issue_key: 'SKC-10',
          payload_hash: stalePayloadHash,
          idempotency_label: 'SKC-idem-wronglabel12',
          identity_label: identityLabel(node.id)
        });
      }
    });

    expect(result).toMatchObject({ status: 'fail', reason: 'idempotency_label_mismatch' });
  });

  it('halts on non-terminal state records after a create turn', async () => {
    const plan = await createPlan();

    const result = await runJiraSubmissionLoop({
      plan,
      now: () => '2026-06-02T12:00:00.000Z',
      runCreateTurn: async ({ node, payloadHash }) => {
        await writeStateRecord(plan.stateDir, node.id, {
          idempotency_id: node.id,
          status: 'creating',
          issue_key: 'SKC-10',
          payload_hash: payloadHash,
          idempotency_label: idempotencyLabel(payloadHash),
          identity_label: identityLabel(node.id)
        });
      }
    });

    expect(result).toMatchObject({ status: 'fail', reason: 'creating' });
  });

  it('derives missing URLs from known siteUrl and still advances with empty URLs when siteUrl is absent', async () => {
    const withSite = await createPlan({ siteUrl: 'https://collette.atlassian.net/' });
    const withoutSite = await createPlan();

    const runCreateTurn = async (plan: typeof withSite, key: string, nodeId: string, payloadHash: string) => {
      await writeStateRecord(plan.stateDir, nodeId, {
        idempotency_id: nodeId,
        status: 'verified',
        issue_key: key,
        payload_hash: payloadHash,
        idempotency_label: idempotencyLabel(payloadHash),
        identity_label: identityLabel(nodeId)
      });
    };

    const withSiteResult = await runJiraSubmissionLoop({
      plan: withSite,
      now: () => '2026-06-02T12:00:00.000Z',
      runCreateTurn: async ({ node, payloadHash }) => runCreateTurn(withSite, node.id.endsWith('epic') ? 'SKC-10' : node.id.includes('phase') ? 'SKC-11' : 'SKC-12', node.id, payloadHash)
    });
    const withoutSiteResult = await runJiraSubmissionLoop({
      plan: withoutSite,
      now: () => '2026-06-02T12:00:00.000Z',
      runCreateTurn: async ({ node, payloadHash }) => runCreateTurn(withoutSite, node.id.endsWith('epic') ? 'SKC-20' : node.id.includes('phase') ? 'SKC-21' : 'SKC-22', node.id, payloadHash)
    });

    expect(withSiteResult.issues[0]).toEqual({
      nodeId: '0015-send-jira-button-epic',
      key: 'SKC-10',
      url: 'https://collette.atlassian.net/browse/SKC-10'
    });
    expect(withoutSiteResult.issues[0]).toEqual({
      nodeId: '0015-send-jira-button-epic',
      key: 'SKC-20',
      url: ''
    });
  });

  it('halts on a stale existing record whose payload hash differs from the app-rendered payload', async () => {
    const plan = await createPlan();
    const stalePayloadHash = 'd'.repeat(64);
    const createTurn = vi.fn(async ({ node, payloadHash }) => {
      await writeStateRecord(plan.stateDir, node.id, {
        idempotency_id: node.id,
        status: 'verified',
        issue_key: node.id.endsWith('epic') ? 'SKC-10' : node.id.includes('phase') ? 'SKC-11' : 'SKC-12',
        payload_hash: payloadHash,
        idempotency_label: idempotencyLabel(payloadHash),
        identity_label: identityLabel(node.id)
      });
    });
    await writeStateRecord(plan.stateDir, plan.nodes[0]!.id, {
      idempotency_id: plan.nodes[0]!.id,
      status: 'verified',
      issue_key: 'SKC-239',
      payload_hash: stalePayloadHash,
      idempotency_label: idempotencyLabel(stalePayloadHash),
      identity_label: identityLabel(plan.nodes[0]!.id)
    });

    const result = await runJiraSubmissionLoop({
      plan,
      now: () => '2026-06-02T12:00:00.000Z',
      runCreateTurn: createTurn
    });

    expect(result).toMatchObject({
      status: 'fail',
      reason: 'payload_hash_mismatch',
      failedNodeId: '0015-send-jira-button-epic'
    });
    expect(createTurn).not.toHaveBeenCalled();
  });

  it('derives a stable identity label from idempotency id independent of description while payload hash still detects drift', async () => {
    const plan = await createPlan();
    const node = plan.nodes[0]!;
    const first = materializePayload(node, null);
    const changedDescription = {
      ...node,
      payload: {
        ...node.payload,
        description: `${node.payload.description}\n\nRicher body`
      }
    };
    const second = materializePayload(changedDescription, null);

    expect(first.identityLabel).toBe(second.identityLabel);
    expect(first.identityLabel).toBe(canonicalIdentityLabel('SKC', node.id));
    expect(first.idempotencyLabel).not.toBe(second.idempotencyLabel);
    expect(first.payloadHash).not.toBe(second.payloadHash);
  });
});
