import { describe, expect, it, vi } from 'vitest';
import {
  evaluateSpecifyReadiness,
  type SpecifyReadinessAdapters
} from './specifyReadiness';

const okAdapters = (): SpecifyReadinessAdapters => ({
  isCopilotAuthed: vi.fn(async () => true),
  resolveSelectedModel: vi.fn(async () => ({ available: ['gpt-5.5'], selectedModelId: 'gpt-5.5' })),
  canEstablishSession: vi.fn(async () => true),
  inspectTargetRepo: vi.fn(async () => ({ exists: true, isGitRepo: true, clean: true })),
  hasSpecKit: vi.fn(async () => true)
});

const request = { repositoryPath: '/work/cloned-repo', modelId: 'gpt-5.5' };

describe('evaluateSpecifyReadiness', () => {
  it('returns ready when every precondition passes', async () => {
    const adapters = okAdapters();
    const result = await evaluateSpecifyReadiness(request, adapters);

    expect(result.ready).toBe(true);
    expect(result.checks).toHaveLength(5);
    expect(result.checks.every((check) => check.ok)).toBe(true);
    expect(result.checks.map((check) => check.name)).toEqual([
      'copilot-authed',
      'model-available',
      'acp-session',
      'target-repo',
      'spec-kit-present'
    ]);
  });

  it('fails when copilot is not authed', async () => {
    const adapters = { ...okAdapters(), isCopilotAuthed: vi.fn(async () => false) };
    const result = await evaluateSpecifyReadiness(request, adapters);

    expect(result.ready).toBe(false);
    expect(result.checks.find((check) => check.name === 'copilot-authed')?.ok).toBe(false);
    expect(result.failingCheck?.name).toBe('copilot-authed');
  });

  it('fails when no model is available or selected (today actual failure)', async () => {
    const adapters = {
      ...okAdapters(),
      resolveSelectedModel: vi.fn(async () => ({ available: [], selectedModelId: undefined }))
    };
    const result = await evaluateSpecifyReadiness({ repositoryPath: request.repositoryPath }, adapters);

    expect(result.ready).toBe(false);
    const modelCheck = result.checks.find((check) => check.name === 'model-available');
    expect(modelCheck?.ok).toBe(false);
    expect(modelCheck?.detail).toContain('model picker');
    expect(result.failingCheck?.name).toBe('model-available');
  });

  it('fails when models exist but none is selected', async () => {
    const adapters = {
      ...okAdapters(),
      resolveSelectedModel: vi.fn(async () => ({ available: ['gpt-5.5'], selectedModelId: undefined }))
    };
    const result = await evaluateSpecifyReadiness({ repositoryPath: request.repositoryPath }, adapters);

    expect(result.ready).toBe(false);
    expect(result.failingCheck?.name).toBe('model-available');
  });

  it('fails when the ACP session cannot be established', async () => {
    const adapters = { ...okAdapters(), canEstablishSession: vi.fn(async () => false) };
    const result = await evaluateSpecifyReadiness(request, adapters);

    expect(result.ready).toBe(false);
    expect(result.failingCheck?.name).toBe('acp-session');
  });

  it('fails when the target repo path does not exist', async () => {
    const adapters = {
      ...okAdapters(),
      inspectTargetRepo: vi.fn(async () => ({ exists: false, isGitRepo: false, clean: false }))
    };
    const result = await evaluateSpecifyReadiness(request, adapters);

    expect(result.ready).toBe(false);
    expect(result.failingCheck?.name).toBe('target-repo');
  });

  it('fails when the target path is not a git repo', async () => {
    const adapters = {
      ...okAdapters(),
      inspectTargetRepo: vi.fn(async () => ({ exists: true, isGitRepo: false, clean: false }))
    };
    const result = await evaluateSpecifyReadiness(request, adapters);

    expect(result.ready).toBe(false);
    expect(result.failingCheck?.name).toBe('target-repo');
  });

  it('fails when the target repo is dirty', async () => {
    const adapters = {
      ...okAdapters(),
      inspectTargetRepo: vi.fn(async () => ({ exists: true, isGitRepo: true, clean: false }))
    };
    const result = await evaluateSpecifyReadiness(request, adapters);

    expect(result.ready).toBe(false);
    expect(result.failingCheck?.name).toBe('target-repo');
  });

  it('fails when spec-kit is not present in the target', async () => {
    const adapters = { ...okAdapters(), hasSpecKit: vi.fn(async () => false) };
    const result = await evaluateSpecifyReadiness(request, adapters);

    expect(result.ready).toBe(false);
    expect(result.failingCheck?.name).toBe('spec-kit-present');
  });

  it('reports the FIRST failing check when several preconditions fail', async () => {
    const adapters = {
      isCopilotAuthed: vi.fn(async () => false),
      resolveSelectedModel: vi.fn(async () => ({ available: [], selectedModelId: undefined })),
      canEstablishSession: vi.fn(async () => false),
      inspectTargetRepo: vi.fn(async () => ({ exists: false, isGitRepo: false, clean: false })),
      hasSpecKit: vi.fn(async () => false)
    };
    const result = await evaluateSpecifyReadiness({ repositoryPath: request.repositoryPath }, adapters);

    expect(result.ready).toBe(false);
    expect(result.failingCheck?.name).toBe('copilot-authed');
  });
});
