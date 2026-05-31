import { describe, expect, it, vi } from 'vitest';
import { recordActivity } from '../slices/activity';
import { activityVisibilitySet } from '../slices/ui';
import { activityLoggerTopic, setupActivityLoggerListener } from './activityLogger.listener';
import type { AppStartListening } from './types';

describe('activity logger listener', () => {
  it('exports the activity logger topic descriptor', () => {
    expect(activityLoggerTopic).toEqual({
      topic: 'activityLogger',
      owns: 'activity rail visibility and event fan-in'
    });
  });

  it('registers first-error auto-open handling', () => {
    const startListening = vi.fn() as unknown as AppStartListening;

    setupActivityLoggerListener(startListening);

    expect(startListening).toHaveBeenCalledWith(
      expect.objectContaining({ actionCreator: recordActivity, effect: expect.any(Function) })
    );
  });

  it('opens the activity rail only for the first error entry in the app session', async () => {
    const startListening = vi.fn();
    setupActivityLoggerListener(startListening as unknown as AppStartListening);
    const registration = startListening.mock.calls[0]?.[0];
    expect(registration).toBeDefined();
    const effect = registration!.effect as (
      action: ReturnType<typeof recordActivity>,
      listenerApi: { dispatch: ReturnType<typeof vi.fn> }
    ) => Promise<void> | void;
    const dispatch = vi.fn();

    await effect(
      recordActivity({ timestamp: '2026-05-31T14:40:00.000Z', level: 'info', message: 'Repo selected: concierge-api' }),
      { dispatch }
    );
    await effect(
      recordActivity({ timestamp: '2026-05-31T14:41:00.000Z', level: 'error', message: 'GitHub auth failed' }),
      { dispatch }
    );
    await effect(
      recordActivity({ timestamp: '2026-05-31T14:42:00.000Z', level: 'error', message: 'Copilot auth failed' }),
      { dispatch }
    );

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(activityVisibilitySet(true));
  });
});
