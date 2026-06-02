import type { IpcMain } from 'electron';
import { describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { registerPassiveStepIpc } from './passiveStepIpc';
import { runAfterHook } from '../hooks/hookHelpers';

const payload = {
  subscriptionId: 'sub-1',
  repositoryPath: '/repo/specs/0008-ai-passive-steps',
  branch: 'spec/0008-ai-passive-steps',
  modelId: 'gpt-5.5'
};

// spec-kit records the real feature dir in .specify/feature.json (relative to the
// repo root). The passive-step handler resolves it, so fixtures need a manifest.
// Returns { repositoryPath, featureDir } — pass repositoryPath as the payload and
// place artifacts under featureDir.
const createRepo = async (featureRel = 'specs/0008-ai-passive-steps'): Promise<{ repositoryPath: string; featureDir: string }> => {
  const repositoryPath = await mkdtemp(path.join(os.tmpdir(), 'concierge-passive-repo-'));
  await mkdir(path.join(repositoryPath, '.specify'), { recursive: true });
  await mkdir(path.join(repositoryPath, featureRel), { recursive: true });
  await writeFile(path.join(repositoryPath, '.specify', 'feature.json'), JSON.stringify({ feature_directory: featureRel }), 'utf8');
  return { repositoryPath, featureDir: path.join(repositoryPath, featureRel) };
};

const failedMarkerPath = (repositoryPath: string, step: string): string =>
  path.join(repositoryPath, '.specify', 'concierge', 'failed-steps', `${step}.json`);

const createHarness = () => {
  const handlers = new Map<string, (event: { sender: { id: number; send: ReturnType<typeof vi.fn> } }, payload: unknown) => Promise<unknown>>();
  const ipcMain = {
    handle: vi.fn((channel: string, handler: (event: { sender: { id: number; send: ReturnType<typeof vi.fn> } }, payload: unknown) => Promise<unknown>) => {
      handlers.set(channel, handler);
    })
  };
  const sender = { id: 7, send: vi.fn() };
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  return { handlers, ipcMain: ipcMain as unknown as Pick<IpcMain, 'handle'>, sender, logger };
};

describe('registerPassiveStepIpc', () => {
  it('runs before hook, agent adapter, after hook, and emits one terminal pass event', async () => {
    const harness = createHarness();
    const { repositoryPath, featureDir } = await createRepo();
    const beforeHook = vi.fn().mockResolvedValue({ ok: true });
    const agentAdapter = vi.fn().mockResolvedValue(undefined);
    const afterHook = vi.fn().mockResolvedValue({
      ok: true,
      commit: { commitSha: 'abc123' }
    });

    registerPassiveStepIpc({
      step: 'plan',
      channel: 'copilot:plan',
      eventChannel: 'copilot:plan:event',
      ipcMain: harness.ipcMain,
      logger: harness.logger,
      userDataPath: '/tmp/user',
      beforeHook,
      afterHook,
      agentAdapter
    });

    const ack = await harness.handlers.get('copilot:plan')?.({ sender: harness.sender }, { ...payload, repositoryPath });

    expect(ack).toMatchObject({ subscriptionId: 'sub-1', step: 'plan', accepted: true });
    await vi.waitFor(() => expect(afterHook).toHaveBeenCalledTimes(1));
    expect(beforeHook).toHaveBeenCalledWith(expect.objectContaining({ featureDir, sessionId: expect.stringMatching(/^plan-/) }));
    expect(agentAdapter).toHaveBeenCalledWith(expect.objectContaining({ step: 'plan', modelId: 'gpt-5.5' }));
    await vi.waitFor(() => expect(harness.sender.send).toHaveBeenCalledWith('copilot:plan:event', expect.objectContaining({
      subscriptionId: 'sub-1',
      event: expect.objectContaining({ type: 'done', step: 'plan', status: 'pass', commitSha: 'abc123' })
    })));
    const terminalEvents = harness.sender.send.mock.calls.filter((call) => call[1].event.type === 'done');
    expect(terminalEvents).toHaveLength(1);
  });

  it('discovers present optional plan artifacts for the pass summary without requiring missing optionals', async () => {
    const harness = createHarness();
    const { repositoryPath, featureDir } = await createRepo();
    await mkdir(path.join(featureDir, 'contracts'));
    await writeFile(path.join(featureDir, 'data-model.md'), '# Data model');
    await writeFile(path.join(featureDir, 'contracts', 'clarify-api.md'), '# Contract');

    registerPassiveStepIpc({
      step: 'plan',
      channel: 'copilot:plan',
      eventChannel: 'copilot:plan:event',
      ipcMain: harness.ipcMain,
      logger: harness.logger,
      userDataPath: '/tmp/user',
      beforeHook: vi.fn().mockResolvedValue({ ok: true }),
      afterHook: vi.fn().mockResolvedValue({ ok: true, commit: { commitSha: 'abc123' } }),
      agentAdapter: vi.fn().mockResolvedValue(undefined)
    });

    await harness.handlers.get('copilot:plan')?.({ sender: harness.sender }, { ...payload, repositoryPath });

    await vi.waitFor(() => expect(harness.sender.send).toHaveBeenCalledWith('copilot:plan:event', expect.objectContaining({
      event: expect.objectContaining({ type: 'done', step: 'plan', status: 'pass' })
    })));
    const done = harness.sender.send.mock.calls.find((call) => call[1].event.type === 'done')?.[1].event;
    expect(done.summary.artifacts).toEqual([
      expect.objectContaining({ path: 'plan.md', required: true }),
      expect.objectContaining({ path: 'research.md', required: true }),
      expect.objectContaining({ path: 'data-model.md', required: false }),
      expect.objectContaining({ path: 'contracts/clarify-api.md', required: false })
    ]);
    expect(done.summary.counts).toMatchObject({ required: 2, optional: 2, present: 4 });
  });

  it('propagates errors as one terminal fail event and skips duplicate terminal sends', async () => {
    const harness = createHarness();
    const { repositoryPath } = await createRepo();

    registerPassiveStepIpc({
      step: 'tasks',
      channel: 'copilot:tasks',
      eventChannel: 'copilot:tasks:event',
      ipcMain: harness.ipcMain,
      logger: harness.logger,
      userDataPath: '/tmp/user',
      beforeHook: vi.fn().mockResolvedValue({ ok: true }),
      afterHook: vi.fn(),
      agentAdapter: vi.fn().mockRejectedValue(new Error('agent failed'))
    });

    await harness.handlers.get('copilot:tasks')?.({ sender: harness.sender }, { ...payload, repositoryPath });

    await vi.waitFor(() => expect(harness.sender.send).toHaveBeenCalledWith('copilot:tasks:event', expect.objectContaining({
      event: expect.objectContaining({ type: 'done', step: 'tasks', status: 'fail', reason: 'agent failed' })
    })));
    const terminalEvents = harness.sender.send.mock.calls.filter((call) => call[1].event.type === 'done');
    expect(terminalEvents).toHaveLength(1);
  });

  it('writes a durable failed-step marker when the after-hook factory rejects tasks output', async () => {
    const harness = createHarness();
    const { repositoryPath } = await createRepo('specs/0012-remove-density-settings');

    registerPassiveStepIpc({
      step: 'tasks',
      channel: 'copilot:tasks',
      eventChannel: 'copilot:tasks:event',
      ipcMain: harness.ipcMain,
      logger: harness.logger,
      userDataPath: '/tmp/user',
      beforeHook: vi.fn().mockResolvedValue({ ok: true }),
      afterHook: vi.fn().mockResolvedValue({
        ok: false,
        phase: 'after',
        step: 'tasks',
        escapeHatchReason: 'factory-rejected',
        failureReason: 'factory-rejected: expected tasks.md under specs/0012-remove-density-settings',
        strandedArtifacts: ['specs/0008-react-router-refactor/tasks.md']
      }),
      agentAdapter: vi.fn().mockResolvedValue(undefined)
    });

    await harness.handlers.get('copilot:tasks')?.({ sender: harness.sender }, { ...payload, repositoryPath });

    await vi.waitFor(() => expect(harness.sender.send).toHaveBeenCalledWith('copilot:tasks:event', expect.objectContaining({
      event: expect.objectContaining({
        type: 'done',
        step: 'tasks',
        status: 'fail',
        reason: 'factory-rejected: expected tasks.md under specs/0012-remove-density-settings'
      })
    })));
    await expect(readFile(failedMarkerPath(repositoryPath, 'tasks'), 'utf8')).resolves.toContain('"reason":"factory-rejected: expected tasks.md under specs/0012-remove-density-settings"');
    await expect(readFile(failedMarkerPath(repositoryPath, 'tasks'), 'utf8')).resolves.toContain('specs/0008-react-router-refactor/tasks.md');
  });

  it.each([
    'unrelated',
    'ambiguous',
    'unsafe',
    'owned-mismatched'
  ] as const)('blocks passive completion on %s dirty diffs and writes stranded artifact detail', async (classification) => {
    const harness = createHarness();
    const { repositoryPath } = await createRepo('specs/0013-hybrid-manifest-architecture');
    const afterHook = vi.fn().mockResolvedValue({ ok: true, commit: { commitSha: 'tasks-sha' } });

    registerPassiveStepIpc({
      step: 'tasks',
      channel: 'copilot:tasks',
      eventChannel: 'copilot:tasks:event',
      ipcMain: harness.ipcMain,
      logger: harness.logger,
      userDataPath: '/tmp/user',
      beforeHook: vi.fn().mockResolvedValue({ ok: true }),
      afterHook,
      agentAdapter: vi.fn().mockResolvedValue(undefined),
      dirtyDiffGate: vi.fn().mockResolvedValue({
        classification,
        affectedPaths: ['src/main/ipc/passiveStepIpc.ts'],
        blocking: true,
        strandedArtifacts: ['src/main/ipc/passiveStepIpc.ts']
      })
    });

    await harness.handlers.get('copilot:tasks')?.({ sender: harness.sender }, { ...payload, repositoryPath });

    await vi.waitFor(() => expect(harness.sender.send).toHaveBeenCalledWith('copilot:tasks:event', expect.objectContaining({
      event: expect.objectContaining({
        type: 'done',
        step: 'tasks',
        status: 'fail',
        reason: `needs-attention: ${classification} dirty diff blocked completion`
      })
    })));
    expect(afterHook).not.toHaveBeenCalled();
    await expect(readFile(failedMarkerPath(repositoryPath, 'tasks'), 'utf8')).resolves.toContain('src/main/ipc/passiveStepIpc.ts');
    await expect(readFile(failedMarkerPath(repositoryPath, 'tasks'), 'utf8')).resolves.toContain(`dirty-diff-${classification}`);
  });

  it('records classifier anomalies, logs classifier results, and blocks completion authority', async () => {
    const harness = createHarness();
    const { repositoryPath } = await createRepo('specs/0013-hybrid-manifest-architecture');
    const afterHook = vi.fn().mockResolvedValue({ ok: true, commit: { commitSha: 'tasks-sha' } });
    const recordClassifierAnomaly = vi.fn().mockResolvedValue(undefined);
    const transcriptClassifier = vi.fn().mockResolvedValue({
      canMarkComplete: false,
      canInvokeDoctor: false,
      anomalies: [{
        anomalyId: 'tasks-watchdog-silence-session',
        step: 'tasks',
        kind: 'watchdog-silence',
        severity: 'blocking',
        detectedAt: '2026-06-02T00:00:00.000Z',
        evidence: {
          paths: ['specs/0013-hybrid-manifest-architecture/tasks.md']
        }
      }]
    });

    registerPassiveStepIpc({
      step: 'tasks',
      channel: 'copilot:tasks',
      eventChannel: 'copilot:tasks:event',
      ipcMain: harness.ipcMain,
      logger: harness.logger,
      userDataPath: '/tmp/user',
      beforeHook: vi.fn().mockResolvedValue({ ok: true }),
      afterHook,
      agentAdapter: vi.fn().mockResolvedValue({ updates: [{ sessionId: 's1', update: { sessionUpdate: 'agent_message_chunk' } }] }),
      transcriptClassifier,
      recordClassifierAnomaly
    });

    await harness.handlers.get('copilot:tasks')?.({ sender: harness.sender }, { ...payload, repositoryPath });

    await vi.waitFor(() => expect(harness.sender.send).toHaveBeenCalledWith('copilot:tasks:event', expect.objectContaining({
      event: expect.objectContaining({
        type: 'done',
        step: 'tasks',
        status: 'fail',
        reason: 'needs-attention: transcript classifier blocked completion'
      })
    })));
    expect(recordClassifierAnomaly).toHaveBeenCalledWith(expect.objectContaining({
      repositoryPath,
      anomaly: expect.objectContaining({ anomalyId: 'tasks-watchdog-silence-session' })
    }));
    expect(harness.logger.info).toHaveBeenCalledWith(expect.objectContaining({
      event: 'classifier-result',
      anomalyIds: ['tasks-watchdog-silence-session'],
      canMarkComplete: false,
      canInvokeDoctor: false
    }), 'ipc handler invocation');
    expect(afterHook).not.toHaveBeenCalled();
    await expect(readFile(failedMarkerPath(repositoryPath, 'tasks'), 'utf8')).resolves.toContain('tasks-watchdog-silence-session');
  });

  it('orchestrates facilitator manifest, reconciliation, print-mode identity, doctor escalation, and completion adoption', async () => {
    const harness = createHarness();
    const { repositoryPath } = await createRepo('specs/0013-hybrid-manifest-architecture');
    const facilitator = {
      createOrLoadManifest: vi.fn().mockResolvedValue({ sessionId: 'manifest-session' }),
      captureBranchSnapshot: vi.fn().mockResolvedValue({ branch: 'build/manifest-architecture-dogfood' }),
      captureOwnedPathSnapshot: vi.fn().mockResolvedValue({ snapshotHash: 'snapshot-001' }),
      appendPendingAttempt: vi.fn().mockResolvedValue(undefined),
      reconcileBefore: vi.fn().mockResolvedValue({ status: 'running', canNudge: false, anomalies: [] }),
      reconcileAfter: vi.fn().mockResolvedValue({ status: 'pass', canNudge: false, anomalies: [] }),
      runDoctor: vi.fn().mockResolvedValue({ status: 'returned' })
    };
    const afterHook = vi.fn().mockResolvedValue({ ok: true, commit: { commitSha: 'tasks-sha' } });

    registerPassiveStepIpc({
      step: 'tasks',
      channel: 'copilot:tasks',
      eventChannel: 'copilot:tasks:event',
      ipcMain: harness.ipcMain,
      logger: harness.logger,
      userDataPath: '/tmp/user',
      beforeHook: vi.fn().mockResolvedValue({ ok: true }),
      afterHook,
      agentAdapter: vi.fn().mockResolvedValue({
        assistant: [{ assistantSessionId: 'assistant-session', messageId: 'message-1', turnId: 'turn-1', source: 'print-json-event' }],
        terminalResult: { exitCode: 0, resultKind: 'success' },
        logReference: { path: '/logs/tasks.jsonl', sha256: 'a'.repeat(64), sizeBytes: 42 },
        updates: []
      }),
      facilitator
    });

    await harness.handlers.get('copilot:tasks')?.({ sender: harness.sender }, { ...payload, repositoryPath });

    await vi.waitFor(() => expect(harness.sender.send).toHaveBeenCalledWith('copilot:tasks:event', expect.objectContaining({
      event: expect.objectContaining({ type: 'done', status: 'pass', commitSha: 'tasks-sha' })
    })));
    expect(facilitator.createOrLoadManifest).toHaveBeenCalledTimes(1);
    expect(facilitator.appendPendingAttempt).toHaveBeenCalledWith(expect.objectContaining({
      assistant: [expect.objectContaining({ assistantSessionId: 'assistant-session', messageId: 'message-1', turnId: 'turn-1' })],
      logReference: expect.objectContaining({ sha256: 'a'.repeat(64) }),
      terminalResult: expect.objectContaining({ resultKind: 'success' })
    }));
    expect(facilitator.reconcileBefore.mock.invocationCallOrder[0]).toBeLessThan(
      facilitator.reconcileAfter.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY
    );
    expect(facilitator.runDoctor).toHaveBeenCalledWith(expect.objectContaining({ stage: 'after' }));
    expect(afterHook).toHaveBeenCalledTimes(1);
    expect(harness.logger.info).toHaveBeenCalledWith(expect.objectContaining({ event: 'facilitator-step' }), 'ipc handler invocation');
    expect(harness.logger.info).toHaveBeenCalledWith(expect.objectContaining({ event: 'reconciliation-result', stage: 'after' }), 'ipc handler invocation');
  });

  it('sends fail without running the agent when the abort signal is already aborted', async () => {
    const harness = createHarness();
    const controller = new AbortController();
    controller.abort();
    const agentAdapter = vi.fn();

    registerPassiveStepIpc({
      step: 'analyze',
      channel: 'copilot:analyze',
      eventChannel: 'copilot:analyze:event',
      ipcMain: harness.ipcMain,
      logger: harness.logger,
      userDataPath: '/tmp/user',
      beforeHook: vi.fn().mockResolvedValue({ ok: true }),
      afterHook: vi.fn(),
      agentAdapter,
      abortSignal: controller.signal
    });

    await harness.handlers.get('copilot:analyze')?.({ sender: harness.sender }, payload);

    await vi.waitFor(() => expect(harness.sender.send).toHaveBeenCalledWith('copilot:analyze:event', expect.objectContaining({
      event: expect.objectContaining({ type: 'done', step: 'analyze', status: 'fail', reason: 'aborted' })
    })));
    expect(agentAdapter).not.toHaveBeenCalled();
  });

  it('captures analyze terminal report evidence after the analyze commit exists', async () => {
    const harness = createHarness();
    const userDataPath = await mkdtemp(path.join(os.tmpdir(), 'concierge-analyze-evidence-'));
    const { repositoryPath, featureDir } = await createRepo('specs/0009-review-evidence');

    registerPassiveStepIpc({
      step: 'analyze',
      channel: 'copilot:analyze',
      eventChannel: 'copilot:analyze:event',
      ipcMain: harness.ipcMain,
      logger: harness.logger,
      userDataPath,
      beforeHook: vi.fn().mockResolvedValue({ ok: true }),
      afterHook: vi.fn().mockResolvedValue({ ok: true, commit: { commitSha: 'analyze-sha' } }),
      agentAdapter: vi.fn().mockResolvedValue({
        updates: [
          { sessionId: 's1', update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: '# Analyze\nNo issues found.' } } }
        ]
      })
    });

    await harness.handlers.get('copilot:analyze')?.({ sender: harness.sender }, { ...payload, repositoryPath });

    await vi.waitFor(() => expect(harness.sender.send).toHaveBeenCalledWith('copilot:analyze:event', expect.objectContaining({
      event: expect.objectContaining({ type: 'done', step: 'analyze', status: 'pass', commitSha: 'analyze-sha' })
    })));
    const featureKey = path.basename(featureDir);
    await expect(readFile(path.join(userDataPath, 'evidence', featureKey, 'analyze-report-index.json'), 'utf8'))
      .resolves.toContain('"analyzeCommitSha": "analyze-sha"');
  });

  it('forwards fine-grained ACP updates as progress events so stream silence resets live', async () => {
    const harness = createHarness();
    const { repositoryPath } = await createRepo();

    registerPassiveStepIpc({
      step: 'analyze',
      channel: 'copilot:analyze',
      eventChannel: 'copilot:analyze:event',
      ipcMain: harness.ipcMain,
      logger: harness.logger,
      userDataPath: '/tmp/user',
      beforeHook: vi.fn().mockResolvedValue({ ok: true }),
      afterHook: vi.fn().mockResolvedValue({ ok: true, commit: { commitSha: 'analyze-sha' } }),
      agentAdapter: vi.fn(async (request) => {
        request.onUpdate?.({ sessionId: 's1', update: { sessionUpdate: 'tool_call_update', toolCallId: 't1' } });
        return { updates: [] };
      })
    });

    await harness.handlers.get('copilot:analyze')?.({ sender: harness.sender }, { ...payload, repositoryPath });

    await vi.waitFor(() => expect(harness.sender.send).toHaveBeenCalledWith('copilot:analyze:event', expect.objectContaining({
      event: expect.objectContaining({
        type: 'progress',
        step: 'analyze',
        message: 'Streaming analyze output',
        raw: { sessionId: 's1', update: { sessionUpdate: 'tool_call_update', toolCallId: 't1' } }
      })
    })));
  });

  it('resolves the feature dir from .specify/feature.json (not the repo root) for the hook context', async () => {
    const harness = createHarness();
    const { repositoryPath, featureDir } = await createRepo('specs/0012-clarify-bug');
    const beforeHook = vi.fn().mockResolvedValue({ ok: true });

    registerPassiveStepIpc({
      step: 'plan',
      channel: 'copilot:plan',
      eventChannel: 'copilot:plan:event',
      ipcMain: harness.ipcMain,
      logger: harness.logger,
      userDataPath: '/tmp/user',
      beforeHook,
      afterHook: vi.fn().mockResolvedValue({ ok: true, commit: { commitSha: 'abc123' } }),
      agentAdapter: vi.fn().mockResolvedValue(undefined)
    });

    await harness.handlers.get('copilot:plan')?.({ sender: harness.sender }, { ...payload, repositoryPath });

    await vi.waitFor(() => expect(beforeHook).toHaveBeenCalledTimes(1));
    expect(beforeHook).toHaveBeenCalledWith(expect.objectContaining({ repositoryPath, featureDir }));
    expect(featureDir).not.toBe(repositoryPath);
  });

  it('retries a failed tasks step idempotently by recovering stranded tasks.md before re-running the agent', async () => {
    const harness = createHarness();
    const { repositoryPath } = await createRepo('specs/0012-remove-density-settings');
    const wrongDir = path.join(repositoryPath, 'specs', '0008-react-router-refactor');
    await mkdir(wrongDir, { recursive: true });
    await writeFile(path.join(wrongDir, 'tasks.md'), '# Tasks\n- [ ] T001 Recover stranded output\n', 'utf8');
    await mkdir(path.dirname(failedMarkerPath(repositoryPath, 'tasks')), { recursive: true });
    await writeFile(failedMarkerPath(repositoryPath, 'tasks'), JSON.stringify({
      step: 'tasks',
      sessionId: 'tasks-old',
      failedAt: '2026-06-01T12:00:00.000Z',
      reason: 'factory-rejected',
      strandedArtifacts: ['specs/0008-react-router-refactor/tasks.md']
    }), 'utf8');
    const agentAdapter = vi.fn().mockResolvedValue(undefined);
    const commitWithTrailer = vi.fn().mockResolvedValue({ commitSha: 'tasks-sha' });

    registerPassiveStepIpc({
      step: 'tasks',
      channel: 'copilot:tasks',
      eventChannel: 'copilot:tasks:event',
      ipcMain: harness.ipcMain,
      logger: harness.logger,
      userDataPath: '/tmp/user',
      beforeHook: vi.fn().mockResolvedValue({ ok: true }),
      afterHook: (context) => runAfterHook('tasks', {
        ...context,
        commitWithTrailer,
        removeInFlightMarker: vi.fn().mockResolvedValue(undefined)
      }),
      agentAdapter
    });

    await harness.handlers.get('copilot:tasks')?.({ sender: harness.sender }, { ...payload, repositoryPath });

    await vi.waitFor(() => expect(harness.sender.send).toHaveBeenCalledWith('copilot:tasks:event', expect.objectContaining({
      event: expect.objectContaining({ type: 'done', step: 'tasks', status: 'pass', commitSha: 'tasks-sha' })
    })));
    expect(agentAdapter).not.toHaveBeenCalled();
    expect(commitWithTrailer).toHaveBeenCalledWith(repositoryPath, expect.objectContaining({
      step: 'tasks',
      files: [path.join('specs', '0012-remove-density-settings', 'tasks.md')]
    }));
  });

  it('emits a terminal fail (does not hang) when .specify/feature.json is missing', async () => {
    const harness = createHarness();
    const repositoryPath = await mkdtemp(path.join(os.tmpdir(), 'concierge-passive-nofj-'));
    const agentAdapter = vi.fn();

    registerPassiveStepIpc({
      step: 'tasks',
      channel: 'copilot:tasks',
      eventChannel: 'copilot:tasks:event',
      ipcMain: harness.ipcMain,
      logger: harness.logger,
      userDataPath: '/tmp/user',
      beforeHook: vi.fn().mockResolvedValue({ ok: true }),
      afterHook: vi.fn(),
      agentAdapter
    });

    await harness.handlers.get('copilot:tasks')?.({ sender: harness.sender }, { ...payload, repositoryPath });

    await vi.waitFor(() => expect(harness.sender.send).toHaveBeenCalledWith('copilot:tasks:event', expect.objectContaining({
      event: expect.objectContaining({ type: 'done', step: 'tasks', status: 'fail', reason: expect.stringContaining('.specify/feature.json') })
    })));
    expect(agentAdapter).not.toHaveBeenCalled();
  });
});
