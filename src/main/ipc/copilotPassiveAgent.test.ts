import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPassiveCopilotAgentAdapter } from './copilotPassiveAgent';
import type { AgentManifest } from '../data-layer/agents/manifest';
import type { BoundCLIPromptResult } from '../data-layer/acp/types';

const captures = vi.hoisted(() => ({
  supervisorOptions: [] as Array<{ env?: Record<string, string> }>,
  prompts: [] as string[]
}));

const copilotAgent: AgentManifest['agents'][string] = {
  displayName: 'GitHub Copilot CLI',
  binary: 'copilot',
  launchArgs: ['--allow-all-tools'],
  acpModeFlag: '--acp',
  verifiedAgainst: {
    version: '1.0.56',
    verifiedAt: '2026-05-31'
  },
  capabilities: ['text', 'tools'],
  modelSelectionStrategy: 'unstable_setSessionModel|restart',
  defaultModel: null
};

vi.mock('../data-layer/agents/loader', () => ({
  loadAgentManifest: vi.fn(async (): Promise<AgentManifest> => ({
    version: 1,
    agents: {
      copilot: copilotAgent
    }
  }))
}));

vi.mock('../data-layer/acp/supervisor', () => ({
  BoundCLISupervisor: vi.fn().mockImplementation((options: { env?: Record<string, string> }) => {
    captures.supervisorOptions.push(options);
    return {
      start: vi.fn(async () => ({
        newSession: vi.fn(async () => ({ sessionId: 'acp-session-1' })),
        setModel: vi.fn(async () => {}),
        prompt: vi.fn(async (_sessionId: string, prompt: string): Promise<BoundCLIPromptResult> => {
          captures.prompts.push(prompt);
          return { stopReason: 'end_turn', updates: [] };
        }),
        dispose: vi.fn(async () => ({ outcome: 'closed' }))
      }))
    };
  })
}));

describe('createPassiveCopilotAgentAdapter feature pinning', () => {
  beforeEach(() => {
    captures.supervisorOptions = [];
    captures.prompts = [];
  });

  const steps = [
    { step: 'plan', command: '/speckit.plan' },
    { step: 'tasks', command: '/speckit.tasks' },
    { step: 'analyze', command: '/speckit.analyze' }
  ] as const;

  for (const { step, command } of steps) {
    it(`pins the feature directory for ${step}`, async () => {
      const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
      const adapter = createPassiveCopilotAgentAdapter(logger, '/tmp/user-data');
      const repositoryPath = '/repo';
      const featureDir = '/repo/specs/001-specify-smoke-test';

      await adapter({
        repositoryPath,
        featureDir,
        step,
        sessionId: 's1',
        signal: new AbortController().signal,
        onUpdate: undefined,
        subscriptionId: 'sub',
        branch: 'b'
      });

      expect(captures.supervisorOptions).toHaveLength(1);
      expect(captures.supervisorOptions[0]?.env).toEqual({
        SPECIFY_FEATURE: '001-specify-smoke-test',
        SPECIFY_FEATURE_DIRECTORY: path.relative(repositoryPath, featureDir)
      });

      expect(captures.prompts).toHaveLength(1);
      const prompt = captures.prompts[0] ?? '';
      expect(prompt).toContain(featureDir);
      expect(prompt).toContain('Do not scan for or switch to any other feature');
      expect(prompt).toContain(command);

      if (step === 'analyze') {
        expect(prompt).toMatch(/allow-empty|leave the tree unchanged/);
      }
    });
  }
});
