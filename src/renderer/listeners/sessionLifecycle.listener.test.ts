import { describe, expect, it, vi } from 'vitest';
import { projectReconciledManifestState, sessionLifecycleTopic, setupSessionLifecycleListener } from './sessionLifecycle.listener';
import type { AppStartListening } from './types';

describe('session lifecycle listener', () => {
  it('exports the reserved topic descriptor', () => {
    expect(sessionLifecycleTopic.topic).toBe('sessionLifecycle');
  });

  it('accepts startListening without registering Run 4 effects', () => {
    const startListening = vi.fn() as unknown as AppStartListening;

    setupSessionLifecycleListener(startListening);

    expect(startListening).not.toHaveBeenCalled();
  });

  it('projects reconciled manifest status and audit summaries without making renderer state authoritative', () => {
    expect(projectReconciledManifestState({
      step: 'tasks',
      status: 'needs-attention',
      canNudge: true,
      audit: [{ event: 'nudge-action', message: 'nudged tasks' }]
    })).toEqual({
      step: 'tasks',
      rendererStatus: 'needs-attention',
      canNudge: true,
      auditSummary: [{ event: 'nudge-action', message: 'nudged tasks' }],
      authoritative: false
    });
  });
});
