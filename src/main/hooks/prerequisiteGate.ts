import type { StepName } from './manifest';
import type { StepEscapeHatchReason, StepHookContext } from './types';

export type PrerequisiteGateResult =
  | { ok: true }
  | { ok: false; escapeHatchReason: StepEscapeHatchReason; missingStep?: StepName };

const prerequisiteOrder: Record<StepName, StepName[]> = {
  specify: [],
  clarify: ['specify'],
  plan: ['specify', 'clarify'],
  tasks: ['specify', 'clarify', 'plan'],
  analyze: ['specify', 'clarify', 'plan', 'tasks'],
  review: ['specify', 'clarify', 'plan', 'tasks', 'analyze']
};

export const checkStepPrerequisites = async (
  step: StepName,
  context: StepHookContext
): Promise<PrerequisiteGateResult> => {
  const auth = context.authStatus;
  if (auth !== undefined && (auth.copilotLoggedIn !== true || auth.githubLoggedIn !== true)) {
    return { ok: false, escapeHatchReason: 'auth-unavailable' };
  }

  const mcp = context.mcpConfig;
  if (mcp !== undefined && Object.keys(mcp.mcpServers).length === 0) {
    return { ok: false, escapeHatchReason: 'mcp-unavailable' };
  }

  const prerequisites = prerequisiteOrder[step];
  if (prerequisites.length === 0 || context.readTrailers === undefined) {
    return { ok: true };
  }

  const trailers = await context.readTrailers();
  const latest = new Map<StepName, string>();
  for (const trailer of trailers) {
    latest.set(trailer.step, trailer.status);
  }

  for (const prerequisite of prerequisites) {
    if (latest.get(prerequisite) !== 'pass') {
      return { ok: false, escapeHatchReason: 'prerequisite-missing', missingStep: prerequisite };
    }
  }

  return { ok: true };
};
