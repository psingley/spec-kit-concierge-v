import { describe, expect, it } from 'vitest';
import agentsJson from './agents.json';
import { createAgentManifest } from './manifest';

const validManifest = agentsJson;

describe('createAgentManifest', () => {
  it('returns typed manifest data for valid input', () => {
    expect(createAgentManifest(validManifest)).toEqual({
      ok: true,
      value: validManifest
    });
  });

  it('validates the seeded Copilot entry', () => {
    const result = createAgentManifest(validManifest);

    expect(result.ok && result.value.agents.copilot).toMatchObject({
      displayName: 'GitHub Copilot CLI',
      binary: 'copilot',
      launchArgs: ['--allow-all-tools'],
      acpModeFlag: '--acp',
      verifiedAgainst: {
        version: '1.0.54',
        verifiedAt: '2026-05-27'
      },
      capabilities: ['text', 'tools'],
      modelSelectionStrategy: 'unstable_setSessionModel|restart',
      defaultModel: null
    });
  });

  it('treats verifiedAgainst: null as unverified (warn-and-allow per Q4)', () => {
    const result = createAgentManifest({
      version: 1,
      agents: {
        future: {
          ...validManifest.agents.copilot,
          verifiedAgainst: null
        }
      }
    });

    expect(result.ok).toBe(true);
    // Verifies the explicit null case is accepted; field should be absent in the parsed value
    expect(result.ok && result.value.agents.future?.verifiedAgainst).toBeUndefined();
  });

  it('returns a named error for an empty object', () => {
    expect(createAgentManifest({})).toMatchObject({
      ok: false,
      error: { name: 'InvalidAgentManifest' }
    });
  });

  it('returns a named error for null', () => {
    expect(createAgentManifest(null)).toMatchObject({
      ok: false,
      error: { name: 'InvalidAgentManifest' }
    });
  });

  it('returns a named error for undefined', () => {
    expect(createAgentManifest(undefined)).toMatchObject({
      ok: false,
      error: { name: 'InvalidAgentManifest' }
    });
  });

  it('returns a named error for hostile field types', () => {
    expect(
      createAgentManifest({
        version: 1,
        agents: {
          copilot: {
            ...validManifest.agents.copilot,
            capabilities: ['text', '../../hostile']
          }
        }
      })
    ).toMatchObject({
      ok: false,
      error: { name: 'InvalidAgentManifest', path: '$.agents.copilot.capabilities' }
    });
  });

  it('returns a named error for a partial manifest entry missing binary', () => {
    const partialCopilot = Object.fromEntries(
      Object.entries(validManifest.agents.copilot).filter(([key]) => key !== 'binary')
    );

    expect(
      createAgentManifest({
        version: 1,
        agents: {
          copilot: partialCopilot
        }
      })
    ).toMatchObject({
      ok: false,
      error: { name: 'InvalidAgentManifest', path: '$.agents.copilot.binary' }
    });
  });

  it('supports future entries without verifiedAgainst', () => {
    const unverifiedCopilot = Object.fromEntries(
      Object.entries(validManifest.agents.copilot).filter(([key]) => key !== 'verifiedAgainst')
    );

    expect(
      createAgentManifest({
        version: 1,
        agents: {
          future: unverifiedCopilot
        }
      })
    ).toMatchObject({
      ok: true
    });
  });
});
