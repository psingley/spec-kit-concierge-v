import type { IpcMain } from 'electron';
import type { MainLogger } from '../logging';
import { buildJiraSubmissionArtifacts, createBoundCliJiraCreateTurn, runJiraSubmission as runJiraSubmissionDefault } from '../data-layer/jiraSubmission/service';
import type { JiraCreateTurn } from '../data-layer/jiraSubmission/runner';
import { assertOnePayload, getSenderContext, latencyMs, logHandlerError, toError } from './handlerUtils';
import { createJiraBoardMappingService, type JiraBoardMappingService } from '../data-layer/jiraSubmission/jiraBoardMappingService';
import { createJiraRestClient } from '../data-layer/jiraSubmission/jiraRestClient';
import { resolveJiraSubmissionMechanism, type JiraMechanismResolution } from '../data-layer/jiraSubmission/jiraMechanismResolver';
import { createJiraSubmissionCredentialService, type JiraSubmissionCredentialService } from '../data-layer/jiraSubmission/jiraSubmissionCredentialService';
import { createRestJiraCreateTurn, type CreateRestJiraCreateTurnOptions } from '../data-layer/jiraSubmission/restCreateTurn';
import { sanitizeErrorMessage } from '../data-layer/jiraSubmission/redaction';
import {
  createJiraBoardGetResponse,
  createJiraBoardSetRequest,
  createJiraCredentialSaveRequest,
  createJiraCredentialSaveResponse,
  createJiraDryRunRequest,
  createJiraProjectSearchRequest,
  createJiraSubmitRequest,
  type JiraDryRunResponse,
  type JiraSubmissionAck,
  type JiraSubmissionEvent
} from './jiraSubmission.factory';

export const JIRA_DRY_RUN_CHANNEL = 'jira:dryRun';
export const JIRA_SUBMIT_CHANNEL = 'jira:submit';
export const JIRA_SUBMIT_EVENT_CHANNEL = 'jira:submit:event';
export const JIRA_CREDENTIAL_SAVE_CHANNEL = 'jira:credential:save';
export const JIRA_CREDENTIAL_CLEAR_CHANNEL = 'jira:credential:clear';
export const JIRA_CREDENTIAL_STATE_CHANNEL = 'jira:credential:state';
export const JIRA_BOARD_GET_CHANNEL = 'jira:board:get';
export const JIRA_BOARD_SET_CHANNEL = 'jira:board:set';
export const JIRA_BOARD_SUGGEST_CHANNEL = 'jira:board:suggest';
export const JIRA_PROJECT_SEARCH_CHANNEL = 'jira:project:search';

export type RegisterJiraSubmissionIpcOptions = {
  ipcMain: Pick<IpcMain, 'handle'>;
  logger: Pick<MainLogger, 'info' | 'warn' | 'error'>;
  userDataPath?: string;
  now?: () => number;
  runCreateTurn?: JiraCreateTurn;
  runJiraSubmission?: typeof runJiraSubmissionDefault;
  resolveMechanism?: (repositoryPath: string) => Promise<JiraMechanismResolution>;
  credentialService?: JiraSubmissionCredentialService;
  boardMappingService?: JiraBoardMappingService;
  createRestTurn?: (options: CreateRestJiraCreateTurnOptions) => JiraCreateTurn;
  createBoundTurn?: typeof createBoundCliJiraCreateTurn;
};

export const registerJiraSubmissionIpc = ({
  ipcMain,
  logger,
  userDataPath,
  now = () => performance.now(),
  runCreateTurn,
  runJiraSubmission = runJiraSubmissionDefault,
  credentialService = userDataPath === undefined ? undefined : createJiraSubmissionCredentialService({ userDataPath }),
  boardMappingService = userDataPath === undefined ? undefined : createJiraBoardMappingService({ userDataPath }),
  resolveMechanism,
  createRestTurn = createRestJiraCreateTurn,
  createBoundTurn = createBoundCliJiraCreateTurn
}: RegisterJiraSubmissionIpcOptions): void => {
  const requireCredentialService = (): JiraSubmissionCredentialService => {
    if (credentialService === undefined) throw new Error('Jira credential service is unavailable.');
    return credentialService;
  };
  const requireBoardMappingService = (): JiraBoardMappingService => {
    if (boardMappingService === undefined) throw new Error('Jira board mapping service is unavailable.');
    return boardMappingService;
  };
  const resolve = (repositoryPath: string): Promise<JiraMechanismResolution> =>
    resolveMechanism === undefined
      ? resolveJiraSubmissionMechanism({
          repositoryPath,
          credentialService: requireCredentialService(),
          boardMappingService: requireBoardMappingService()
        })
      : resolveMechanism(repositoryPath);

  ipcMain.handle(JIRA_DRY_RUN_CHANNEL, async (event, ...args: unknown[]): Promise<JiraDryRunResponse> => {
    const startedAt = now();
    const context = getSenderContext(event);
    try {
      const request = createJiraDryRunRequest(assertOnePayload(JIRA_DRY_RUN_CHANNEL, args));
      if (!request.ok) throw toError(request.error.message);
      const artifacts = await buildJiraSubmissionArtifacts(request.value.repositoryPath);
      logger.info({ channel: JIRA_DRY_RUN_CHANNEL, context, success: true, latencyMs: latencyMs(startedAt, now) }, 'ipc handler invocation');
      return {
        featureDir: artifacts.featureDirRelative,
        stateDir: artifacts.plan.stateDir,
        nodes: artifacts.plan.nodes.map((node) => ({
          id: node.id,
          issueType: node.issueType,
          summary: node.summary,
          parentId: node.parentId,
          labels: node.labels
        })),
        warnings: artifacts.plan.warnings
      };
    } catch (error) {
      logHandlerError(logger, { channel: JIRA_DRY_RUN_CHANNEL, context, startedAt, now }, error);
      throw error;
    }
  });

  ipcMain.handle(JIRA_CREDENTIAL_SAVE_CHANNEL, async (event, ...args: unknown[]) => {
    const startedAt = now();
    const context = getSenderContext(event);
    try {
      const request = createJiraCredentialSaveRequest(assertOnePayload(JIRA_CREDENTIAL_SAVE_CHANNEL, args));
      if (!request.ok) throw toError(request.error.message);
      const response = await requireCredentialService().saveCredential(request.value);
      const boundary = createJiraCredentialSaveResponse(response);
      if (!boundary.ok) throw toError(boundary.error.message);
      logger.info({ channel: JIRA_CREDENTIAL_SAVE_CHANNEL, context, success: true, latencyMs: latencyMs(startedAt, now) }, 'ipc handler invocation');
      return boundary.value;
    } catch (error) {
      logHandlerError(logger, { channel: JIRA_CREDENTIAL_SAVE_CHANNEL, context, startedAt, now }, error);
      throw error;
    }
  });

  ipcMain.handle(JIRA_CREDENTIAL_CLEAR_CHANNEL, async (event, ...args: unknown[]) => {
    const startedAt = now();
    const context = getSenderContext(event);
    try {
      assertOnePayload(JIRA_CREDENTIAL_CLEAR_CHANNEL, args);
      await requireCredentialService().clearCredential();
      logger.info({ channel: JIRA_CREDENTIAL_CLEAR_CHANNEL, context, success: true, latencyMs: latencyMs(startedAt, now) }, 'ipc handler invocation');
      return { ok: true };
    } catch (error) {
      logHandlerError(logger, { channel: JIRA_CREDENTIAL_CLEAR_CHANNEL, context, startedAt, now }, error);
      throw error;
    }
  });

  ipcMain.handle(JIRA_CREDENTIAL_STATE_CHANNEL, async (event, ...args: unknown[]) => {
    const startedAt = now();
    const context = getSenderContext(event);
    try {
      assertOnePayload(JIRA_CREDENTIAL_STATE_CHANNEL, args);
      const authState = await requireCredentialService().getAuthState();
      logger.info({ channel: JIRA_CREDENTIAL_STATE_CHANNEL, context, success: true, latencyMs: latencyMs(startedAt, now) }, 'ipc handler invocation');
      return authState;
    } catch (error) {
      logHandlerError(logger, { channel: JIRA_CREDENTIAL_STATE_CHANNEL, context, startedAt, now }, error);
      throw error;
    }
  });

  ipcMain.handle(JIRA_BOARD_GET_CHANNEL, async (event, ...args: unknown[]) => {
    const startedAt = now();
    const context = getSenderContext(event);
    try {
      const request = createJiraDryRunRequest(assertOnePayload(JIRA_BOARD_GET_CHANNEL, args));
      if (!request.ok) throw toError(request.error.message);
      const board = await requireBoardMappingService().getBoard(request.value.repositoryPath);
      const boundary = createJiraBoardGetResponse(board);
      if (!boundary.ok) throw toError(boundary.error.message);
      logger.info({ channel: JIRA_BOARD_GET_CHANNEL, context, success: true, latencyMs: latencyMs(startedAt, now) }, 'ipc handler invocation');
      return boundary.value;
    } catch (error) {
      logHandlerError(logger, { channel: JIRA_BOARD_GET_CHANNEL, context, startedAt, now }, error);
      throw error;
    }
  });

  ipcMain.handle(JIRA_BOARD_SET_CHANNEL, async (event, ...args: unknown[]) => {
    const startedAt = now();
    const context = getSenderContext(event);
    try {
      const request = createJiraBoardSetRequest(assertOnePayload(JIRA_BOARD_SET_CHANNEL, args));
      if (!request.ok) throw toError(request.error.message);
      await requireBoardMappingService().setBoard(request.value.repositoryPath, request.value.projectKey);
      const board = await requireBoardMappingService().getBoard(request.value.repositoryPath);
      logger.info({ channel: JIRA_BOARD_SET_CHANNEL, context, success: true, latencyMs: latencyMs(startedAt, now) }, 'ipc handler invocation');
      return board;
    } catch (error) {
      logHandlerError(logger, { channel: JIRA_BOARD_SET_CHANNEL, context, startedAt, now }, error);
      throw error;
    }
  });

  ipcMain.handle(JIRA_BOARD_SUGGEST_CHANNEL, async (event, ...args: unknown[]) => {
    const startedAt = now();
    const context = getSenderContext(event);
    try {
      assertOnePayload(JIRA_BOARD_SUGGEST_CHANNEL, args);
      const credential = await requireCredentialService().loadCredential();
      if (credential === undefined) return { boards: [] };
      const boards = await createJiraRestClient({ credential }).suggestBoards();
      logger.info({ channel: JIRA_BOARD_SUGGEST_CHANNEL, context, success: true, latencyMs: latencyMs(startedAt, now) }, 'ipc handler invocation');
      return { boards };
    } catch (error) {
      logHandlerError(logger, { channel: JIRA_BOARD_SUGGEST_CHANNEL, context, startedAt, now }, error);
      throw error;
    }
  });

  ipcMain.handle(JIRA_PROJECT_SEARCH_CHANNEL, async (event, ...args: unknown[]) => {
    const startedAt = now();
    const context = getSenderContext(event);
    try {
      const request = createJiraProjectSearchRequest(assertOnePayload(JIRA_PROJECT_SEARCH_CHANNEL, args));
      if (!request.ok) throw toError(request.error.message);
      const credential = await requireCredentialService().loadCredential();
      if (credential === undefined) return { projects: [] };
      const projects = await createJiraRestClient({ credential }).listProjects(request.value.query);
      logger.info({ channel: JIRA_PROJECT_SEARCH_CHANNEL, context, success: true, latencyMs: latencyMs(startedAt, now) }, 'ipc handler invocation');
      return { projects };
    } catch (error) {
      logHandlerError(logger, { channel: JIRA_PROJECT_SEARCH_CHANNEL, context, startedAt, now }, error);
      throw error;
    }
  });

  ipcMain.handle(JIRA_SUBMIT_CHANNEL, async (event, ...args: unknown[]): Promise<JiraSubmissionAck> => {
    const startedAt = now();
    const context = getSenderContext(event);
    try {
      const request = createJiraSubmitRequest(assertOnePayload(JIRA_SUBMIT_CHANNEL, args));
      if (!request.ok) throw toError(request.error.message);
      const artifacts = await buildJiraSubmissionArtifacts(request.value.repositoryPath);
      const resolution = await resolve(request.value.repositoryPath);
      if (resolution.status === 'not_configured' || resolution.status === 'reauth_required' || resolution.status === 'board_not_configured') {
        throw toError(resolution.status);
      }
      const sender = event.sender;
      const sendEvent = (streamEvent: JiraSubmissionEvent): void => {
        sender.send(JIRA_SUBMIT_EVENT_CHANNEL, { subscriptionId: request.value.subscriptionId, event: streamEvent });
      };
      const timestamp = (): string => new Date().toISOString();
      const selectedCreateTurn = runCreateTurn ?? (
        resolution.status === 'direct'
          ? createRestTurn({ credential: resolution.credential })
          : createBoundTurn({ repositoryPath: request.value.repositoryPath, logger, userDataPath })
      );
      const secrets = resolution.status === 'direct' ? [resolution.credential.token] : [];
      void runJiraSubmission({
        repositoryPath: request.value.repositoryPath,
        logger,
        userDataPath,
        runCreateTurn: selectedCreateTurn,
        projectKeyOverride: resolution.projectKey,
        onProgress: (progress) => sendEvent({ type: 'progress', ...progress }),
        onResult: (result) => sendEvent({ type: 'result', ...result }),
        now: timestamp
      }).then((result) => {
        if (result.status === 'pass') {
          sendEvent({ type: 'done', status: 'pass', issues: result.issues, timestamp: timestamp() });
        } else {
          sendEvent({
            type: 'done',
            status: 'fail',
            reason: sanitizeErrorMessage(result.reason, secrets),
            issues: result.issues,
            remainingNodeIds: result.remainingNodeIds,
            timestamp: timestamp()
          });
        }
      }).catch((error: unknown) => {
        const reason = sanitizeErrorMessage(error, secrets);
        sendEvent({ type: 'done', status: 'fail', reason, issues: [], remainingNodeIds: [], timestamp: timestamp() });
      });
      logger.info({ channel: JIRA_SUBMIT_CHANNEL, context, success: true, latencyMs: latencyMs(startedAt, now) }, 'ipc handler invocation');
      return { subscriptionId: request.value.subscriptionId, accepted: true, featureDir: artifacts.featureDirRelative };
    } catch (error) {
      logHandlerError(logger, { channel: JIRA_SUBMIT_CHANNEL, context, startedAt, now }, error);
      throw error;
    }
  });
};
