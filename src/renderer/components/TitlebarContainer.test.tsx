import { describe, expect, it } from 'vitest';
import { DEFAULT_COPILOT_MODEL_ID } from '../slices/preferences';
import { deriveEffectiveCopilotModel } from './TitlebarContainer';
import type { CopilotModelOption } from './Titlebar';

const models: CopilotModelOption[] = [
  { id: 'gpt-5.5', name: 'GPT-5.5' },
  { id: DEFAULT_COPILOT_MODEL_ID, name: 'GPT-5.4 mini' },
  { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5' }
];

describe('TitlebarContainer model default derivation', () => {
  it('uses GPT-5.4 mini when there is no saved model preference and the model is available', () => {
    expect(deriveEffectiveCopilotModel(null, 'gpt-5.5', models)).toBe(DEFAULT_COPILOT_MODEL_ID);
  });

  it('lets a saved model preference override the renderer default', () => {
    expect(deriveEffectiveCopilotModel('claude-sonnet-4-5', 'gpt-5.5', models)).toBe('claude-sonnet-4-5');
  });

  it('falls back to the current model and then the first available model when GPT-5.4 mini is unavailable', () => {
    const unavailableModels: CopilotModelOption[] = [
      { id: 'gpt-5.5', name: 'GPT-5.5' },
      { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5' }
    ];

    expect(deriveEffectiveCopilotModel(null, 'claude-sonnet-4-5', unavailableModels)).toBe('claude-sonnet-4-5');
    expect(deriveEffectiveCopilotModel(null, null, unavailableModels)).toBe('gpt-5.5');
  });
});
