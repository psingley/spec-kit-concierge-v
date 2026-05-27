import {
  invalid,
  isRecord,
  isStringArray,
  optionalString,
  requireExactKeys,
  requireRecord,
  requireString,
  type FactoryResult
} from './factoryUtils';

type ErrorName = 'InvalidWorkspaceReadPayload';

export type WorkspaceAgentSummary = {
  id: string;
  displayName: string;
  capabilities: string[];
};

export type WorkspaceReadRequest = {
  repositoryPath: string;
};

export type WorkspaceReadResponse = {
  activeRepoPath: string;
  agents: WorkspaceAgentSummary[];
};

export const createWorkspaceReadRequest = (
  value: unknown
): FactoryResult<WorkspaceReadRequest, ErrorName> => {
  const root = requireRecord(value, 'InvalidWorkspaceReadPayload', '$');
  if (!root.ok) {
    return root;
  }
  const keys = requireExactKeys(root.value, ['repositoryPath'], 'InvalidWorkspaceReadPayload', '$');
  if (!keys.ok) {
    return keys;
  }
  const repositoryPath = requireString(root.value.repositoryPath, 'InvalidWorkspaceReadPayload', '$.repositoryPath');
  if (!repositoryPath.ok) {
    return repositoryPath;
  }

  return { ok: true, value: { repositoryPath: repositoryPath.value } };
};

const parseAgent = (
  value: unknown,
  path: string
): FactoryResult<WorkspaceAgentSummary, ErrorName> => {
  if (!isRecord(value)) {
    return invalid('InvalidWorkspaceReadPayload', 'agent must be an object', path);
  }
  const id = requireString(value.id, 'InvalidWorkspaceReadPayload', `${path}.id`);
  if (!id.ok) {
    return id;
  }
  const displayName = requireString(value.displayName, 'InvalidWorkspaceReadPayload', `${path}.displayName`);
  if (!displayName.ok) {
    return displayName;
  }
  if (!isStringArray(value.capabilities)) {
    return invalid('InvalidWorkspaceReadPayload', 'capabilities must be a string array', `${path}.capabilities`);
  }

  return {
    ok: true,
    value: {
      id: id.value,
      displayName: displayName.value,
      capabilities: value.capabilities
    }
  };
};

export const createWorkspaceReadResponse = (
  value: unknown
): FactoryResult<WorkspaceReadResponse, ErrorName> => {
  const root = requireRecord(value, 'InvalidWorkspaceReadPayload', '$');
  if (!root.ok) {
    return root;
  }
  const keys = requireExactKeys(root.value, ['activeRepoPath', 'agents'], 'InvalidWorkspaceReadPayload', '$');
  if (!keys.ok) {
    return keys;
  }
  const activeRepoPath = requireString(root.value.activeRepoPath, 'InvalidWorkspaceReadPayload', '$.activeRepoPath');
  if (!activeRepoPath.ok) {
    return activeRepoPath;
  }
  if (!Array.isArray(root.value.agents)) {
    return invalid('InvalidWorkspaceReadPayload', 'agents must be an array', '$.agents');
  }

  const agents: WorkspaceAgentSummary[] = [];
  for (const [index, agentValue] of root.value.agents.entries()) {
    const parsed = parseAgent(agentValue, `$.agents[${index}]`);
    if (!parsed.ok) {
      return parsed;
    }
    agents.push({
      ...parsed.value,
      capabilities: parsed.value.capabilities.map((capability) => optionalString(capability) ?? '')
    });
  }

  return { ok: true, value: { activeRepoPath: activeRepoPath.value, agents } };
};
