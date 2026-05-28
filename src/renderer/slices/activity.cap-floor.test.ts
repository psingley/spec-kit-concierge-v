import { describe, expect, it } from 'vitest';
import activityReducer, { recordActivity } from './activity';

describe('Run 6 activity cap floor', () => {
  it.each(Array.from({ length: 180 }, (_, index) => 257 + index))(
    'keeps activity history capped at 256 after %i entries',
    (entryCount) => {
      let state = activityReducer(undefined, { type: 'test/init' });
      for (let index = 0; index < entryCount; index += 1) {
        state = activityReducer(
          state,
          recordActivity({
            timestamp: `2026-05-27T00:00:${String(index % 60).padStart(2, '0')}Z`,
            level: 'info',
            message: `entry ${index}`
          })
        );
      }

      expect(state.entries).toHaveLength(256);
      expect(state.cap).toBe(256);
    }
  );
});
