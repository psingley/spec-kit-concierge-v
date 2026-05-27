export type AgentCapability = 'text' | 'tools';

export type AgentVerification = {
  version: string;
  date: string;
};

export type AgentManifestEntry = {
  displayName: string;
  binary: string;
  launchArgs: string[];
  acpFlag: string;
  verifiedAgainst?: AgentVerification;
  capabilities: AgentCapability[];
  modelSelectionStrategy: 'unstable_setSessionModel|restart';
  defaultModel: string | null;
};

export type AgentManifest = {
  version: 1;
  agents: Record<string, AgentManifestEntry>;
};

export type ManifestFactoryError = {
  name: 'InvalidAgentManifest';
  message: string;
  path: string;
};

export type ManifestFactoryFailure = { ok: false; error: ManifestFactoryError };

export type ManifestFactoryResult = { ok: true; value: AgentManifest } | ManifestFactoryFailure;

const invalid = (message: string, path: string): ManifestFactoryFailure => ({
  ok: false,
  error: {
    name: 'InvalidAgentManifest',
    message,
    path
  }
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const isCapabilities = (value: unknown): value is AgentCapability[] =>
  Array.isArray(value) &&
  value.every((item) => item === 'text' || item === 'tools') &&
  new Set(value).size === value.length;

const parseVerification = (
  value: unknown,
  path: string
): { ok: true; value?: AgentVerification } | { ok: false; error: ManifestFactoryError } => {
  if (value === undefined) {
    return { ok: true };
  }

  if (!isRecord(value)) {
    return invalid('verifiedAgainst must be an object when present', path);
  }

  if (typeof value.version !== 'string') {
    return invalid('verifiedAgainst.version must be a string', `${path}.version`);
  }

  if (typeof value.date !== 'string') {
    return invalid('verifiedAgainst.date must be a string', `${path}.date`);
  }

  return {
    ok: true,
    value: {
      version: value.version,
      date: value.date
    }
  };
};

const parseEntry = (
  value: unknown,
  path: string
): { ok: true; value: AgentManifestEntry } | { ok: false; error: ManifestFactoryError } => {
  if (!isRecord(value)) {
    return invalid('agent entry must be an object', path);
  }

  if (typeof value.displayName !== 'string') {
    return invalid('displayName must be a string', `${path}.displayName`);
  }

  if (typeof value.binary !== 'string') {
    return invalid('binary must be a string', `${path}.binary`);
  }

  if (!isStringArray(value.launchArgs)) {
    return invalid('launchArgs must be an array of strings', `${path}.launchArgs`);
  }

  if (typeof value.acpFlag !== 'string') {
    return invalid('acpFlag must be a string', `${path}.acpFlag`);
  }

  const verification = parseVerification(value.verifiedAgainst, `${path}.verifiedAgainst`);

  if (!verification.ok) {
    return verification;
  }

  if (!isCapabilities(value.capabilities)) {
    return invalid('capabilities must contain unique text/tools values', `${path}.capabilities`);
  }

  if (value.modelSelectionStrategy !== 'unstable_setSessionModel|restart') {
    return invalid(
      'modelSelectionStrategy must be unstable_setSessionModel|restart',
      `${path}.modelSelectionStrategy`
    );
  }

  if (value.defaultModel !== null && typeof value.defaultModel !== 'string') {
    return invalid('defaultModel must be a string or null', `${path}.defaultModel`);
  }

  return {
    ok: true,
    value: {
      displayName: value.displayName,
      binary: value.binary,
      launchArgs: value.launchArgs,
      acpFlag: value.acpFlag,
      ...(verification.value === undefined ? {} : { verifiedAgainst: verification.value }),
      capabilities: value.capabilities,
      modelSelectionStrategy: value.modelSelectionStrategy,
      defaultModel: value.defaultModel
    }
  };
};

export const createAgentManifest = (value: unknown): ManifestFactoryResult => {
  if (!isRecord(value)) {
    return invalid('manifest must be an object', '$');
  }

  if (value.version !== 1) {
    return invalid('manifest version must be 1', '$.version');
  }

  if (!isRecord(value.agents)) {
    return invalid('agents must be an object', '$.agents');
  }

  const agents: Record<string, AgentManifestEntry> = {};

  for (const [agentName, agentValue] of Object.entries(value.agents)) {
    const entry = parseEntry(agentValue, `$.agents.${agentName}`);

    if (!entry.ok) {
      return entry;
    }

    agents[agentName] = entry.value;
  }

  return {
    ok: true,
    value: {
      version: 1,
      agents
    }
  };
};
