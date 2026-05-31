export type McpConfigState =
  | 'not_configured'
  | 'configured_needs_auth'
  | 'authenticated'
  | 'malformed_config'
  | 'write_failed_warning';

export type McpConfigStatus = {
  state: McpConfigState;
  configPath: string;
  serverName?: string;
  serverUrl?: string;
  isLegacyEndpoint: boolean;
  tokenFilePresent: boolean;
  message: string;
};

export type McpConfigFixResult = {
  status: McpConfigStatus;
  writeAttempted: boolean;
  writeKind: 'configured' | 'upgraded' | 'none';
  activityNotice?: string;
  error?: {
    code: string;
    message: string;
  };
};
