import path from 'node:path';
import { invalid, requireExactKeys, requireRecord, requireString, type FactoryResult } from './factoryUtils';
import type { JiraSubmissionNode } from '../data-layer/jiraSubmission/plan';
import type { JiraAuthState, JiraCredentialSaveResponse, SaveJiraSubmissionCredentialRequest } from '../data-layer/jiraSubmission/jiraSubmissionCredentialService';
import type { JiraBoardMapping } from '../data-layer/jiraSubmission/jiraBoardMappingService';
import type { JiraBoardSuggestion, JiraProject } from '../data-layer/jiraSubmission/jiraRestClient';

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

export type JiraBoardSetRequest = {
  repositoryPath: string;
  projectKey: string;
};

export type JiraProjectSearchRequest = {
  query?: string;
};

export type JiraBoardSuggestResponse = {
  boards: JiraBoardSuggestion[];
};

export type JiraProjectSearchResponse = {
  projects: JiraProject[];
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

const containsTokenKey = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(containsTokenKey);
  if (typeof value !== 'object' || value === null) return false;
  return Object.entries(value as Record<string, unknown>).some(([key, child]) =>
    key.toLowerCase() === 'token' || containsTokenKey(child)
  );
};

const rejectTokenShape = <T>(value: T): FactoryResult<T, ErrorName> =>
  containsTokenKey(value)
    ? invalid('InvalidJiraSubmissionPayload', 'response must not contain token', '$')
    : { ok: true, value };

const parseAuthState = (value: unknown): FactoryResult<JiraAuthState, ErrorName> => {
  const root = requireRecord(value, 'InvalidJiraSubmissionPayload', '$');
  if (!root.ok) return root;
  if (containsTokenKey(root.value)) return invalid('InvalidJiraSubmissionPayload', 'auth state must not contain token', '$');
  const state = root.value.state;
  if (state !== 'warm' && state !== 'expired' && state !== 'none') {
    return invalid('InvalidJiraSubmissionPayload', 'state must be warm, expired, or none', '$.state');
  }
  if (state === 'none') return { ok: true, value: { state } };
  return {
    ok: true,
    value: {
      state,
      displayName: typeof root.value.displayName === 'string' ? root.value.displayName : undefined,
      emailAddress: typeof root.value.emailAddress === 'string' ? root.value.emailAddress : undefined,
      accountId: typeof root.value.accountId === 'string' ? root.value.accountId : undefined,
      expiryDate: typeof root.value.expiryDate === 'string' ? root.value.expiryDate : undefined,
      baseUrl: typeof root.value.baseUrl === 'string' ? root.value.baseUrl : undefined
    }
  };
};

export const createJiraCredentialSaveRequest = (value: unknown): FactoryResult<SaveJiraSubmissionCredentialRequest, ErrorName> => {
  const root = requireRecord(value, 'InvalidJiraSubmissionPayload', '$');
  if (!root.ok) return root;
  const allowed = ['email', 'token', 'baseUrl'];
  if (Object.keys(root.value).some((key) => !allowed.includes(key))) {
    return invalid('InvalidJiraSubmissionPayload', 'payload contains unexpected key', '$');
  }
  const email = requireString(root.value.email, 'InvalidJiraSubmissionPayload', '$.email');
  const token = requireString(root.value.token, 'InvalidJiraSubmissionPayload', '$.token');
  if (!email.ok) return email;
  if (!token.ok) return token;
  return {
    ok: true,
    value: {
      email: email.value,
      token: token.value,
      baseUrl: typeof root.value.baseUrl === 'string' ? root.value.baseUrl : undefined
    }
  };
};

export const createJiraCredentialSaveResponse = (value: unknown): FactoryResult<JiraCredentialSaveResponse, ErrorName> => {
  const root = requireRecord(value, 'InvalidJiraSubmissionPayload', '$');
  if (!root.ok) return root;
  if (root.value.ok === false) {
    const exact = requireExactKeys(root.value, ['ok', 'status'], 'InvalidJiraSubmissionPayload', '$');
    if (!exact.ok) return exact;
    if (root.value.status !== 'site_not_found' && root.value.status !== 'invalid_credentials') {
      return invalid('InvalidJiraSubmissionPayload', 'status must be site_not_found or invalid_credentials', '$.status');
    }
    return rejectTokenShape({ ok: false, status: root.value.status });
  }
  if (root.value.ok === true) {
    const exact = requireExactKeys(root.value, ['ok', 'authState'], 'InvalidJiraSubmissionPayload', '$');
    if (!exact.ok) return exact;
    const authState = parseAuthState(root.value.authState);
    return authState.ok ? rejectTokenShape({ ok: true, authState: authState.value }) : authState;
  }
  return invalid('InvalidJiraSubmissionPayload', 'ok must be boolean', '$.ok');
};

export const createJiraAuthStateResponse = (value: unknown): FactoryResult<JiraAuthState, ErrorName> =>
  parseAuthState(value);

export const createJiraBoardGetResponse = (value: unknown): FactoryResult<JiraBoardMapping, ErrorName> => {
  const root = requireRecord(value, 'InvalidJiraSubmissionPayload', '$');
  if (!root.ok) return root;
  if (containsTokenKey(root.value)) return invalid('InvalidJiraSubmissionPayload', 'board response must not contain token', '$');
  const allowed = ['projectKey', 'source'];
  if (Object.keys(root.value).some((key) => !allowed.includes(key))) {
    return invalid('InvalidJiraSubmissionPayload', 'payload contains unexpected key', '$');
  }
  const source = root.value.source;
  if (source !== 'user' && source !== 'seed' && source !== 'none') {
    return invalid('InvalidJiraSubmissionPayload', 'source must be user, seed, or none', '$.source');
  }
  return { ok: true, value: { projectKey: typeof root.value.projectKey === 'string' ? root.value.projectKey : undefined, source } };
};

export const createJiraBoardSetRequest = (value: unknown): FactoryResult<JiraBoardSetRequest, ErrorName> =>
  (() => {
    const root = requireRecord(value, 'InvalidJiraSubmissionPayload', '$');
    if (!root.ok) return root;
    const exact = requireExactKeys(root.value, ['repositoryPath', 'projectKey'], 'InvalidJiraSubmissionPayload', '$');
    if (!exact.ok) return exact;
    const repositoryPath = requireString(root.value.repositoryPath, 'InvalidJiraSubmissionPayload', '$.repositoryPath');
    const projectKey = requireString(root.value.projectKey, 'InvalidJiraSubmissionPayload', '$.projectKey');
    if (!repositoryPath.ok) return repositoryPath;
    if (!projectKey.ok) return projectKey;
    if (!safeAbsolutePath(repositoryPath.value)) {
      return invalid('InvalidJiraSubmissionPayload', 'repositoryPath must be absolute and safe', '$.repositoryPath');
    }
    return { ok: true, value: { repositoryPath: repositoryPath.value, projectKey: projectKey.value } };
  })();

export const createJiraProjectSearchRequest = (value: unknown): FactoryResult<JiraProjectSearchRequest, ErrorName> => {
  const root = requireRecord(value, 'InvalidJiraSubmissionPayload', '$');
  if (!root.ok) return root;
  const allowed = ['query'];
  if (Object.keys(root.value).some((key) => !allowed.includes(key))) {
    return invalid('InvalidJiraSubmissionPayload', 'payload contains unexpected key', '$');
  }
  return { ok: true, value: { query: typeof root.value.query === 'string' ? root.value.query : undefined } };
};

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
