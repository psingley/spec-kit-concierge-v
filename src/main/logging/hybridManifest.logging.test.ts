import { describe, expect, it, vi } from 'vitest';
import { HYBRID_MANIFEST_LOG_EVENTS, logHybridManifestEvent } from './hybridManifest.logging';

describe('hybrid manifest structured logging', () => {
  it('exports only the milestone-1 manifest store event names', () => {
    expect(HYBRID_MANIFEST_LOG_EVENTS).toEqual([
      'session-manifest-read',
      'session-manifest-write',
      'manifest-anomaly-recorded',
      'manifest-intervention-recorded'
    ]);
  });

  it('logs a normalized hybrid-manifest event payload', () => {
    const logger = { info: vi.fn() };

    logHybridManifestEvent(logger, 'session-manifest-write', {
      manifestPath: '/repo/.concierge/session-manifest.json',
      sessionId: '11111111-1111-4111-8111-111111111111',
      currentStep: 'specify'
    });

    expect(logger.info).toHaveBeenCalledWith(
      {
        event: 'session-manifest-write',
        feature: 'hybrid-manifest',
        manifestPath: '/repo/.concierge/session-manifest.json',
        sessionId: '11111111-1111-4111-8111-111111111111',
        currentStep: 'specify'
      },
      'hybrid manifest event'
    );
  });
});
