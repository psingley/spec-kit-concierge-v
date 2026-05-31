import { invalid, optionalString, requireBoolean, requireExactKeys, requireRecord, requireString, type FactoryResult } from './factoryUtils';
import type { McpConfigFixResult, McpConfigState, McpConfigStatus } from '../data-layer/mcp-config/types';

type ErrorName = 'InvalidMcpConfigPayload';

export type McpConfigFixRequest = {
  reason: 'startup' | 'workspace_repo_changed' | 'user_action';
};

const isState = (value: unknown): value is McpConfigState =>
  value === 'not_configured' ||
  value === 'configured_needs_auth' ||
  value === 'authenticated' ||
  value === 'malformed_config' ||
  value === 'write_failed_warning';

const isWriteKind = (value: unknown): value is McpConfigFixResult['writeKind'] =>
  value === 'configured' || value === 'upgraded' || value === 'none';

const requireAllowedKeys = (
  value: Record<string, unknown>,
  allowed: string[],
  required: string[],
  path: string
): FactoryResult<void, ErrorName> => {
  const unexpected = Object.keys(value).find((key) => !allowed.includes(key));
  if (unexpected !== undefined) {
    return invalid('InvalidMcpConfigPayload', 'payload contains an unexpected key', `${path}.${unexpected}`);
  }
  const missing = required.find((key) => !(key in value));
  if (missing !== undefined) {
    return invalid('InvalidMcpConfigPayload', 'payload is missing a required key', `${path}.${missing}`);
  }
  return { ok: true, value: undefined };
};

export const createMcpConfigFixRequest = (value: unknown): FactoryResult<McpConfigFixRequest, ErrorName> => {
  const root = requireRecord(value, 'InvalidMcpConfigPayload', '$');
  if (!root.ok) return root;
  const keys = requireExactKeys(root.value, ['reason'], 'InvalidMcpConfigPayload', '$');
  if (!keys.ok) return keys;
  if (root.value.reason !== 'startup' && root.value.reason !== 'workspace_repo_changed' && root.value.reason !== 'user_action') {
    return invalid('InvalidMcpConfigPayload', 'reason is invalid', '$.reason');
  }
  return { ok: true, value: { reason: root.value.reason } };
};

export const createMcpConfigCheckResponse = (value: unknown): FactoryResult<McpConfigStatus, ErrorName> => {
  const root = requireRecord(value, 'InvalidMcpConfigPayload', '$');
  if (!root.ok) return root;
  const keys = requireAllowedKeys(
    root.value,
    ['state', 'configPath', 'serverName', 'serverUrl', 'isLegacyEndpoint', 'tokenFilePresent', 'message'],
    ['state', 'configPath', 'isLegacyEndpoint', 'tokenFilePresent', 'message'],
    '$'
  );
  if (!keys.ok) return keys;
  if (!isState(root.value.state)) return invalid('InvalidMcpConfigPayload', 'state is invalid', '$.state');
  const configPath = requireString(root.value.configPath, 'InvalidMcpConfigPayload', '$.configPath');
  const isLegacyEndpoint = requireBoolean(root.value.isLegacyEndpoint, 'InvalidMcpConfigPayload', '$.isLegacyEndpoint');
  const tokenFilePresent = requireBoolean(root.value.tokenFilePresent, 'InvalidMcpConfigPayload', '$.tokenFilePresent');
  const message = requireString(root.value.message, 'InvalidMcpConfigPayload', '$.message');
  if (!configPath.ok) return configPath;
  if (!isLegacyEndpoint.ok) return isLegacyEndpoint;
  if (!tokenFilePresent.ok) return tokenFilePresent;
  if (!message.ok) return message;
  return {
    ok: true,
    value: {
      state: root.value.state,
      configPath: configPath.value,
      serverName: optionalString(root.value.serverName),
      serverUrl: optionalString(root.value.serverUrl),
      isLegacyEndpoint: isLegacyEndpoint.value,
      tokenFilePresent: tokenFilePresent.value,
      message: message.value
    }
  };
};

export const createMcpConfigFixResponse = (value: unknown): FactoryResult<McpConfigFixResult, ErrorName> => {
  const root = requireRecord(value, 'InvalidMcpConfigPayload', '$');
  if (!root.ok) return root;
  const keys = requireAllowedKeys(
    root.value,
    ['status', 'writeAttempted', 'writeKind', 'activityNotice', 'error'],
    ['status', 'writeAttempted', 'writeKind'],
    '$'
  );
  if (!keys.ok) return keys;
  const status = createMcpConfigCheckResponse(root.value.status);
  const writeAttempted = requireBoolean(root.value.writeAttempted, 'InvalidMcpConfigPayload', '$.writeAttempted');
  if (!status.ok) return status;
  if (!writeAttempted.ok) return writeAttempted;
  if (!isWriteKind(root.value.writeKind)) return invalid('InvalidMcpConfigPayload', 'writeKind is invalid', '$.writeKind');
  const result: McpConfigFixResult = {
    status: status.value,
    writeAttempted: writeAttempted.value,
    writeKind: root.value.writeKind,
    activityNotice: optionalString(root.value.activityNotice)
  };
  if (root.value.error !== undefined) {
    const error = requireRecord(root.value.error, 'InvalidMcpConfigPayload', '$.error');
    if (!error.ok) return error;
    const code = requireString(error.value.code, 'InvalidMcpConfigPayload', '$.error.code');
    const message = requireString(error.value.message, 'InvalidMcpConfigPayload', '$.error.message');
    if (!code.ok) return code;
    if (!message.ok) return message;
    result.error = { code: code.value, message: message.value };
  }
  return { ok: true, value: result };
};
