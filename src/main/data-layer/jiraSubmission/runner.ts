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
  | { status: 'fail'; reason: string; failedNodeId: string; issues: JiraSubmissionLoopIssue[]; remainingNodeIds: string[] };

export type JiraSubmissionLoopOptions = {
  plan: JiraSubmissionPlan;
  runCreateTurn: JiraCreateTurn;
  now?: () => string;
  onProgress?: (event: { nodeId: string; message: string; timestamp: string }) => void;
  onResult?: (event: { nodeId: string; status: 'verified' | 'duplicate' | 'failed'; issueKey?: string; issueUrl?: string; timestamp: string }) => void;
};

type StateRecord = {
  status: string;
  key: string | null;
  url: string | null;
  payloadHash: string;
  idempotencyLabel: string;
};

type AcceptedRecord = {
  status: 'verified' | 'duplicate';
  key: string;
  url: string;
};

const safeIssueKey = (projectKey: string, value: string | null): value is string =>
  value !== null && new RegExp(`^${projectKey}-\\d+$`).test(value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const stringAlias = (record: Record<string, unknown>, keys: string[]): string | null => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string') return value;
  }
  return null;
};

const readStateRecord = async (stateDir: string, nodeId: string): Promise<StateRecord> => {
  const raw = await readFile(path.join(stateDir, `${nodeId}.json`), 'utf8');
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed)) {
    throw new Error('state record must be an object');
  }
  return {
    status: typeof parsed.status === 'string' ? parsed.status : '',
    key: stringAlias(parsed, ['issue_key', 'live_key', 'issueKey']),
    url: stringAlias(parsed, ['issue_url', 'live_url', 'issueUrl']),
    payloadHash: stringAlias(parsed, ['payload_hash', 'payloadHash']) ?? '',
    idempotencyLabel: stringAlias(parsed, ['idempotency_label', 'idempotencyLabel']) ?? ''
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

const canonicalIdempotencyLabel = (projectKey: string, payloadHash: string): string =>
  `${projectKey}-idem-${payloadHash.slice(0, 12)}`;

const deriveIssueUrl = (siteUrl: string | undefined, issueKey: string): string => {
  if (siteUrl === undefined || siteUrl.trim().length === 0) return '';
  return `${siteUrl.replace(/\/+$/, '')}/browse/${issueKey}`;
};

const acceptedRecord = (
  record: StateRecord,
  projectKey: string,
  payloadHash: string,
  siteUrl: string | undefined
): { ok: true; record: AcceptedRecord } | { ok: false; reason: string } => {
  if (record.payloadHash !== payloadHash) {
    return { ok: false, reason: 'payload_hash_mismatch' };
  }
  if (record.idempotencyLabel !== canonicalIdempotencyLabel(projectKey, payloadHash)) {
    return { ok: false, reason: 'idempotency_label_mismatch' };
  }
  const status = terminalPassStatus(record.status);
  if (status === null) {
    return { ok: false, reason: record.status || 'unverified_state_record' };
  }
  if (!safeIssueKey(projectKey, record.key)) {
    return { ok: false, reason: 'unfetchable_issue_key' };
  }
  return {
    ok: true,
    record: {
      status,
      key: record.key,
      url: record.url !== null && record.url.length > 0 ? record.url : deriveIssueUrl(siteUrl, record.key)
    }
  };
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

  const remainingAfter = (failedNodeId: string): string[] => {
    const index = plan.nodes.findIndex((candidate) => candidate.id === failedNodeId);
    return index < 0 ? [] : plan.nodes.slice(index + 1).map((candidate) => candidate.id);
  };

  const fail = (nodeId: string, reason: string): JiraSubmissionLoopResult => ({
    status: 'fail',
    reason,
    failedNodeId: nodeId,
    issues,
    remainingNodeIds: remainingAfter(nodeId)
  });

  const acceptIssue = (
    nodeId: string,
    record: AcceptedRecord,
    resultStatus: 'verified' | 'duplicate'
  ): void => {
    keysByNode.set(nodeId, record.key);
    const issue = { nodeId, key: record.key, url: record.url };
    issues.push(issue);
    onResult?.({ nodeId, status: resultStatus, issueKey: issue.key, issueUrl: issue.url, timestamp: now() });
  };

  for (const node of plan.nodes) {
    const parentKey = node.parentId === null ? null : keysByNode.get(node.parentId) ?? null;
    const { payload, payloadHash } = materializePayload(node, parentKey);

    try {
      const existingRecord = await readStateRecord(plan.stateDir, node.id);
      const existingAccepted = acceptedRecord(existingRecord, payload.project_key, payloadHash, plan.siteUrl);
      if (existingAccepted.ok) {
        acceptIssue(node.id, existingAccepted.record, 'duplicate');
        continue;
      }
    } catch {
      // Missing or malformed pre-existing records are not adoptable; the create turn owns recovery.
    }

    onProgress?.({ nodeId: node.id, message: `Creating ${node.issueType}: ${node.summary}`, timestamp: now() });
    await runCreateTurn({ node, payload, payloadHash });

    let record: StateRecord;
    try {
      record = await readStateRecord(plan.stateDir, node.id);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      onResult?.({ nodeId: node.id, status: 'failed', timestamp: now() });
      return fail(node.id, reason);
    }

    const accepted = acceptedRecord(record, payload.project_key, payloadHash, plan.siteUrl);
    if (!accepted.ok) {
      onResult?.({ nodeId: node.id, status: 'failed', timestamp: now() });
      return fail(node.id, accepted.reason);
    }

    acceptIssue(node.id, accepted.record, accepted.record.status);
  }

  return { status: 'pass', issues };
};
