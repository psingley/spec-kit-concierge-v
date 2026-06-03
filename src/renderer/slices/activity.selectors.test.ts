import { describe, expect, it } from 'vitest';
import type { RootState } from '../store';
import type { ActivityState } from './activity';
import {
  selectActivityFollowState,
  selectActivityHangSuspected,
  selectActiveAssistantRowId
} from './activity.selectors';

const asRoot = (activity: ActivityState): RootState => ({ activity }) as unknown as RootState;

describe('activity selectors', () => {
  it('selects live stream follow and stall state', () => {
    const state = asRoot({
      entries: [],
      cap: 256,
      currentStatus: 'Running plan',
      busy: true,
      activeAssistantRowId: 'activity-7',
      followState: 'paused',
      hangSuspectedFor: 'plan-1:2026-06-03T00:00:00.000Z',
      nextEntrySequence: 8
    });

    expect(selectActiveAssistantRowId(state)).toBe('activity-7');
    expect(selectActivityFollowState(state)).toBe('paused');
    expect(selectActivityHangSuspected(state)).toBe(true);
  });
});
