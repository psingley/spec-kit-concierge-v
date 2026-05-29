import { loadAgentManifest } from '../data-layer/agents/loader';
import { BoundCLISupervisor } from '../data-layer/acp/supervisor';
import type { MainLogger } from '../logging';
import type { PassiveStepAgentAdapter, PassiveStepName } from './passiveStepIpc';

const promptForStep = (step: PassiveStepName): string => {
  if (step === 'plan') {
    return 'Run /speckit.plan for this feature. Produce plan.md and research.md, and discover optional contracts/quickstart artifacts without inventing missing files.';
  }
  if (step === 'tasks') {
    return 'Run /speckit.tasks for this feature. Produce tasks.md with strict checklist task ids, dependencies, files, and acceptance notes when present.';
  }
  return 'Run /speckit.analyze for this feature. Remediate only spec.md, plan.md, and tasks.md. If no changes are needed, leave the tree unchanged for an allow-empty Step Commit.';
};

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
  const supervisor = new BoundCLISupervisor({ agent, logger, userDataPath });
  const session = await supervisor.start();
  try {
    const created = await session.newSession(request.repositoryPath, [], { step: request.step });
    if (request.modelId !== undefined) {
      await session.setModel(created.sessionId, request.modelId);
    }
    if (request.signal.aborted) {
      throw new Error('aborted');
    }
    await session.prompt(created.sessionId, promptForStep(request.step));
  } finally {
    await session.dispose();
  }
};
