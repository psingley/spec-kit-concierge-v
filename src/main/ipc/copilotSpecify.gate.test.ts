import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  COPILOT_SPECIFY_CHANNEL,
  COPILOT_SPECIFY_EVENT_CHANNEL,
  SPECIFY_READINESS_CHANNEL,
  registerCopilotSpecifyIpc,
  type SpecifyReadinessEvaluator
} from './copilotSpecify';
import type { SpecifyReadinessReport } from './specifyReadiness';

type Handler = (event: unknown, ...args: unknown[]) => Promise<unknown>;

const userDataPath = mkdtempSync(path.join(tmpdir(), 'specify-gate-'));

const flush = async (): Promise<void> => {
  for (let i = 0; i < 10; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};

const setup = (options: {
  evaluateReadiness: SpecifyReadinessEvaluator;
  agentAdapter: ReturnType<typeof vi.fn>;
}) => {
  const handlers = new Map<string, Handler>();
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  registerCopilotSpecifyIpc({
    ipcMain: {
      handle: vi.fn((channel: string, handler: (...invokeArgs: never[]) => Promise<unknown>) => {
        handlers.set(channel, handler as Handler);
      })
    },
    logger,
    userDataPath,
    agentAdapter: options.agentAdapter,
    evaluateReadiness: options.evaluateReadiness
  });
  const send = vi.fn();
  const invoke = (): Promise<unknown> =>
    handlers.get(COPILOT_SPECIFY_CHANNEL)!(
      { sender: { id: 7, send } },
      { subscriptionId: 'sub-1', repositoryPath: '/work/repo', branch: 'spec/x', prompt: 'Build it' }
    );
  return { invoke, send, logger };
};

const doneEvents = (send: ReturnType<typeof vi.fn>): Array<Record<string, unknown>> =>
  send.mock.calls
    .filter((call) => call[0] === COPILOT_SPECIFY_EVENT_CHANNEL)
    .map((call) => (call[1] as { event: Record<string, unknown> }).event)
    .filter((event) => event.type === 'done');

const notReady: SpecifyReadinessReport = {
  ready: false,
  checks: [
    { name: 'copilot-authed', ok: true, detail: 'ok' },
    { name: 'model-available', ok: false, detail: 'No Copilot model available — open the model picker.' }
  ],
  failingCheck: { name: 'model-available', ok: false, detail: 'No Copilot model available — open the model picker.' }
};

const ready: SpecifyReadinessReport = {
  ready: true,
  checks: [{ name: 'copilot-authed', ok: true, detail: 'ok' }]
};

describe('copilot specify readiness gate', () => {
  it('blocks the ACP turn and surfaces the failing-check message when not ready', async () => {
    const agentAdapter = vi.fn(async () => undefined);
    const { invoke, send, logger } = setup({
      evaluateReadiness: vi.fn(async () => notReady),
      agentAdapter
    });

    await invoke();
    await flush();

    // The ACP turn MUST NOT fire (no firing-and-hanging).
    expect(agentAdapter).not.toHaveBeenCalled();

    const dones = doneEvents(send);
    expect(dones).toHaveLength(1);
    expect(dones[0]).toMatchObject({
      type: 'done',
      status: 'fail',
      reason: 'No Copilot model available — open the model picker.'
    });

    // Structured specify:readiness log line with each check + ready flag.
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ channel: SPECIFY_READINESS_CHANNEL, ready: false, checks: notReady.checks }),
      'ipc handler invocation'
    );
  });

  it('proceeds to the ACP turn when readiness passes', async () => {
    const agentAdapter = vi.fn(async () => undefined);
    const { invoke, logger } = setup({
      evaluateReadiness: vi.fn(async () => ready),
      agentAdapter
    });

    await invoke();
    await flush();

    expect(agentAdapter).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ channel: SPECIFY_READINESS_CHANNEL, ready: true }),
      'ipc handler invocation'
    );
  });
});
