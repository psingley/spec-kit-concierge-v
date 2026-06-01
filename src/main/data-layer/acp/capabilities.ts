import {
  AGENT_MODE_URI,
  type BoundCLIConfigOption,
  type BoundCLIFactoryError,
  type BoundCLIFactoryResult,
  type BoundCLIMode,
  type BoundCLIModel
} from './types';

const invalid = (message: string, path: string): { ok: false; error: BoundCLIFactoryError } => ({
  ok: false,
  error: {
    name: 'InvalidBoundCLICapabilities',
    message,
    path
  }
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasOwn = (value: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const requireRecord = (
  value: unknown,
  path: string
): { ok: true; value: Record<string, unknown> } | { ok: false; error: BoundCLIFactoryError } =>
  isRecord(value) ? { ok: true, value } : invalid('must be an object', path);

const requireString = (
  value: unknown,
  path: string
): { ok: true; value: string } | { ok: false; error: BoundCLIFactoryError } =>
  typeof value === 'string' ? { ok: true, value } : invalid('must be a string', path);

const requireBoolean = (
  record: Record<string, unknown>,
  key: string,
  path: string
): { ok: true; value: boolean } | { ok: false; error: BoundCLIFactoryError } => {
  if (!hasOwn(record, key)) {
    return invalid('is required', path);
  }

  return typeof record[key] === 'boolean'
    ? { ok: true, value: record[key] }
    : invalid('must be a boolean', path);
};

const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

export const parseModels = (value: unknown): { available: BoundCLIModel[]; current?: string } => {
  if (!isRecord(value)) {
    return { available: [] };
  }

  const availableModels = Array.isArray(value.availableModels) ? value.availableModels : [];
  const available = availableModels.flatMap((item): BoundCLIModel[] => {
    if (!isRecord(item) || typeof item.modelId !== 'string' || typeof item.name !== 'string') {
      return [];
    }

    const meta = isRecord(item._meta) ? item._meta : {};

    return [
      {
        id: item.modelId,
        name: item.name,
        description: optionalString(item.description),
        cost: optionalString(meta.copilotUsage),
        enablement: optionalString(meta.copilotEnablement)
      }
    ];
  });

  return {
    available,
    current: optionalString(value.currentModelId)
  };
};

export const parseModes = (value: unknown): { available: BoundCLIMode[]; current: string } => {
  if (!isRecord(value)) {
    return { available: [], current: AGENT_MODE_URI };
  }

  const availableModes = Array.isArray(value.availableModes) ? value.availableModes : [];
  const available = availableModes.flatMap((item): BoundCLIMode[] => {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.name !== 'string') {
      return [];
    }

    return [
      {
        id: item.id,
        name: item.name,
        description: optionalString(item.description)
      }
    ];
  });

  return {
    available,
    current: optionalString(value.currentModeId) ?? AGENT_MODE_URI
  };
};

export const parseBoundCLIConfigOptions = (value: unknown): BoundCLIConfigOption[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item): BoundCLIConfigOption[] => {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.name !== 'string') {
      return [];
    }

    const itemType = item.type === 'boolean' ? 'boolean' : item.type === 'select' ? 'select' : null;
    if (itemType === null) {
      return [];
    }

    const rawOptions = Array.isArray(item.options) ? item.options : [];
    const options = rawOptions.flatMap((option): Array<{ value: string; name: string; description?: string }> => {
      if (!isRecord(option) || typeof option.value !== 'string' || typeof option.name !== 'string') {
        return [];
      }

      return [
        {
          value: option.value,
          name: option.name,
          description: optionalString(option.description)
        }
      ];
    });

    const currentValue =
      typeof item.currentValue === 'boolean' || typeof item.currentValue === 'string'
        ? item.currentValue
        : itemType === 'boolean'
          ? false
          : '';

    return [
      {
        id: item.id,
        type: itemType,
        name: item.name,
        currentValue,
        category: optionalString(item.category),
        options
      }
    ];
  });
};

export const createBoundCLICapabilities = (value: unknown): BoundCLIFactoryResult => {
  const root = requireRecord(value, '$');
  if (!root.ok) {
    return root;
  }

  if (typeof root.value.protocolVersion !== 'number') {
    return invalid('protocolVersion must be a number', '$.protocolVersion');
  }

  const agentCapabilities = requireRecord(root.value.agentCapabilities, '$.agentCapabilities');
  if (!agentCapabilities.ok) {
    return agentCapabilities;
  }

  const loadSession = requireBoolean(
    agentCapabilities.value,
    'loadSession',
    '$.agentCapabilities.loadSession'
  );
  if (!loadSession.ok) {
    return loadSession;
  }

  const mcpCapabilities = requireRecord(
    agentCapabilities.value.mcpCapabilities,
    '$.agentCapabilities.mcpCapabilities'
  );
  if (!mcpCapabilities.ok) {
    return mcpCapabilities;
  }

  const mcpHttp = requireBoolean(mcpCapabilities.value, 'http', '$.agentCapabilities.mcpCapabilities.http');
  if (!mcpHttp.ok) {
    return mcpHttp;
  }

  const mcpSse = requireBoolean(mcpCapabilities.value, 'sse', '$.agentCapabilities.mcpCapabilities.sse');
  if (!mcpSse.ok) {
    return mcpSse;
  }

  const promptCapabilities = requireRecord(
    agentCapabilities.value.promptCapabilities,
    '$.agentCapabilities.promptCapabilities'
  );
  if (!promptCapabilities.ok) {
    return promptCapabilities;
  }

  const promptImage = requireBoolean(
    promptCapabilities.value,
    'image',
    '$.agentCapabilities.promptCapabilities.image'
  );
  if (!promptImage.ok) {
    return promptImage;
  }

  const promptAudio = requireBoolean(
    promptCapabilities.value,
    'audio',
    '$.agentCapabilities.promptCapabilities.audio'
  );
  if (!promptAudio.ok) {
    return promptAudio;
  }

  const embeddedContext = requireBoolean(
    promptCapabilities.value,
    'embeddedContext',
    '$.agentCapabilities.promptCapabilities.embeddedContext'
  );
  if (!embeddedContext.ok) {
    return embeddedContext;
  }

  const sessionCapabilities = isRecord(agentCapabilities.value.sessionCapabilities)
    ? agentCapabilities.value.sessionCapabilities
    : {};
  const agentInfo = requireRecord(root.value.agentInfo, '$.agentInfo');
  if (!agentInfo.ok) {
    return agentInfo;
  }

  const agentName = requireString(agentInfo.value.name, '$.agentInfo.name');
  if (!agentName.ok) {
    return agentName;
  }

  const agentTitle = requireString(agentInfo.value.title, '$.agentInfo.title');
  if (!agentTitle.ok) {
    return agentTitle;
  }

  const agentVersion = requireString(agentInfo.value.version, '$.agentInfo.version');
  if (!agentVersion.ok) {
    return agentVersion;
  }

  const authMethods = Array.isArray(root.value.authMethods)
    ? root.value.authMethods.flatMap((method): Array<{ id: string; name: string; description?: string }> => {
        if (!isRecord(method) || typeof method.id !== 'string' || typeof method.name !== 'string') {
          return [];
        }

        return [
          {
            id: method.id,
            name: method.name,
            description: optionalString(method.description)
          }
        ];
      })
    : [];

  return {
    ok: true,
    value: {
      protocolVersion: root.value.protocolVersion,
      agent: {
        name: agentName.value,
        title: agentTitle.value,
        version: agentVersion.value
      },
      agentCapabilities: {
        loadSession: loadSession.value,
        listSessions: isRecord(sessionCapabilities.list),
        mcp: {
          http: mcpHttp.value,
          sse: mcpSse.value
        },
        prompt: {
          image: promptImage.value,
          audio: promptAudio.value,
          embeddedContext: embeddedContext.value
        }
      },
      authMethods,
      models: parseModels(root.value.models),
      modes: parseModes(root.value.modes),
      configOptions: parseBoundCLIConfigOptions(root.value.configOptions)
    }
  };
};
