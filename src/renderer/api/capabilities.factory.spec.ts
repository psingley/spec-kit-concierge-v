import { describe, expect, it } from 'vitest';
import { parseRendererBoundCLICapabilities } from './capabilities.factory';

export const rendererVerifiedCapabilities = {
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
  models: {
    available: [{ id: 'gpt-5.5', name: 'GPT-5.5', cost: '7.5x', enablement: 'enabled' }],
    current: 'gpt-5.5'
  },
  modes: {
    available: [
      {
        id: 'https://agentclientprotocol.com/protocol/session-modes#agent',
        name: 'Agent'
      }
    ],
    current: 'https://agentclientprotocol.com/protocol/session-modes#agent'
  }
};

const expectInvalid = (value: unknown): void => {
  expect(parseRendererBoundCLICapabilities(value)).toMatchObject({
    ok: false,
    error: { name: 'InvalidBoundCLICapabilities' }
  });
};

describe('parseRendererBoundCLICapabilities', () => {
  it('accepts the Copilot 1.0.54 capability proof shape from preload', () => {
    expect(parseRendererBoundCLICapabilities(rendererVerifiedCapabilities)).toEqual({
      ok: true,
      value: rendererVerifiedCapabilities
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

  it('returns a named error for hostile nested field types from preload', () => {
    expectInvalid({
      ...rendererVerifiedCapabilities,
      agentCapabilities: {
        ...rendererVerifiedCapabilities.agentCapabilities,
        prompt: {
          ...rendererVerifiedCapabilities.agentCapabilities.prompt,
          image: 'yes'
        }
      }
    });
  });

  it('returns a named error for partial structurally plausible input missing loadSession', () => {
    const agentCapabilities = Object.fromEntries(
      Object.entries(rendererVerifiedCapabilities.agentCapabilities).filter(([key]) => key !== 'loadSession')
    );

    expectInvalid({
      ...rendererVerifiedCapabilities,
      agentCapabilities
    });
  });

  it('filters malformed optional model and mode entries without weakening required validation', () => {
    expect(
      parseRendererBoundCLICapabilities({
        ...rendererVerifiedCapabilities,
        models: { available: [{ id: 1, name: 'bad' }], current: 'gpt-5.5' },
        modes: { available: [{ id: 1, name: 'bad' }], current: rendererVerifiedCapabilities.modes.current }
      })
    ).toMatchObject({
      ok: true,
      value: {
        models: { available: [], current: 'gpt-5.5' },
        modes: { available: [], current: rendererVerifiedCapabilities.modes.current }
      }
    });
  });
});
