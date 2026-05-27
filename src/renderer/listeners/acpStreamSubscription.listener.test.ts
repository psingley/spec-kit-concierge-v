import { describe, expect, it, vi } from 'vitest';
import {
  acpStreamSubscriptionTopic,
  setupAcpStreamSubscriptionListener
} from './acpStreamSubscription.listener';
import type { AppStartListening } from './types';

describe('acp stream subscription listener', () => {
  it('exports the reserved topic descriptor', () => {
    expect(acpStreamSubscriptionTopic).toEqual({
      topic: 'acpStreamSubscription',
      owns: 'single ACP stream subscription path'
    });
  });

  it('accepts startListening without registering Run 4 effects', () => {
    const startListening = vi.fn() as unknown as AppStartListening;

    setupAcpStreamSubscriptionListener(startListening);

    expect(startListening).not.toHaveBeenCalled();
  });
});
