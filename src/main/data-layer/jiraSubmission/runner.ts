import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createPayloadHash, type JiraSubmissionNode, type JiraSubmissionPayload, type JiraSubmissionPlan } from './plan';

export type JiraCreateTurnRequest = {
  node: JiraSubmissionNode;
  payload: JiraSubmissionPayload;
  payloadHash: string;
};

export type JiraCreateTurn = (request: JiraCreateTurnRequest) => Promise<void>;

export type JiraSubmissionLoopIssue = {
  nodeId: string;
  key: string;
  url: string;
};

export type JiraSubmissionLoopResult =
  | { status: 'pass'; issues: JiraSubmissionLoopIssue[] }
  | { status: 'fail'; reason: string; failedNodeId: string; issues: JiraSubmissionLoopIssue[] };

export type JiraSubmissionLoopOptions = {
  plan: JiraSubmissionPlan;
  runCreateTurn: JiraCreateTurn;
  now?: () => string;
  onProgress?: (event: { nodeId: string; message: string; timestamp: string }) => void;
  onResult?: (event: { nodeId: string; status: 'verified' | 'duplicate' | 'failed'; issueKey?: string; issueUrl?: string; timestamp: string }) => void;
};

type StateRecord = {
  status: string;
  live_key: string | null;
  live_url: string | null;
  payload_hash: string;
};

const safeIssueKey = (projectKey: string, value: string | null): value is string =>
  value !== null && new RegExp(`^${projectKey}-\\d+$`).test(value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readStateRecord = async (stateDir: string, nodeId: string): Promise<StateRecord> => {
  const raw = await readFile(path.join(stateDir, `${nodeId}.json`), 'utf8');
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed)) {
    throw new Error('state record must be an object');
  }
  return {
    status: typeof parsed.status === 'string' ? parsed.status : '',
    live_key: typeof parsed.live_key === 'string' ? parsed.live_key : null,
    live_url: typeof parsed.live_url === 'string' ? parsed.live_url : null,
    payload_hash: typeof parsed.payload_hash === 'string' ? parsed.payload_hash : ''
  };
};

const materializePayload = (
  node: JiraSubmissionNode,
  parentKey: string | null
): { payload: JiraSubmissionPayload; payloadHash: string } => {
  const payloadWithoutIdem: JiraSubmissionPayload = {
    ...node.payload,
    labels: node.payload.labels.filter((label) => !label.includes('-idem-')),
    parent_key: parentKey
  };
  const payloadHash = createPayloadHash(payloadWithoutIdem);
  const idemLabel = `${payloadWithoutIdem.project_key}-idem-${payloadHash.slice(0, 12)}`;
  return {
    payload: {
      ...payloadWithoutIdem,
      labels: [...payloadWithoutIdem.labels, idemLabel]
    },
    payloadHash
  };
};

const terminalPassStatus = (status: string): 'verified' | 'duplicate' | null => {
  if (status === 'verified') return 'verified';
  if (status === 'duplicate' || status === 'already_verified') return 'duplicate';
  return null;
};

export const runJiraSubmissionLoop = async ({
  plan,
  runCreateTurn,
  now = () => new Date().toISOString(),
  onProgress,
  onResult
}: JiraSubmissionLoopOptions): Promise<JiraSubmissionLoopResult> => {
  const keysByNode = new Map<string, string>();
  const issues: JiraSubmissionLoopIssue[] = [];

  for (const node of plan.nodes) {
    const parentKey = node.parentId === null ? null : keysByNode.get(node.parentId) ?? null;
    const { payload, payloadHash } = materializePayload(node, parentKey);
    onProgress?.({ nodeId: node.id, message: `Creating ${node.issueType}: ${node.summary}`, timestamp: now() });
    await runCreateTurn({ node, payload, payloadHash });

    let record: StateRecord;
    try {
      record = await readStateRecord(plan.stateDir, node.id);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      onResult?.({ nodeId: node.id, status: 'failed', timestamp: now() });
      return { status: 'fail', reason, failedNodeId: node.id, issues };
    }

    if (record.payload_hash !== payloadHash) {
      onResult?.({ nodeId: node.id, status: 'failed', timestamp: now() });
      return { status: 'fail', reason: 'payload_hash_mismatch', failedNodeId: node.id, issues };
    }
    const status = terminalPassStatus(record.status);
    if (status === null) {
      onResult?.({ nodeId: node.id, status: 'failed', timestamp: now() });
      return { status: 'fail', reason: record.status || 'unverified_state_record', failedNodeId: node.id, issues };
    }
    if (!safeIssueKey(payload.project_key, record.live_key) || record.live_url === null || record.live_url.length === 0) {
      onResult?.({ nodeId: node.id, status: 'failed', timestamp: now() });
      return { status: 'fail', reason: 'unfetchable_issue_key', failedNodeId: node.id, issues };
    }

    keysByNode.set(node.id, record.live_key);
    const issue = { nodeId: node.id, key: record.live_key, url: record.live_url };
    issues.push(issue);
    onResult?.({ nodeId: node.id, status, issueKey: issue.key, issueUrl: issue.url, timestamp: now() });
  }

  return { status: 'pass', issues };
};
