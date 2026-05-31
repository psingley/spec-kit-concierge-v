import {
  optionalString,
  requireBoolean,
  requireExactKeys,
  requireRecord,
  requireString,
  type RendererBoundaryErrorName,
  type RendererFactoryResult
} from './factoryUtils';

type ErrorName = 'InvalidMcpConfig';

export type RendererMcpConfigStatus = {
  state: 'not_configured' | 'configured_needs_auth' | 'authenticated' | 'malformed_config' | 'write_failed_warning';
  configPath: string;
  serverName?: string;
  serverUrl?: string;
  isLegacyEndpoint: boolean;
  tokenFilePresent: boolean;
  message: string;
};

export type RendererMcpConfigFixResult = {
  status: RendererMcpConfigStatus;
  writeAttempted: boolean;
  writeKind: 'configured' | 'upgraded' | 'none';
  activityNotice?: string;
  error?: { code: string; message: string };
};

const isState = (value: unknown): value is RendererMcpConfigStatus['state'] =>
  value === 'not_configured' ||
  value === 'configured_needs_auth' ||
  value === 'authenticated' ||
  value === 'malformed_config' ||
  value === 'write_failed_warning';

export const parseRendererMcpConfigStatus = (
  value: unknown
): RendererFactoryResult<RendererMcpConfigStatus, RendererBoundaryErrorName<ErrorName>> => {
  const root = requireRecord(value, 'InvalidMcpConfig', '$');
  if (!root.ok) return root;
  const keys = requireExactKeys<ErrorName>(root.value, [
    'state',
    'configPath',
    'serverName',
    'serverUrl',
    'isLegacyEndpoint',
    'tokenFilePresent',
    'message'
  ]);
  if (!keys.ok) return keys;
  if (!isState(root.value.state)) {
    return { ok: false, error: { name: 'InvalidMcpConfig', message: 'state is invalid', path: '$.state' } };
  }
  const configPath = requireString(root.value.configPath, 'InvalidMcpConfig', '$.configPath');
  const isLegacyEndpoint = requireBoolean(root.value.isLegacyEndpoint, 'InvalidMcpConfig', '$.isLegacyEndpoint');
  const tokenFilePresent = requireBoolean(root.value.tokenFilePresent, 'InvalidMcpConfig', '$.tokenFilePresent');
  const message = requireString(root.value.message, 'InvalidMcpConfig', '$.message');
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

export const parseRendererMcpConfigFixResult = (
  value: unknown
): RendererFactoryResult<RendererMcpConfigFixResult, RendererBoundaryErrorName<ErrorName>> => {
  const root = requireRecord(value, 'InvalidMcpConfig', '$');
  if (!root.ok) return root;
  const keys = requireExactKeys<ErrorName>(root.value, ['status', 'writeAttempted', 'writeKind', 'activityNotice', 'error']);
  if (!keys.ok) return keys;
  const status = parseRendererMcpConfigStatus(root.value.status);
  const writeAttempted = requireBoolean(root.value.writeAttempted, 'InvalidMcpConfig', '$.writeAttempted');
  if (!status.ok) return status;
  if (!writeAttempted.ok) return writeAttempted;
  if (root.value.writeKind !== 'configured' && root.value.writeKind !== 'upgraded' && root.value.writeKind !== 'none') {
    return { ok: false, error: { name: 'InvalidMcpConfig', message: 'writeKind is invalid', path: '$.writeKind' } };
  }
  return {
    ok: true,
    value: {
      status: status.value,
      writeAttempted: writeAttempted.value,
      writeKind: root.value.writeKind,
      activityNotice: optionalString(root.value.activityNotice)
    }
  };
};
