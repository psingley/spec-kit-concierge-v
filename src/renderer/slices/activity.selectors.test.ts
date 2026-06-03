import { describe, expect, it } from 'vitest';
import type { RootState } from '../store';
import type { ActivityState } from './activity';
import {
  selectActivityCap,
  selectActivityEntries,
  selectActivityFollowState,
  selectActivityHangSuspected,
  selectActivityLogRate,
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

  it('keeps selector output stable for capped long-run state', () => {
    const entries = Array.from({ length: 256 }, (_, index) => ({
      id: `activity-${index}`,
      timestamp: '2026-06-03T00:00:00.000Z',
      level: 'info',
      message: `entry ${index}`
    }));
    const state = asRoot({
      entries,
      cap: 256,
      currentStatus: 'entry 255',
      busy: false,
      followState: 'following',
      nextEntrySequence: 256
    });

    expect(selectActivityEntries(state)).toBe(entries);
    expect(selectActivityCap(state)).toBe(256);
    expect(selectActivityLogRate(state)).toBe(1);
    expect(selectActivityHangSuspected(state)).toBe(false);
  });
});
