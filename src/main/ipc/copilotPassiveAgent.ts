import path from 'node:path';
import { loadAgentManifest } from '../data-layer/agents/loader';
import { BoundCLISupervisor } from '../data-layer/acp/supervisor';
import type { MainLogger } from '../logging';
import type { PassiveStepAgentAdapter, PassiveStepName } from './passiveStepIpc';

// In a multi-spec worktree the /speckit.<step> agent is an LLM that re-derives the
// active feature by scanning specs/. With many sibling dirs it picks the wrong one
// (observed: plan overwrote the highest-numbered last-merged feature's plan.md
// instead of the session's feature). Pin the feature TWO ways so it cannot drift —
// matching the proven clarify approach:
//   1. PROMPT: name the absolute feature dir + forbid scanning/switching. The LLM acts
//      from cwd=worktree-root with its own tools, so an absolute path is unambiguous.
//   2. ENV: spec-kit's common.sh honors SPECIFY_FEATURE (branch-name equivalent = the
//      feature folder basename) and SPECIFY_FEATURE_DIRECTORY (repo-relative; the bash
//      prepends repo_root) before any specs/ scan, so the script resolver targets ours.
const promptForStep = (step: PassiveStepName, featureDir: string): string => {
  if (step === 'plan') {
    return `Run /speckit.plan for the feature at ${featureDir}. Read the spec.md in THAT directory only and produce plan.md and research.md in THAT directory. Discover optional contracts/quickstart artifacts without inventing missing files. Do not scan for or switch to any other feature directory; the target feature is already determined.`;
  }
  if (step === 'tasks') {
    return `Run /speckit.tasks for the feature at ${featureDir}. Read spec.md and plan.md in THAT directory only and produce tasks.md in THAT directory with strict checklist task ids, dependencies, files, and acceptance notes when present. Do not scan for or switch to any other feature directory; the target feature is already determined.`;
  }
  return `Run /speckit.analyze for the feature at ${featureDir}. Remediate only spec.md, plan.md, and tasks.md in THAT directory. Do not scan for or switch to any other feature directory; the target feature is already determined. If no changes are needed, leave the tree unchanged for an allow-empty Step Commit.`;
};

const passiveFeatureEnv = (repositoryPath: string, featureDir: string): Record<string, string> => ({
  SPECIFY_FEATURE: path.basename(featureDir),
  SPECIFY_FEATURE_DIRECTORY: path.relative(repositoryPath, featureDir)
});

export const createPassiveCopilotAgentAdapter =
  (logger: Pick<MainLogger, 'info' | 'warn' | 'error'>, userDataPath: string): PassiveStepAgentAdapter =>
async (request) => {
  if (request.signal.aborted) {
    throw new Error('aborted');
  }
  const manifest = await loadAgentManifest(logger);
  const agent = manifest.agents.copilot;
  if (agent === undefined) {
    throw new Error('Copilot agent manifest entry is missing.');
  }
  const supervisor = new BoundCLISupervisor({
    agent,
    logger,
    userDataPath,
    env: passiveFeatureEnv(request.repositoryPath, request.featureDir)
  });
  const session = await supervisor.start();
  try {
    const created = await session.newSession(request.repositoryPath, [], { step: request.step });
    if (request.modelId !== undefined) {
      await session.setModel(created.sessionId, request.modelId);
    }
    if (request.signal.aborted) {
      throw new Error('aborted');
    }
    const result = await session.prompt(created.sessionId, promptForStep(request.step, request.featureDir), request.onUpdate);
    return { updates: result.updates };
  } finally {
    await session.dispose();
  }
};
