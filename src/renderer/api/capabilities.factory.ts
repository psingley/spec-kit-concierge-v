export type RendererBoundCLICapabilities = {
  protocolVersion: number;
  agent: {
    name: string;
    title: string;
    version: string;
  };
  agentCapabilities: {
    loadSession: boolean;
    listSessions: boolean;
    mcp: {
      http: boolean;
      sse: boolean;
    };
    prompt: {
      image: boolean;
      audio: boolean;
      embeddedContext: boolean;
    };
  };
  models: {
    available: Array<{ id: string; name: string; cost?: string; enablement?: string }>;
    current?: string;
  };
  modes: {
    available: Array<{ id: string; name: string; description?: string }>;
    current: string;
  };
};

export type RendererCapabilitiesFactoryError = {
  name: 'InvalidBoundCLICapabilities';
  message: string;
  path: string;
};

export type RendererCapabilitiesFactoryResult =
  | { ok: true; value: RendererBoundCLICapabilities }
  | { ok: false; error: RendererCapabilitiesFactoryError };

const invalid = (
  message: string,
  path: string
): { ok: false; error: RendererCapabilitiesFactoryError } => ({
  ok: false,
  error: {
    name: 'InvalidBoundCLICapabilities',
    message,
    path
  }
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const requireRecord = (
  value: unknown,
  path: string
): { ok: true; value: Record<string, unknown> } | { ok: false; error: RendererCapabilitiesFactoryError } =>
  isRecord(value) ? { ok: true, value } : invalid('must be an object', path);

const requireString = (
  value: unknown,
  path: string
): { ok: true; value: string } | { ok: false; error: RendererCapabilitiesFactoryError } =>
  typeof value === 'string' ? { ok: true, value } : invalid('must be a string', path);

const requireBoolean = (
  value: unknown,
  path: string
): { ok: true; value: boolean } | { ok: false; error: RendererCapabilitiesFactoryError } =>
  typeof value === 'boolean' ? { ok: true, value } : invalid('must be a boolean', path);

export const parseRendererBoundCLICapabilities = (
  value: unknown
): RendererCapabilitiesFactoryResult => {
  const root = requireRecord(value, '$');
  if (!root.ok) {
    return root;
  }

  if (typeof root.value.protocolVersion !== 'number') {
    return invalid('protocolVersion must be a number', '$.protocolVersion');
  }

  const agent = requireRecord(root.value.agent, '$.agent');
  if (!agent.ok) {
    return agent;
  }
  const name = requireString(agent.value.name, '$.agent.name');
  if (!name.ok) {
    return name;
  }
  const title = requireString(agent.value.title, '$.agent.title');
  if (!title.ok) {
    return title;
  }
  const version = requireString(agent.value.version, '$.agent.version');
  if (!version.ok) {
    return version;
  }

  const agentCapabilities = requireRecord(root.value.agentCapabilities, '$.agentCapabilities');
  if (!agentCapabilities.ok) {
    return agentCapabilities;
  }
  const loadSession = requireBoolean(
    agentCapabilities.value.loadSession,
    '$.agentCapabilities.loadSession'
  );
  if (!loadSession.ok) {
    return loadSession;
  }
  const listSessions = requireBoolean(
    agentCapabilities.value.listSessions,
    '$.agentCapabilities.listSessions'
  );
  if (!listSessions.ok) {
    return listSessions;
  }
  const mcp = requireRecord(agentCapabilities.value.mcp, '$.agentCapabilities.mcp');
  if (!mcp.ok) {
    return mcp;
  }
  const mcpHttp = requireBoolean(mcp.value.http, '$.agentCapabilities.mcp.http');
  if (!mcpHttp.ok) {
    return mcpHttp;
  }
  const mcpSse = requireBoolean(mcp.value.sse, '$.agentCapabilities.mcp.sse');
  if (!mcpSse.ok) {
    return mcpSse;
  }
  const prompt = requireRecord(agentCapabilities.value.prompt, '$.agentCapabilities.prompt');
  if (!prompt.ok) {
    return prompt;
  }
  const image = requireBoolean(prompt.value.image, '$.agentCapabilities.prompt.image');
  if (!image.ok) {
    return image;
  }
  const audio = requireBoolean(prompt.value.audio, '$.agentCapabilities.prompt.audio');
  if (!audio.ok) {
    return audio;
  }
  const embeddedContext = requireBoolean(
    prompt.value.embeddedContext,
    '$.agentCapabilities.prompt.embeddedContext'
  );
  if (!embeddedContext.ok) {
    return embeddedContext;
  }

  const models = isRecord(root.value.models) ? root.value.models : {};
  const modes = isRecord(root.value.modes) ? root.value.modes : {};
  const availableModels = Array.isArray(models.available) ? models.available : [];
  const availableModes = Array.isArray(modes.available) ? modes.available : [];

  return {
    ok: true,
    value: {
      protocolVersion: root.value.protocolVersion,
      agent: {
        name: name.value,
        title: title.value,
        version: version.value
      },
      agentCapabilities: {
        loadSession: loadSession.value,
        listSessions: listSessions.value,
        mcp: {
          http: mcpHttp.value,
          sse: mcpSse.value
        },
        prompt: {
          image: image.value,
          audio: audio.value,
          embeddedContext: embeddedContext.value
        }
      },
      models: {
        available: availableModels.flatMap((model): Array<{ id: string; name: string; cost?: string; enablement?: string }> => {
          if (!isRecord(model) || typeof model.id !== 'string' || typeof model.name !== 'string') {
            return [];
          }

          return [
            {
              id: model.id,
              name: model.name,
              cost: optionalString(model.cost),
              enablement: optionalString(model.enablement)
            }
          ];
        }),
        current: optionalString(models.current)
      },
      modes: {
        available: availableModes.flatMap((mode): Array<{ id: string; name: string; description?: string }> => {
          if (!isRecord(mode) || typeof mode.id !== 'string' || typeof mode.name !== 'string') {
            return [];
          }

          return [
            {
              id: mode.id,
              name: mode.name,
              description: optionalString(mode.description)
            }
          ];
        }),
        current: typeof modes.current === 'string' ? modes.current : ''
      }
    }
  };
};
