import { createHash } from 'node:crypto';
import type { ChildProcess, SpawnOptions } from 'node:child_process';
import type { AssistantIdentity, StepName } from '../../domain/manifest/types';
import { resolveWindowsBinary } from '../auth/execGh';

export type PrintModeSpawnAdapter = (
  command: string,
  args: string[],
  options: SpawnOptions
) => Pick<ChildProcess, 'stdout' | 'stderr' | 'on' | 'pid'>;

export type RunCopilotPrintModeStepRequest = {
  step: StepName;
  prompt: string;
  repositoryPath: string;
  sessionId: string;
  logDir: string;
  modelId?: string;
  clarifyResumeIdentity?: AssistantIdentity;
  spawn: PrintModeSpawnAdapter;
};

export type RunCopilotPrintModeStepResult = {
  exitCode: number;
  assistant: AssistantIdentity[];
  logReference: {
    path: string;
    sha256: string;
    sizeBytes: number;
  };
};

const parseIdentity = (event: Record<string, unknown>): AssistantIdentity | undefined => {
  const assistantSessionId = typeof event.sessionId === 'string' ? event.sessionId : undefined;
  const messageId = typeof event.messageId === 'string' ? event.messageId : undefined;
  const turnId = typeof event.turnId === 'string' ? event.turnId : undefined;
  return assistantSessionId === undefined && messageId === undefined && turnId === undefined
    ? undefined
    : { assistantSessionId, messageId, turnId, source: 'print-json-event' };
};

export const runCopilotPrintModeStep = async (
  request: RunCopilotPrintModeStepRequest
): Promise<RunCopilotPrintModeStepResult> => {
  const copilotBinary = await resolveWindowsBinary('copilot');
  return new Promise((resolve, reject) => {
    const args = [
      '--agent', `speckit.${request.step}`,
      ...(request.modelId === undefined ? [] : ['--model', request.modelId]),
      '--allow-all-tools',
      '--output-format', 'json',
      '--session-id', request.sessionId,
      '--log-dir', request.logDir,
      '-p', request.prompt
    ];
    const child = request.spawn(copilotBinary, args, { cwd: request.repositoryPath, shell: false });
    const lines: string[] = [];
    const assistant: AssistantIdentity[] = request.clarifyResumeIdentity === undefined ? [] : [request.clarifyResumeIdentity];
    let exitCode = 1;

    child.stdout?.on('data', (chunk: Buffer) => {
      for (const line of chunk.toString('utf8').split(/\r?\n/).filter((entry) => entry.length > 0)) {
        lines.push(line);
        try {
          const event = JSON.parse(line) as Record<string, unknown>;
          if (event.type === 'result' && typeof event.exitCode === 'number') exitCode = event.exitCode;
          const identity = parseIdentity(event);
          if (identity !== undefined && assistant.length === 0) assistant.push(identity);
        } catch {
          // Non-JSON output remains part of the checksum but has no identity.
        }
      }
    });
    child.on('error', reject);
    child.on('close', () => {
      const contents = `${lines.join('\n')}\n`;
      resolve({
        exitCode,
        assistant,
        logReference: {
          path: request.logDir,
          sha256: createHash('sha256').update(contents).digest('hex'),
          sizeBytes: Buffer.byteLength(contents)
        }
      });
    });
  });
};
