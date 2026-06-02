import type { IpcMain } from 'electron';
import type { MainLogger } from '../logging';
import { buildJiraSubmissionArtifacts, runJiraSubmission } from '../data-layer/jiraSubmission/service';
import type { JiraCreateTurn } from '../data-layer/jiraSubmission/runner';
import { assertOnePayload, getSenderContext, latencyMs, logHandlerError, toError } from './handlerUtils';
import {
  createJiraDryRunRequest,
  createJiraSubmitRequest,
  type JiraDryRunResponse,
  type JiraSubmissionAck,
  type JiraSubmissionEvent
} from './jiraSubmission.factory';

export const JIRA_DRY_RUN_CHANNEL = 'jira:dryRun';
export const JIRA_SUBMIT_CHANNEL = 'jira:submit';
export const JIRA_SUBMIT_EVENT_CHANNEL = 'jira:submit:event';

export type RegisterJiraSubmissionIpcOptions = {
  ipcMain: Pick<IpcMain, 'handle'>;
  logger: Pick<MainLogger, 'info' | 'warn' | 'error'>;
  userDataPath?: string;
  now?: () => number;
  runCreateTurn?: JiraCreateTurn;
};

export const registerJiraSubmissionIpc = ({
  ipcMain,
  logger,
  userDataPath,
  now = () => performance.now(),
  runCreateTurn
}: RegisterJiraSubmissionIpcOptions): void => {
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

  ipcMain.handle(JIRA_SUBMIT_CHANNEL, async (event, ...args: unknown[]): Promise<JiraSubmissionAck> => {
    const startedAt = now();
    const context = getSenderContext(event);
    try {
      const request = createJiraSubmitRequest(assertOnePayload(JIRA_SUBMIT_CHANNEL, args));
      if (!request.ok) throw toError(request.error.message);
      const artifacts = await buildJiraSubmissionArtifacts(request.value.repositoryPath);
      const sender = event.sender;
      const sendEvent = (streamEvent: JiraSubmissionEvent): void => {
        sender.send(JIRA_SUBMIT_EVENT_CHANNEL, { subscriptionId: request.value.subscriptionId, event: streamEvent });
      };
      const timestamp = (): string => new Date().toISOString();
      void runJiraSubmission({
        repositoryPath: request.value.repositoryPath,
        logger,
        userDataPath,
        runCreateTurn,
        onProgress: (progress) => sendEvent({ type: 'progress', ...progress }),
        onResult: (result) => sendEvent({ type: 'result', ...result }),
        now: timestamp
      }).then((result) => {
        if (result.status === 'pass') {
          sendEvent({ type: 'done', status: 'pass', issues: result.issues, timestamp: timestamp() });
        } else {
          sendEvent({ type: 'done', status: 'fail', reason: result.reason, issues: result.issues, timestamp: timestamp() });
        }
      }).catch((error: unknown) => {
        const reason = error instanceof Error ? error.message : String(error);
        sendEvent({ type: 'done', status: 'fail', reason, issues: [], timestamp: timestamp() });
      });
      logger.info({ channel: JIRA_SUBMIT_CHANNEL, context, success: true, latencyMs: latencyMs(startedAt, now) }, 'ipc handler invocation');
      return { subscriptionId: request.value.subscriptionId, accepted: true, featureDir: artifacts.featureDirRelative };
    } catch (error) {
      logHandlerError(logger, { channel: JIRA_SUBMIT_CHANNEL, context, startedAt, now }, error);
      throw error;
    }
  });
};
