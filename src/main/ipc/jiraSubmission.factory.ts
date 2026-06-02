import path from 'node:path';
import { invalid, requireExactKeys, requireRecord, requireString, type FactoryResult } from './factoryUtils';
import type { JiraSubmissionNode } from '../data-layer/jiraSubmission/plan';

type ErrorName = 'InvalidJiraSubmissionPayload' | 'InvalidJiraSubmissionEvent';

export type JiraDryRunRequest = {
  repositoryPath: string;
};

export type JiraSubmitRequest = {
  repositoryPath: string;
  subscriptionId: string;
};

export type JiraSubmissionAck = {
  subscriptionId: string;
  accepted: true;
  featureDir: string;
};

export type JiraDryRunResponse = {
  featureDir: string;
  stateDir: string;
  nodes: Pick<JiraSubmissionNode, 'id' | 'issueType' | 'summary' | 'parentId' | 'labels'>[];
  warnings: string[];
};

export type JiraSubmissionIssue = {
  nodeId: string;
  key: string;
  url: string;
};

export type JiraSubmissionEvent =
  | { type: 'progress'; nodeId: string; message: string; timestamp: string }
  | { type: 'result'; nodeId: string; status: 'verified' | 'duplicate' | 'failed'; issueKey?: string; issueUrl?: string; timestamp: string }
  | { type: 'done'; status: 'pass'; issues: JiraSubmissionIssue[]; timestamp: string }
  | { type: 'done'; status: 'fail'; reason: string; issues: JiraSubmissionIssue[]; remainingNodeIds: string[]; timestamp: string };

const safeAbsolutePath = (value: string): boolean =>
  (path.isAbsolute(value) || path.win32.isAbsolute(value)) && !value.includes('\0');

const requestPath = <T extends JiraDryRunRequest | JiraSubmitRequest>(
  value: unknown,
  keys: string[],
  build: (record: Record<string, unknown>, repositoryPath: string) => T
): FactoryResult<T, ErrorName> => {
  const root = requireRecord(value, 'InvalidJiraSubmissionPayload', '$');
  if (!root.ok) return root;
  const exact = requireExactKeys(root.value, keys, 'InvalidJiraSubmissionPayload', '$');
  if (!exact.ok) return exact;
  const repositoryPath = requireString(root.value.repositoryPath, 'InvalidJiraSubmissionPayload', '$.repositoryPath');
  if (!repositoryPath.ok) return repositoryPath;
  if (!safeAbsolutePath(repositoryPath.value)) {
    return invalid('InvalidJiraSubmissionPayload', 'repositoryPath must be absolute and safe', '$.repositoryPath');
  }
  return { ok: true, value: build(root.value, repositoryPath.value) };
};

export const createJiraDryRunRequest = (value: unknown): FactoryResult<JiraDryRunRequest, ErrorName> =>
  requestPath(value, ['repositoryPath'], (_record, repositoryPath) => ({ repositoryPath }));

export const createJiraSubmitRequest = (value: unknown): FactoryResult<JiraSubmitRequest, ErrorName> =>
  (() => {
    const root = requireRecord(value, 'InvalidJiraSubmissionPayload', '$');
    if (!root.ok) return root;
    const exact = requireExactKeys(root.value, ['repositoryPath', 'subscriptionId'], 'InvalidJiraSubmissionPayload', '$');
    if (!exact.ok) return exact;
    const repositoryPath = requireString(root.value.repositoryPath, 'InvalidJiraSubmissionPayload', '$.repositoryPath');
    const subscriptionId = requireString(root.value.subscriptionId, 'InvalidJiraSubmissionPayload', '$.subscriptionId');
    if (!repositoryPath.ok) return repositoryPath;
    if (!subscriptionId.ok) return subscriptionId;
    if (!safeAbsolutePath(repositoryPath.value)) {
      return invalid('InvalidJiraSubmissionPayload', 'repositoryPath must be absolute and safe', '$.repositoryPath');
    }
    return { ok: true, value: { repositoryPath: repositoryPath.value, subscriptionId: subscriptionId.value } };
  })();

export const createJiraSubmissionAck = (value: unknown): FactoryResult<JiraSubmissionAck, ErrorName> => {
  const root = requireRecord(value, 'InvalidJiraSubmissionPayload', '$');
  if (!root.ok) return root;
  const exact = requireExactKeys(root.value, ['subscriptionId', 'accepted', 'featureDir'], 'InvalidJiraSubmissionPayload', '$');
  if (!exact.ok) return exact;
  const subscriptionId = requireString(root.value.subscriptionId, 'InvalidJiraSubmissionPayload', '$.subscriptionId');
  const featureDir = requireString(root.value.featureDir, 'InvalidJiraSubmissionPayload', '$.featureDir');
  if (!subscriptionId.ok) return subscriptionId;
  if (!featureDir.ok) return featureDir;
  return root.value.accepted === true
    ? { ok: true, value: { subscriptionId: subscriptionId.value, accepted: true, featureDir: featureDir.value } }
    : invalid('InvalidJiraSubmissionPayload', 'accepted must be true', '$.accepted');
};

const isIssueArray = (value: unknown): value is JiraSubmissionIssue[] =>
  Array.isArray(value) && value.every((item) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) return false;
    const record = item as Record<string, unknown>;
    return typeof record.nodeId === 'string' && typeof record.key === 'string' && typeof record.url === 'string';
  });

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

export const createJiraSubmissionEvent = (value: unknown): FactoryResult<JiraSubmissionEvent, ErrorName> => {
  const root = requireRecord(value, 'InvalidJiraSubmissionEvent', '$');
  if (!root.ok) return root;
  const type = root.value.type;
  if (type === 'progress') {
    const exact = requireExactKeys(root.value, ['type', 'nodeId', 'message', 'timestamp'], 'InvalidJiraSubmissionEvent', '$');
    if (!exact.ok) return exact;
    const nodeId = requireString(root.value.nodeId, 'InvalidJiraSubmissionEvent', '$.nodeId');
    const message = requireString(root.value.message, 'InvalidJiraSubmissionEvent', '$.message');
    const timestamp = requireString(root.value.timestamp, 'InvalidJiraSubmissionEvent', '$.timestamp');
    if (!nodeId.ok) return nodeId;
    if (!message.ok) return message;
    if (!timestamp.ok) return timestamp;
    return { ok: true, value: { type, nodeId: nodeId.value, message: message.value, timestamp: timestamp.value } };
  }
  if (type === 'result') {
    const allowed = ['type', 'nodeId', 'status', 'issueKey', 'issueUrl', 'timestamp'];
    if (Object.keys(root.value).some((key) => !allowed.includes(key))) {
      return invalid('InvalidJiraSubmissionEvent', 'payload contains unexpected key', '$');
    }
    const nodeId = requireString(root.value.nodeId, 'InvalidJiraSubmissionEvent', '$.nodeId');
    const timestamp = requireString(root.value.timestamp, 'InvalidJiraSubmissionEvent', '$.timestamp');
    if (!nodeId.ok) return nodeId;
    if (!timestamp.ok) return timestamp;
    const status = root.value.status;
    if (status !== 'verified' && status !== 'duplicate' && status !== 'failed') {
      return invalid('InvalidJiraSubmissionEvent', 'status must be verified, duplicate, or failed', '$.status');
    }
    return {
      ok: true,
      value: {
        type,
        nodeId: nodeId.value,
        status,
        issueKey: typeof root.value.issueKey === 'string' ? root.value.issueKey : undefined,
        issueUrl: typeof root.value.issueUrl === 'string' ? root.value.issueUrl : undefined,
        timestamp: timestamp.value
      }
    };
  }
  if (type === 'done') {
    const allowed = ['type', 'status', 'reason', 'issues', 'remainingNodeIds', 'timestamp'];
    if (Object.keys(root.value).some((key) => !allowed.includes(key))) {
      return invalid('InvalidJiraSubmissionEvent', 'payload contains unexpected key', '$');
    }
    const timestamp = requireString(root.value.timestamp, 'InvalidJiraSubmissionEvent', '$.timestamp');
    if (!timestamp.ok) return timestamp;
    if (!isIssueArray(root.value.issues)) {
      return invalid('InvalidJiraSubmissionEvent', 'issues must be issue results', '$.issues');
    }
    if (root.value.status === 'pass') {
      return { ok: true, value: { type, status: 'pass', issues: root.value.issues, timestamp: timestamp.value } };
    }
    if (root.value.status === 'fail') {
      const reason = requireString(root.value.reason, 'InvalidJiraSubmissionEvent', '$.reason');
      if (!reason.ok) return reason;
      if (!isStringArray(root.value.remainingNodeIds)) {
        return invalid('InvalidJiraSubmissionEvent', 'remainingNodeIds must be strings', '$.remainingNodeIds');
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
  return invalid('InvalidJiraSubmissionEvent', 'unsupported JIRA submission event', '$.type');
};
