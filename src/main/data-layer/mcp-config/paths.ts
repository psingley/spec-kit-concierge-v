import os from 'node:os';
import path from 'node:path';

export type CopilotPathEnv = {
  COPILOT_HOME?: string;
};

export const resolveCopilotHome = (env: CopilotPathEnv = process.env): string =>
  env.COPILOT_HOME !== undefined && env.COPILOT_HOME.length > 0 ? env.COPILOT_HOME : path.join(os.homedir(), '.copilot');

export const resolveCopilotMcpConfigPath = (env: CopilotPathEnv = process.env): string =>
  path.join(resolveCopilotHome(env), 'mcp-config.json');

export const resolveCopilotOAuthConfigDir = (env: CopilotPathEnv = process.env): string =>
  path.join(resolveCopilotHome(env), 'mcp-oauth-config');
