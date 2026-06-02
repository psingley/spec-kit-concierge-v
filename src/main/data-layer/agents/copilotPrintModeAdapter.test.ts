import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { runCopilotPrintModeStep, type PrintModeSpawnAdapter } from './copilotPrintModeAdapter';

const fakeChild = (lines: string[]) => {
  const child = new EventEmitter() as EventEmitter & { stdout: EventEmitter; stderr: EventEmitter; pid: number };
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.pid = 123;
  void Promise.resolve().then(() => {
    for (const line of lines) child.stdout.emit('data', Buffer.from(`${line}\n`));
    child.emit('close', 0);
  });
  return child;
};

describe('runCopilotPrintModeStep', () => {
  it('uses print-mode copilot invocation without ACP transport and captures assistant identity', async () => {
    const spawn = vi.fn(() => fakeChild([
      JSON.stringify({ type: 'assistant.message', sessionId: 'assistant-session', messageId: 'message-1', turnId: 'turn-1', data: { content: 'ok' } }),
      JSON.stringify({ type: 'result', sessionId: 'copilot-session', exitCode: 0 })
    ])) as unknown as PrintModeSpawnAdapter;

    const result = await runCopilotPrintModeStep({
      step: 'tasks',
      prompt: 'Run tasks',
      repositoryPath: '/repo',
      sessionId: '11111111-1111-4111-8111-111111111111',
      logDir: '/logs',
      spawn
    });

    expect(spawn).toHaveBeenCalledWith('copilot', [
      '--agent', 'speckit.tasks',
      '--allow-all-tools',
      '--output-format', 'json',
      '--session-id', '11111111-1111-4111-8111-111111111111',
      '--log-dir', '/logs',
      '-p', 'Run tasks'
    ], expect.objectContaining({ cwd: '/repo', shell: false }));
    expect(result).toMatchObject({
      exitCode: 0,
      assistant: [{ assistantSessionId: 'assistant-session', messageId: 'message-1', turnId: 'turn-1', source: 'print-json-event' }]
    });
  });

  it('reuses original clarify assistant identity for resume and captures log checksum', async () => {
    const spawn = vi.fn(() => fakeChild([JSON.stringify({ type: 'result', sessionId: 'copilot-session', exitCode: 0 })])) as unknown as PrintModeSpawnAdapter;
    const result = await runCopilotPrintModeStep({
      step: 'clarify',
      prompt: 'Re-ask',
      repositoryPath: '/repo',
      sessionId: '11111111-1111-4111-8111-111111111111',
      logDir: '/logs',
      clarifyResumeIdentity: { assistantSessionId: 'original', source: 'print-json-event' },
      spawn
    });

    expect(result.assistant).toEqual([{ assistantSessionId: 'original', source: 'print-json-event' }]);
    expect(result.logReference.sha256).toMatch(/^[a-f0-9]{64}$/);
  });
});
