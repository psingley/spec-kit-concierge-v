import { describe, expect, it } from 'vitest';
import {
  AGENT_MODE_URI,
  AUTOPILOT_MODE_URI,
  PLAN_MODE_URI,
  type BoundCLICapabilities
} from './types';
import { createBoundCLICapabilities } from './capabilities';

export const verifiedCopilotInitialize = {
  protocolVersion: 1,
  agentCapabilities: {
    loadSession: true,
    mcpCapabilities: {
      http: true,
      sse: true
    },
    promptCapabilities: {
      image: true,
      audio: false,
      embeddedContext: true
    },
    sessionCapabilities: {
      list: {}
    }
  },
  agentInfo: {
    name: 'Copilot',
    title: 'Copilot',
    version: '1.0.54'
  },
  authMethods: [
    {
      id: 'copilot-login',
      name: 'Log in with Copilot CLI',
      description: 'Run `copilot login` in the terminal'
    }
  ],
  models: {
    availableModels: [
      {
        modelId: 'gpt-5.5',
        name: 'GPT-5.5',
        description: 'GPT-5.5',
        _meta: {
          copilotUsage: '7.5x',
          copilotEnablement: 'enabled'
        }
      }
    ],
    currentModelId: 'gpt-5.5'
  },
  modes: {
    availableModes: [
      { id: AGENT_MODE_URI, name: 'Agent', description: 'Default agent mode' },
      { id: PLAN_MODE_URI, name: 'Plan', description: 'Plan mode' },
      { id: AUTOPILOT_MODE_URI, name: 'Autopilot', description: 'Autonomous mode' }
    ],
    currentModeId: AGENT_MODE_URI
  },
  configOptions: [
    {
      type: 'select',
      id: 'model',
      name: 'Model',
      currentValue: 'gpt-5.5',
      category: 'model',
      options: [{ value: 'gpt-5.5', name: 'GPT-5.5' }]
    }
  ]
};

const expectInvalid = (value: unknown): void => {
  expect(createBoundCLICapabilities(value)).toMatchObject({
    ok: false,
    error: { name: 'InvalidBoundCLICapabilities' }
  });
};

describe('createBoundCLICapabilities', () => {
  it('maps the full Copilot CLI 1.0.54 initialize descriptor into Concierge-owned capabilities', () => {
    const result = createBoundCLICapabilities(verifiedCopilotInitialize);

    expect(result.ok).toBe(true);
    expect((result as { ok: true; value: BoundCLICapabilities }).value).toEqual({
      protocolVersion: 1,
      agent: {
        name: 'Copilot',
        title: 'Copilot',
        version: '1.0.54'
      },
      agentCapabilities: {
        loadSession: true,
        listSessions: true,
        mcp: {
          http: true,
          sse: true
        },
        prompt: {
          image: true,
          audio: false,
          embeddedContext: true
        }
      },
      authMethods: [
        {
          id: 'copilot-login',
          name: 'Log in with Copilot CLI',
          description: 'Run `copilot login` in the terminal'
        }
      ],
      models: {
        available: [
          {
            id: 'gpt-5.5',
            name: 'GPT-5.5',
            description: 'GPT-5.5',
            cost: '7.5x',
            enablement: 'enabled'
          }
        ],
        current: 'gpt-5.5'
      },
      modes: {
        available: [
          { id: AGENT_MODE_URI, name: 'Agent', description: 'Default agent mode' },
          { id: PLAN_MODE_URI, name: 'Plan', description: 'Plan mode' },
          { id: AUTOPILOT_MODE_URI, name: 'Autopilot', description: 'Autonomous mode' }
        ],
        current: AGENT_MODE_URI
      },
      configOptions: [
        {
          id: 'model',
          type: 'select',
          name: 'Model',
          currentValue: 'gpt-5.5',
          category: 'model',
          options: [{ value: 'gpt-5.5', name: 'GPT-5.5', description: undefined }]
        }
      ]
    });
  });

  it('returns a named error for an empty object', () => {
    expectInvalid({});
  });

  it('returns a named error for null', () => {
    expectInvalid(null);
  });

  it('returns a named error for undefined', () => {
    expectInvalid(undefined);
  });

  it('returns a named error for hostile nested field types', () => {
    expectInvalid({
      ...verifiedCopilotInitialize,
      agentCapabilities: {
        ...verifiedCopilotInitialize.agentCapabilities,
        loadSession: 'yes'
      }
    });

    expectInvalid({
      ...verifiedCopilotInitialize,
      agentCapabilities: {
        ...verifiedCopilotInitialize.agentCapabilities,
        promptCapabilities: {
          ...verifiedCopilotInitialize.agentCapabilities.promptCapabilities,
          image: 'yes'
        }
      }
    });
  });

  it('returns a named error for partial structurally plausible input missing loadSession', () => {
    const partialAgentCapabilities = Object.fromEntries(
      Object.entries(verifiedCopilotInitialize.agentCapabilities).filter(([key]) => key !== 'loadSession')
    );

    expectInvalid({
      ...verifiedCopilotInitialize,
      agentCapabilities: partialAgentCapabilities
    });
  });

  it('defaults absent session mode metadata to Agent without defaulting required initialize fields', () => {
    const withoutModes = Object.fromEntries(
      Object.entries(verifiedCopilotInitialize).filter(([key]) => key !== 'modes')
    );

    expect(createBoundCLICapabilities(withoutModes)).toMatchObject({
      ok: true,
      value: {
        modes: { current: AGENT_MODE_URI }
      }
    });
  });

  it('keeps malformed optional model metadata out of the typed model list', () => {
    expect(
      createBoundCLICapabilities({
        ...verifiedCopilotInitialize,
        models: {
          availableModels: [{ modelId: 123, name: 'bad' }],
          currentModelId: 'gpt-5.5'
        }
      })
    ).toMatchObject({
      ok: true,
      value: {
        models: { available: [], current: 'gpt-5.5' }
      }
    });
  });
});
