import { app, type IpcMain } from 'electron';
import { loadAgentManifest } from '../data-layer/agents/loader';
import { BoundCLISupervisor } from '../data-layer/acp/supervisor';
import type { BoundCLISession, CodingAgent } from '../data-layer/acp/agent';
import type { BoundCLIPromptUpdate } from '../data-layer/acp/types';
import { appendClarifyMalformation } from '../data-layer/clarifyMalformationLog';
import { parseClarifyTableMessage } from '../domain/factories/clarifyTable';
import { resolveFeatureDir } from '../data-layer/specify/featureDir';
import { beforeClarifyHook } from '../hooks/beforeClarify.hook';
import { afterClarifyHook } from '../hooks/afterClarify.hook';
import type { MainLogger } from '../logging';
import { assertOnePayload, getSenderContext, latencyMs, logHandlerError, toError } from './handlerUtils';
import {
  createCopilotClarifyAck,
  createCopilotClarifyRequest,
  createStepStreamEvent,
  type CopilotClarifyAck,
  type CopilotClarifyRequest,
  type ClarifySummary,
  type StepStreamEvent
} from './copilotClarify.factory';

export const COPILOT_CLARIFY_CHANNEL = 'copilot:clarify';
export const COPILOT_CLARIFY_EVENT_CHANNEL = 'copilot:clarify:event';

export type ClarifyAgentAdapterResult = { message: string };

export type ClarifyAgentAdapter = (
  request: CopilotClarifyRequest & { sessionId: string; featureDir: string }
) => Promise<ClarifyAgentAdapterResult>;

export type ClarifySupervisorFactory = () => Promise<CodingAgent>;

export type RegisterCopilotClarifyIpcOptions = {
  ipcMain: Pick<IpcMain, 'handle'>;
  logger: Pick<MainLogger, 'info' | 'warn' | 'error'>;
  userDataPath?: string;
  agentAdapter?: ClarifyAgentAdapter;
  supervisorFactory?: ClarifySupervisorFactory;
  now?: () => number;
};

// The conciergeSessionId is minted fresh per IPC call, so it cannot key continuity
// across next -> answer -> commit. The repositoryPath is stable for the lifetime of
// a Clarify conversation, so we key the live ACP session by it. We keep the supervisor
// instance alive in this Map so the stdio pipe + loaded ACP session survive between IPC
// calls; later operations prompt that live session directly and it is only disposed on
// commit (terminal). The live Map is the single continuity mechanism.
type PersistedClarifySession = {
  acpSessionId: string;
  repositoryPath: string;
  session: BoundCLISession;
};

const activeSessions = new Map<string, PersistedClarifySession>();

const accumulateAgentMessage = (text: string, update: BoundCLIPromptUpdate): string => {
  const inner = update.update;
  if (inner.sessionUpdate !== 'agent_message_chunk') {
    return text;
  }
  const content = inner.content;
  if (typeof content !== 'object' || content === null) {
    return text;
  }
  const record = content as Record<string, unknown>;
  if (record.type === 'text' && typeof record.text === 'string') {
    return `${text}${record.text}`;
  }
  return text;
};

// The agent expects the human's reply on the SAME session to carry the option letter
// ("A"), "yes"/"recommended", or a short answer (<=5 words). One line per answered
// question, prefixed with the question's position so the agent can map it back.
const buildAnswerPrompt = (answers: CopilotClarifyRequest['answers']): string => {
  const lines = answers.map((answer, index) => {
    const ref = `Q${index + 1}`;
    const choice = answer.selectedChoiceKey.trim();
    const short = answer.shortAnswer.trim();
    if (choice.length > 0) {
      return `${ref}: ${choice}`;
    }
    return `${ref}: ${short}`;
  });
  return `Here are my answers to the clarification questions. Apply each to the spec.md Clarifications section per your contract.\n\n${lines.join('\n')}`;
};

const defaultSupervisorFactory =
  (logger: Pick<MainLogger, 'info' | 'warn' | 'error'>, userDataPath: string): ClarifySupervisorFactory =>
  async () => {
    const manifest = await loadAgentManifest(logger);
    const agent = manifest.agents.copilot;
    if (agent === undefined) {
      throw new Error('Copilot agent manifest entry is missing.');
    }
    return new BoundCLISupervisor({ agent, logger, userDataPath });
  };

const defaultAgentAdapter =
  (supervisorFactory: ClarifySupervisorFactory): ClarifyAgentAdapter =>
  async (request) => {
    const existing = activeSessions.get(request.repositoryPath);
    const isContinuation = request.operation !== 'next' && existing !== undefined;
    let message = '';
    const onUpdate = (update: BoundCLIPromptUpdate): void => {
      message = accumulateAgentMessage(message, update);
    };

    if (isContinuation && existing !== undefined) {
      // The supervisor is kept alive in activeSessions across turns, so the ACP session
      // is already loaded — prompt it directly. Calling loadSession here would throw
      // "Session <id> is already loaded". The live in-Map supervisor IS the re-attach
      // mechanism (one continuity mechanism, not two).
      const prompt =
        request.operation === 'answer' || request.operation === 'commit'
          ? buildAnswerPrompt(request.answers)
          : request.operation === 'reaskMalformed'
            ? `Rewrite only malformed Clarify question ${request.questionId ?? 'unknown'} using the supplied context. Preserve all well-formed question ids and text.`
            : 'Ask exactly one additional clarification question in the same Clarify conversation.';
      await existing.session.prompt(existing.acpSessionId, prompt, onUpdate);
      if (request.operation === 'commit') {
        await existing.session.dispose();
        activeSessions.delete(request.repositoryPath);
      }
      return { message };
    }

    const supervisor = await supervisorFactory();
    const session = await supervisor.start();
    const created = await session.newSession(request.repositoryPath, [], { step: 'clarify' });
    if (request.modelId !== undefined) {
      await session.setModel(created.sessionId, request.modelId);
    }
    const prompt =
      request.operation === 'next'
        ? 'Run /speckit.clarify for this feature. Pose your clarification questions one at a time as Markdown option tables; do not answer them yourself.'
        : request.operation === 'answer' || request.operation === 'commit'
          ? buildAnswerPrompt(request.answers)
          : request.operation === 'reaskMalformed'
            ? `Rewrite only malformed Clarify question ${request.questionId ?? 'unknown'} using the supplied context. Preserve all well-formed question ids and text.`
            : 'Ask exactly one additional clarification question in the same Clarify conversation.';
    await session.prompt(created.sessionId, prompt, onUpdate);

    if (request.operation === 'commit') {
      await session.dispose();
    } else {
      activeSessions.set(request.repositoryPath, {
        acpSessionId: created.sessionId,
        repositoryPath: request.repositoryPath,
        session
      });
    }
    return { message };
  };

const summaryFromMessage = (message: string): ClarifySummary => {
  const parsed = parseClarifyTableMessage(message);
  return {
    questions: parsed.questions.map((question) => ({
      id: question.id,
      position: question.position,
      text: question.text,
      choices: question.choices
    })),
    malformedQuestions:
      parsed.malformedQuestions.length > 0
        ? parsed.malformedQuestions.map((question) => ({
            id: question.id,
            position: question.position,
            malformationCategory: question.malformationCategory,
            rawOutput: question.rawOutput
          }))
        : undefined,
    answers: []
  };
};

export const registerCopilotClarifyIpc = ({
  ipcMain,
  logger,
  userDataPath = app.getPath('userData'),
  supervisorFactory = defaultSupervisorFactory(logger, userDataPath),
  agentAdapter,
  now = () => performance.now()
}: RegisterCopilotClarifyIpcOptions): void => {
  const adapter = agentAdapter ?? defaultAgentAdapter(supervisorFactory);
  ipcMain.handle(COPILOT_CLARIFY_CHANNEL, async (event, ...args: unknown[]): Promise<CopilotClarifyAck> => {
    const startedAt = now();
    const context = getSenderContext(event);
    const request = createCopilotClarifyRequest(assertOnePayload(COPILOT_CLARIFY_CHANNEL, args));
    if (!request.ok) {
      throw toError(request.error.message);
    }
    const sessionId = `clarify-${Date.now().toString(36)}`;
    const ack = createCopilotClarifyAck({ subscriptionId: request.value.subscriptionId, sessionId, step: 'clarify', accepted: true });
    if (!ack.ok) {
      throw toError(ack.error.message);
    }
    const sendEvent = (streamEvent: StepStreamEvent): void => {
      const parsed = createStepStreamEvent(streamEvent);
      if (!parsed.ok) {
        logger.error({ channel: COPILOT_CLARIFY_CHANNEL, context, success: false, error: parsed.error }, 'ipc handler invocation');
        return;
      }
      event.sender.send(COPILOT_CLARIFY_EVENT_CHANNEL, { subscriptionId: request.value.subscriptionId, event: parsed.value });
    };
    const run = async (): Promise<void> => {
      try {
        const featureDir = await resolveFeatureDir(request.value.repositoryPath);
        if (request.value.operation === 'next') {
          const before = await beforeClarifyHook({ repositoryPath: request.value.repositoryPath, featureDir, sessionId, userDataPath, authStatus: { githubLoggedIn: true, copilotLoggedIn: true } });
          if (!before.ok) throw new Error(before.escapeHatchReason);
        }
        sendEvent({ type: 'progress', step: 'clarify', sessionId, level: 'info', message: 'Running Clarify', timestamp: new Date().toISOString() });
        const { message } = await adapter({ ...request.value, sessionId, featureDir });
        if (request.value.operation === 'commit') {
          const after = await afterClarifyHook({ repositoryPath: request.value.repositoryPath, featureDir, sessionId, userDataPath, authStatus: { githubLoggedIn: true, copilotLoggedIn: true } });
          if (!after.ok || after.commit?.commitSha === undefined) throw new Error(after.ok ? 'missing commit sha' : after.escapeHatchReason);
          sendEvent({
            type: 'done',
            step: 'clarify',
            sessionId,
            status: 'pass',
            artifactPath: 'spec.md',
            commitSha: after.commit.commitSha,
            summary: { questions: [], answers: request.value.answers.map((answer) => ({ questionId: answer.questionId, choiceKey: answer.selectedChoiceKey, note: answer.shortAnswer })) }
          });
        } else {
          const summary = summaryFromMessage(message);
          for (const malformed of summary.malformedQuestions ?? []) {
            await appendClarifyMalformation(userDataPath, { sessionId, step: 'clarify', questionId: malformed.id, malformationCategory: malformed.malformationCategory, rawOutput: malformed.rawOutput, timestamp: new Date().toISOString(), modelId: request.value.modelId ?? 'unknown' });
          }
          sendEvent({ type: 'done', step: 'clarify', sessionId, status: 'pass', artifactPath: 'spec.md', summary });
        }
        logger.info({ channel: COPILOT_CLARIFY_CHANNEL, context, success: true, latencyMs: latencyMs(startedAt, now) }, 'ipc handler invocation');
      } catch (error) {
        sendEvent({ type: 'done', step: 'clarify', sessionId, status: 'fail', reason: error instanceof Error ? error.message : String(error) });
        logHandlerError(logger, { channel: COPILOT_CLARIFY_CHANNEL, context, startedAt, now }, error);
      }
    };
    void run();
    return ack.value;
  });
};
