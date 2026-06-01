import path from 'node:path';
import { access } from 'node:fs/promises';
import { readBranchState } from '../data-layer/git/branchState';
import { readCopilotAuthStatus, readGitHubAuthStatus } from '../data-layer/auth/cliAuth';

export type SpecifyReadinessCheckName =
  | 'copilot-authed'
  | 'model-available'
  | 'acp-session'
  | 'target-repo'
  | 'spec-kit-present';

export type SpecifyReadinessCheck = {
  name: SpecifyReadinessCheckName;
  ok: boolean;
  detail: string;
};

export type SpecifyReadinessReport = {
  ready: boolean;
  checks: SpecifyReadinessCheck[];
  failingCheck?: SpecifyReadinessCheck;
};

export type SpecifyReadinessRequest = {
  repositoryPath: string;
  modelId?: string;
};

export type TargetRepoInspection = {
  exists: boolean;
  isGitRepo: boolean;
  clean: boolean;
};

export type ModelSelectionState = {
  available: string[];
  selectedModelId?: string;
};

export type SpecifyReadinessAdapters = {
  isCopilotAuthed: () => Promise<boolean>;
  resolveSelectedModel: (request: SpecifyReadinessRequest) => Promise<ModelSelectionState>;
  canEstablishSession: () => Promise<boolean>;
  inspectTargetRepo: (repositoryPath: string) => Promise<TargetRepoInspection>;
  hasSpecKit: (repositoryPath: string) => Promise<boolean>;
};

export const evaluateSpecifyReadiness = async (
  request: SpecifyReadinessRequest,
  adapters: SpecifyReadinessAdapters
): Promise<SpecifyReadinessReport> => {
  const checks: SpecifyReadinessCheck[] = [];

  const copilotAuthed = await adapters.isCopilotAuthed();
  checks.push({
    name: 'copilot-authed',
    ok: copilotAuthed,
    detail: copilotAuthed ? 'Copilot CLI is authenticated.' : 'Copilot is not logged in — open Settings to sign in.'
  });

  const modelState = await adapters.resolveSelectedModel(request);
  const modelOk = modelState.available.length > 0 && modelState.selectedModelId !== undefined;
  checks.push({
    name: 'model-available',
    ok: modelOk,
    detail: modelOk
      ? `Model "${modelState.selectedModelId}" selected from ${modelState.available.length} available.`
      : 'No Copilot model available — open the model picker.'
  });

  const sessionOk = await adapters.canEstablishSession();
  checks.push({
    name: 'acp-session',
    ok: sessionOk,
    detail: sessionOk ? 'ACP session can be established.' : 'Cannot establish a Copilot ACP session.'
  });

  const repo = await adapters.inspectTargetRepo(request.repositoryPath);
  const repoOk = repo.exists && repo.isGitRepo && repo.clean;
  const repoDetail = !repo.exists
    ? 'Target repository path does not exist.'
    : !repo.isGitRepo
      ? 'Target repository path is not a git repository.'
      : !repo.clean
        ? 'Target repository has uncommitted changes — commit or stash before Specify.'
        : 'Target repository exists, is a git repo, and is clean.';
  checks.push({ name: 'target-repo', ok: repoOk, detail: repoDetail });

  const specKitOk = await adapters.hasSpecKit(request.repositoryPath);
  checks.push({
    name: 'spec-kit-present',
    ok: specKitOk,
    detail: specKitOk ? 'spec-kit (.specify/) is present in the target.' : 'spec-kit is not initialised in the target (.specify/ missing).'
  });

  const failingCheck = checks.find((check) => !check.ok);

  return {
    ready: failingCheck === undefined,
    checks,
    failingCheck
  };
};

// Default production adapters. Kept separate from the pure evaluator so the
// evaluator stays hermetically unit-testable.
export const createSpecifyReadinessAdapters = (deps: {
  capabilitiesProbe: () => Promise<{ available: string[]; current?: string }>;
}): SpecifyReadinessAdapters => ({
  isCopilotAuthed: async () => {
    const github = await readGitHubAuthStatus();
    return (await readCopilotAuthStatus(github.login)).authenticated;
  },
  resolveSelectedModel: async (request) => {
    const probe = await deps.capabilitiesProbe();
    const selectedModelId =
      request.modelId ?? probe.current ?? (probe.available.length > 0 ? probe.available[0] : undefined);
    return { available: probe.available, selectedModelId };
  },
  canEstablishSession: async () => {
    try {
      const probe = await deps.capabilitiesProbe();
      return probe.available.length >= 0;
    } catch {
      return false;
    }
  },
  inspectTargetRepo: async (repositoryPath) => {
    try {
      await access(repositoryPath);
    } catch {
      return { exists: false, isGitRepo: false, clean: false };
    }
    try {
      const state = await readBranchState(repositoryPath);
      return { exists: true, isGitRepo: true, clean: !state.dirty };
    } catch {
      return { exists: true, isGitRepo: false, clean: false };
    }
  },
  hasSpecKit: async (repositoryPath) => {
    try {
      await access(path.join(repositoryPath, '.specify'));
      return true;
    } catch {
      return false;
    }
  }
});
