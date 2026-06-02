import { requireExactKeys, requireRecord, requireString, type RendererBoundaryErrorName, type RendererFactoryResult } from './factoryUtils';
import type { JiraDryRunPreview, JiraSubmissionResult } from '../slices/jira';

type ErrorName = 'InvalidJiraSubmission';

export type RendererJiraSubmissionAck = {
  subscriptionId: string;
  accepted: true;
  featureDir: string;
};

export type RendererJiraSubmissionIssue = {
  nodeId: string;
  key: string;
  url: string;
};

export type RendererJiraSubmissionEvent =
  | { type: 'progress'; nodeId: string; message: string; timestamp: string }
  | ({ type: 'result'; timestamp: string } & JiraSubmissionResult)
  | { type: 'done'; status: 'pass'; issues: RendererJiraSubmissionIssue[]; timestamp: string }
  | { type: 'done'; status: 'fail'; reason: string; issues: RendererJiraSubmissionIssue[]; remainingNodeIds: string[]; timestamp: string };

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const isIssueArray = (value: unknown): value is RendererJiraSubmissionIssue[] =>
  Array.isArray(value) && value.every((item) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) return false;
    const record = item as Record<string, unknown>;
    return typeof record.nodeId === 'string' && typeof record.key === 'string' && typeof record.url === 'string';
  });

export const parseRendererJiraDryRunPreview = (
  value: unknown
): RendererFactoryResult<JiraDryRunPreview, RendererBoundaryErrorName<ErrorName>> => {
  const root = requireRecord(value, 'InvalidJiraSubmission', '$');
  if (!root.ok) return root;
  const keys = requireExactKeys<ErrorName>(root.value, ['featureDir', 'stateDir', 'nodes', 'warnings']);
  if (!keys.ok) return keys;
  const featureDir = requireString(root.value.featureDir, 'InvalidJiraSubmission', '$.featureDir');
  const stateDir = requireString(root.value.stateDir, 'InvalidJiraSubmission', '$.stateDir');
  if (!featureDir.ok) return featureDir;
  if (!stateDir.ok) return stateDir;
  if (!Array.isArray(root.value.nodes)) {
    return { ok: false, error: { name: 'InvalidJiraSubmission', message: 'nodes must be an array', path: '$.nodes' } };
  }
  const nodes = root.value.nodes.map((node) => {
    if (typeof node !== 'object' || node === null || Array.isArray(node)) return null;
    const record = node as Record<string, unknown>;
    const id = typeof record.id === 'string' ? record.id : undefined;
    const issueType = record.issueType;
    const summary = typeof record.summary === 'string' ? record.summary : undefined;
    const parentId = typeof record.parentId === 'string' || record.parentId === null ? record.parentId : undefined;
    return id !== undefined &&
      (issueType === 'Epic' || issueType === 'Story' || issueType === 'Subtask') &&
      summary !== undefined &&
      parentId !== undefined &&
      isStringArray(record.labels)
      ? { id, issueType, summary, parentId, labels: record.labels }
      : null;
  });
  if (nodes.some((node) => node === null)) {
    return { ok: false, error: { name: 'InvalidJiraSubmission', message: 'node is malformed', path: '$.nodes' } };
  }
  if (!isStringArray(root.value.warnings)) {
    return { ok: false, error: { name: 'InvalidJiraSubmission', message: 'warnings must be strings', path: '$.warnings' } };
  }
  return {
    ok: true,
    value: {
      featureDir: featureDir.value,
      stateDir: stateDir.value,
      nodes: nodes as JiraDryRunPreview['nodes'],
      warnings: root.value.warnings
    }
  };
};

export const parseRendererJiraSubmissionAck = (
  value: unknown
): RendererFactoryResult<RendererJiraSubmissionAck, RendererBoundaryErrorName<ErrorName>> => {
  const root = requireRecord(value, 'InvalidJiraSubmission', '$');
  if (!root.ok) return root;
  const keys = requireExactKeys<ErrorName>(root.value, ['subscriptionId', 'accepted', 'featureDir']);
  if (!keys.ok) return keys;
  const subscriptionId = requireString(root.value.subscriptionId, 'InvalidJiraSubmission', '$.subscriptionId');
  const featureDir = requireString(root.value.featureDir, 'InvalidJiraSubmission', '$.featureDir');
  if (!subscriptionId.ok) return subscriptionId;
  if (!featureDir.ok) return featureDir;
  if (root.value.accepted !== true) {
    return { ok: false, error: { name: 'InvalidJiraSubmission', message: 'accepted must be true', path: '$.accepted' } };
  }
  return { ok: true, value: { subscriptionId: subscriptionId.value, accepted: true, featureDir: featureDir.value } };
};

export const parseRendererJiraSubmissionEvent = (
  value: unknown
): RendererFactoryResult<RendererJiraSubmissionEvent, RendererBoundaryErrorName<ErrorName>> => {
  const root = requireRecord(value, 'InvalidJiraSubmission', '$');
  if (!root.ok) return root;
  const type = root.value.type;
  if (type === 'progress') {
    const nodeId = requireString(root.value.nodeId, 'InvalidJiraSubmission', '$.nodeId');
    const message = requireString(root.value.message, 'InvalidJiraSubmission', '$.message');
    const timestamp = requireString(root.value.timestamp, 'InvalidJiraSubmission', '$.timestamp');
    if (!nodeId.ok) return nodeId;
    if (!message.ok) return message;
    if (!timestamp.ok) return timestamp;
    return { ok: true, value: { type, nodeId: nodeId.value, message: message.value, timestamp: timestamp.value } };
  }
  if (type === 'result') {
    const nodeId = requireString(root.value.nodeId, 'InvalidJiraSubmission', '$.nodeId');
    const timestamp = requireString(root.value.timestamp, 'InvalidJiraSubmission', '$.timestamp');
    if (!nodeId.ok) return nodeId;
    if (!timestamp.ok) return timestamp;
    if (root.value.status !== 'verified' && root.value.status !== 'duplicate' && root.value.status !== 'failed') {
      return { ok: false, error: { name: 'InvalidJiraSubmission', message: 'status is invalid', path: '$.status' } };
    }
    return {
      ok: true,
      value: {
        type,
        nodeId: nodeId.value,
        status: root.value.status,
        issueKey: typeof root.value.issueKey === 'string' ? root.value.issueKey : undefined,
        issueUrl: typeof root.value.issueUrl === 'string' ? root.value.issueUrl : undefined,
        timestamp: timestamp.value
      }
    };
  }
  if (type === 'done') {
    const timestamp = requireString(root.value.timestamp, 'InvalidJiraSubmission', '$.timestamp');
    if (!timestamp.ok) return timestamp;
    if (!isIssueArray(root.value.issues)) {
      return { ok: false, error: { name: 'InvalidJiraSubmission', message: 'issues must be issue results', path: '$.issues' } };
    }
    if (root.value.status === 'pass') {
      return { ok: true, value: { type, status: 'pass', issues: root.value.issues, timestamp: timestamp.value } };
    }
    if (root.value.status === 'fail') {
      const reason = requireString(root.value.reason, 'InvalidJiraSubmission', '$.reason');
      if (!reason.ok) return reason;
      if (!isStringArray(root.value.remainingNodeIds)) {
        return { ok: false, error: { name: 'InvalidJiraSubmission', message: 'remainingNodeIds must be strings', path: '$.remainingNodeIds' } };
      }
      return {
        ok: true,
        value: {
          type,
          status: 'fail',
          reason: reason.value,
          issues: root.value.issues,
          remainingNodeIds: root.value.remainingNodeIds,
          timestamp: timestamp.value
        }
      };
    }
  }
  return { ok: false, error: { name: 'InvalidJiraSubmission', message: 'unsupported event', path: '$.type' } };
};
