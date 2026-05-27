import {
  invalid,
  isRecord,
  isStringArray,
  requireExactKeys,
  requireRecord,
  requireString,
  type RendererBoundaryErrorName,
  type RendererFactoryResult
} from './factoryUtils';

type ErrorName = 'InvalidWorkspaceState';

export type RendererWorkspaceAgent = {
  id: string;
  displayName: string;
  capabilities: string[];
};

export type RendererWorkspaceState = {
  activeRepoPath: string;
  agents: RendererWorkspaceAgent[];
};

export const parseRendererWorkspace = (
  value: unknown
): RendererFactoryResult<RendererWorkspaceState, RendererBoundaryErrorName<ErrorName>> => {
  const root = requireRecord(value, 'InvalidWorkspaceState', '$');
  if (!root.ok) {
    return root;
  }
  const activeRepoPath = requireString(root.value.activeRepoPath, 'InvalidWorkspaceState', '$.activeRepoPath');
  if (!activeRepoPath.ok) {
    return activeRepoPath;
  }
  if (!Array.isArray(root.value.agents)) {
    return invalid('InvalidWorkspaceState', 'agents must be an array', '$.agents');
  }
  const exactKeys = requireExactKeys<ErrorName>(root.value, ['activeRepoPath', 'agents']);
  if (!exactKeys.ok) {
    return exactKeys;
  }
  const agents: RendererWorkspaceAgent[] = [];
  for (const [index, agent] of root.value.agents.entries()) {
    if (!isRecord(agent)) {
      return invalid('InvalidWorkspaceState', 'agent must be an object', `$.agents[${index}]`);
    }
    const id = requireString(agent.id, 'InvalidWorkspaceState', `$.agents[${index}].id`);
    if (!id.ok) {
      return id;
    }
    const displayName = requireString(agent.displayName, 'InvalidWorkspaceState', `$.agents[${index}].displayName`);
    if (!displayName.ok) {
      return displayName;
    }
    if (!isStringArray(agent.capabilities)) {
      return invalid('InvalidWorkspaceState', 'capabilities must be a string array', `$.agents[${index}].capabilities`);
    }
    agents.push({ id: id.value, displayName: displayName.value, capabilities: agent.capabilities });
  }

  return { ok: true, value: { activeRepoPath: activeRepoPath.value, agents } };
};
