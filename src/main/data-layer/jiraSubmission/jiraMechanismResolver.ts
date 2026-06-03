import { checkCopilotMcpConfig } from '../mcp-config/copilotMcp';
import type { JiraBoardMappingService } from './jiraBoardMappingService';
import type { JiraSubmissionCredentialService } from './jiraSubmissionCredentialService';
import type { JiraRestCredential } from './restCreateTurn';

type McpStatus = {
  state: string;
  tokenFilePresent?: boolean;
};

export type JiraMechanismResolution =
  | { status: 'direct'; credential: JiraRestCredential; projectKey: string; boardSource: 'user' | 'seed' }
  | { status: 'delegated'; projectKey: string; boardSource: 'user' | 'seed' }
  | { status: 'reauth_required' }
  | { status: 'not_configured' }
  | { status: 'board_not_configured'; mechanism: 'direct' | 'delegated' };

const configuredBoard = async (
  repositoryPath: string,
  boardMappingService: JiraBoardMappingService
): Promise<{ projectKey: string; source: 'user' | 'seed' } | undefined> => {
  const board = await boardMappingService.getBoard(repositoryPath);
  return board.projectKey !== undefined && board.source !== 'none'
    ? { projectKey: board.projectKey, source: board.source }
    : undefined;
};

export const resolveJiraSubmissionMechanism = async ({
  repositoryPath,
  credentialService,
  boardMappingService,
  checkMcp = checkCopilotMcpConfig
}: {
  repositoryPath: string;
  credentialService: Pick<JiraSubmissionCredentialService, 'loadCredential' | 'getAuthState'>;
  boardMappingService: JiraBoardMappingService | Pick<JiraBoardMappingService, 'getBoard'>;
  checkMcp?: () => Promise<McpStatus>;
}): Promise<JiraMechanismResolution> => {
  const credential = await credentialService.loadCredential();
  if (credential !== undefined) {
    const authState = await credentialService.getAuthState();
    if (authState.state === 'expired') return { status: 'reauth_required' };
    if (authState.state === 'warm') {
      const board = await configuredBoard(repositoryPath, boardMappingService as JiraBoardMappingService);
      if (board === undefined) return { status: 'board_not_configured', mechanism: 'direct' };
      return {
        status: 'direct',
        credential: { email: credential.email, token: credential.token, baseUrl: credential.baseUrl },
        projectKey: board.projectKey,
        boardSource: board.source
      };
    }
  }

  const mcp = await checkMcp();
  if (mcp.state === 'authenticated' && mcp.tokenFilePresent === true) {
    const board = await configuredBoard(repositoryPath, boardMappingService as JiraBoardMappingService);
    if (board === undefined) return { status: 'board_not_configured', mechanism: 'delegated' };
    return { status: 'delegated', projectKey: board.projectKey, boardSource: board.source };
  }

  return { status: 'not_configured' };
};
