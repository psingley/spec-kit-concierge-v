import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { app, type IpcMain } from 'electron';
import { loadAgentManifest } from '../data-layer/agents/loader';
import { BoundCLISupervisor } from '../data-layer/acp/supervisor';
import { appendClarifyMalformation } from '../data-layer/clarifyMalformationLog';
import { validateClarifyArtifacts } from '../domain/factories';
import { beforeClarifyHook } from '../hooks/beforeClarify.hook';
import { afterClarifyHook } from '../hooks/afterClarify.hook';
import type { MainLogger } from '../logging';
import { assertOnePayload, getSenderContext, latencyMs, toError } from './handlerUtils';
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

export type ClarifyAgentAdapter = (request: CopilotClarifyRequest & { sessionId: string; featureDir: string }) => Promise<void>;

export type RegisterCopilotClarifyIpcOptions = {
  ipcMain: Pick<IpcMain, 'handle'>;
  logger: Pick<MainLogger, 'info' | 'warn' | 'error'>;
  userDataPath?: string;
  agentAdapter?: ClarifyAgentAdapter;
  now?: () => number;
};

const defaultAgentAdapter =
  (logger: Pick<MainLogger, 'info' | 'warn' | 'error'>, userDataPath: string): ClarifyAgentAdapter =>
async (request) => {
  const manifest = await loadAgentManifest(logger);
  const agent = manifest.agents.copilot;
  if (agent === undefined) {
    throw new Error('Copilot agent manifest entry is missing.');
  }
  const supervisor = new BoundCLISupervisor({ agent, logger, userDataPath });
  const session = await supervisor.start();
  const created = await session.newSession(request.repositoryPath, [], { step: 'clarify' });
  if (request.modelId !== undefined) {
    await session.setModel(created.sessionId, request.modelId);
  }
  const promptByOperation = {
    next: 'Run /speckit.clarify for this feature. Persist clarification questions or answers in-place under the feature spec.md Clarifications section.',
    answer: 'Persist the provided selected clarification answers in-place under the feature spec.md Clarifications section.',
    reaskMalformed: `Rewrite only malformed Clarify question ${request.questionId ?? 'unknown'} using the supplied context. Preserve all well-formed question ids and text.`,
    askAnother: 'Ask exactly one additional clarification question in the same Clarify conversation and persist it in spec.md.',
    commit: 'Finalize Clarify answers in spec.md without adding unrelated sections.'
  } as const;
  await session.prompt(created.sessionId, `${promptByOperation[request.operation]}\n\nAnswers:\n${JSON.stringify(request.answers, null, 2)}`);
  await session.dispose();
};

const readSummary = async (featureDir: string): Promise<ClarifySummary> => {
  const result = await validateClarifyArtifacts(featureDir);
  if (result.ok) {
    return {
      questions: (result.questions ?? []).map((question) => ({
        id: question.id,
        position: question.position,
        text: question.text,
        choices: question.choices
      })),
      answers: []
    };
  }
  if (result.kind === 'malformed-questions') {
    return {
      questions: result.wellFormedQuestions.map((question) => ({ id: question.id, position: question.position, text: question.text, choices: question.choices })),
      malformedQuestions: result.malformedQuestions.map((question) => ({
        id: question.id,
        position: question.position,
        malformationCategory: question.malformationCategory,
        rawOutput: question.rawOutput
      })),
      answers: []
    };
  }
  const spec = await readFile(path.join(featureDir, 'spec.md'), 'utf8').catch(() => '');
  return spec.trim() === 'no questions needed' ? { questions: [], answers: [] } : { questions: [], answers: [] };
};

const appendAnswers = async (featureDir: string, answers: CopilotClarifyRequest['answers']): Promise<void> => {
  if (answers.length === 0) {
    return;
  }
  const specPath = path.join(featureDir, 'spec.md');
  const spec = await readFile(specPath, 'utf8');
  const rendered = answers.map((answer) => `- ${answer.questionId}: ${answer.selectedChoiceKey}${answer.shortAnswer.trim().length > 0 ? ` - ${answer.shortAnswer.trim()}` : ''}`).join('\n');
  await writeFile(specPath, `${spec.trimEnd()}\n\n### Accepted Clarify Answers\n\n${rendered}\n`, 'utf8');
};

export const registerCopilotClarifyIpc = ({
  ipcMain,
  logger,
  userDataPath = app.getPath('userData'),
  agentAdapter = defaultAgentAdapter(logger, userDataPath),
  now = () => performance.now()
}: RegisterCopilotClarifyIpcOptions): void => {
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
        const featureDir = request.value.repositoryPath;
        if (request.value.operation === 'next') {
          const before = await beforeClarifyHook({ repositoryPath: request.value.repositoryPath, featureDir, sessionId, userDataPath, authStatus: { githubLoggedIn: true, copilotLoggedIn: true } });
          if (!before.ok) throw new Error(before.escapeHatchReason);
        }
        sendEvent({ type: 'progress', step: 'clarify', sessionId, level: 'info', message: 'Running Clarify', timestamp: new Date().toISOString() });
        await agentAdapter({ ...request.value, sessionId, featureDir });
        if (request.value.operation === 'commit') {
          await appendAnswers(featureDir, request.value.answers);
          const summary = await readSummary(featureDir);
          const after = await afterClarifyHook({ repositoryPath: request.value.repositoryPath, featureDir, sessionId, userDataPath, authStatus: { githubLoggedIn: true, copilotLoggedIn: true } });
          if (!after.ok || after.commit?.commitSha === undefined) throw new Error(after.ok ? 'missing commit sha' : after.escapeHatchReason);
          sendEvent({ type: 'done', step: 'clarify', sessionId, status: 'pass', artifactPath: 'spec.md', commitSha: after.commit.commitSha, summary: { ...summary, answers: request.value.answers.map((answer) => ({ questionId: answer.questionId, choiceKey: answer.selectedChoiceKey, note: answer.shortAnswer })) } });
        } else {
          const summary = await readSummary(featureDir);
          for (const malformed of summary.malformedQuestions ?? []) {
            await appendClarifyMalformation(userDataPath, { sessionId, step: 'clarify', questionId: malformed.id, malformationCategory: malformed.malformationCategory, rawOutput: malformed.rawOutput, timestamp: new Date().toISOString(), modelId: request.value.modelId ?? 'unknown' });
          }
          sendEvent({ type: 'done', step: 'clarify', sessionId, status: 'pass', artifactPath: 'spec.md', summary });
        }
        logger.info({ channel: COPILOT_CLARIFY_CHANNEL, context, success: true, latencyMs: latencyMs(startedAt, now) }, 'ipc handler invocation');
      } catch (error) {
        sendEvent({ type: 'done', step: 'clarify', sessionId, status: 'fail', reason: error instanceof Error ? error.message : String(error) });
        logger.error({ channel: COPILOT_CLARIFY_CHANNEL, context, success: false, latencyMs: latencyMs(startedAt, now), error }, 'ipc handler invocation');
      }
    };
    void run();
    return ack.value;
  });
};
