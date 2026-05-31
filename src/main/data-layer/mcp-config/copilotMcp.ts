import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { findOAuthEvidence } from './authEvidence';
import { resolveCopilotMcpConfigPath, resolveCopilotOAuthConfigDir, type CopilotPathEnv } from './paths';
import { ATLASSIAN_AUTHV2_URL, detectAtlassianServer, parseMcpConfig } from './parse';
import type { McpConfigFixResult, McpConfigStatus } from './types';

const execFileAsync = promisify(execFile);

export type ExecFileLike = (
  file: string,
  args: string[],
  options: { shell: false }
) => Promise<{ stdout?: string; stderr?: string }>;

export const checkCopilotMcpConfig = async (env: CopilotPathEnv = process.env): Promise<McpConfigStatus> => {
  const configPath = resolveCopilotMcpConfigPath(env);
  let contents = '';
  try {
    contents = await readFile(configPath, 'utf8');
  } catch {
    return {
      state: 'not_configured',
      configPath,
      isLegacyEndpoint: false,
      tokenFilePresent: false,
      message: 'Atlassian MCP is not configured for GitHub Copilot CLI.'
    };
  }

  const parsed = parseMcpConfig(contents);
  if (!parsed.ok) {
    return {
      state: 'malformed_config',
      configPath,
      isLegacyEndpoint: false,
      tokenFilePresent: false,
      message: parsed.error.message
    };
  }

  const atlassian = detectAtlassianServer(parsed.value);
  if (atlassian === undefined) {
    return {
      state: 'not_configured',
      configPath,
      isLegacyEndpoint: false,
      tokenFilePresent: false,
      message: 'Atlassian MCP is not configured for GitHub Copilot CLI.'
    };
  }

  const evidence = await findOAuthEvidence(resolveCopilotOAuthConfigDir(env), atlassian.serverUrl);
  return {
    state: evidence.authenticated ? 'authenticated' : 'configured_needs_auth',
    configPath,
    serverName: atlassian.serverName,
    serverUrl: atlassian.serverUrl,
    isLegacyEndpoint: atlassian.isLegacyEndpoint,
    tokenFilePresent: evidence.tokenFilePresent,
    message: evidence.authenticated
      ? 'Atlassian MCP is authenticated through GitHub Copilot CLI.'
      : 'Atlassian MCP is configured. Reauthorize in Copilot to finish connecting.'
  };
};

export const fixCopilotMcpConfig = async ({
  status,
  execFile = execFileAsync as ExecFileLike
}: {
  status: McpConfigStatus;
  execFile?: ExecFileLike;
}): Promise<McpConfigFixResult> => {
  if (status.state === 'malformed_config') {
    return { status, writeAttempted: false, writeKind: 'none', error: { code: 'malformed_config', message: status.message } };
  }
  if (status.state === 'authenticated' || (status.state === 'configured_needs_auth' && !status.isLegacyEndpoint)) {
    return { status, writeAttempted: false, writeKind: 'none' };
  }

  const writeKind = status.isLegacyEndpoint ? 'upgraded' : 'configured';
  try {
    await execFile('copilot', ['mcp', 'add', '--transport', 'http', 'atlassian', ATLASSIAN_AUTHV2_URL], { shell: false });
    return {
      status: {
        ...status,
        state: 'configured_needs_auth',
        serverName: 'atlassian',
        serverUrl: ATLASSIAN_AUTHV2_URL,
        isLegacyEndpoint: false,
        message: 'Atlassian MCP is configured. Reauthorize in Copilot to finish connecting.'
      },
      writeAttempted: true,
      writeKind,
      activityNotice:
        writeKind === 'upgraded'
          ? 'Updated Atlassian MCP to the current endpoint — reauthorize in Copilot.'
          : 'Configured Atlassian MCP for GitHub Copilot CLI.'
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: { ...status, state: 'write_failed_warning', message },
      writeAttempted: true,
      writeKind,
      error: { code: 'copilot_mcp_add_failed', message }
    };
  }
};
