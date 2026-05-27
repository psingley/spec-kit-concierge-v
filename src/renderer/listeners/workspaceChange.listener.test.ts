import { describe, expect, it, vi } from 'vitest';
import { setupWorkspaceChangeListener, workspaceChangeTopic } from './workspaceChange.listener';
import type { AppStartListening } from './types';

describe('workspace change listener', () => {
  it('exports the reserved topic descriptor', () => {
    expect(workspaceChangeTopic.topic).toBe('workspaceChange');
  });

  it('accepts startListening without registering Run 4 effects', () => {
    const startListening = vi.fn() as unknown as AppStartListening;

    setupWorkspaceChangeListener(startListening);

    expect(startListening).not.toHaveBeenCalled();
  });
});
