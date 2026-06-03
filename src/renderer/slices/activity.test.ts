import { describe, expect, it } from 'vitest';
import { createProductStore } from '../store';
import {
  selectActivityCap,
  selectActivityEntries,
  selectActivityFollowState,
  selectActivityHangSuspected,
  selectActivityState,
  selectActiveAssistantRowId
} from './activity.selectors';
import activityReducer, {
  activityFollowStateChanged,
  assistantTextReceived,
  hangSuspectedRecorded,
  recordActivity
} from './activity';

describe('activity slice', () => {
  it('initializes to the Run 4 locked state', () => {
    expect(activityReducer(undefined, { type: 'test/init' })).toEqual({
      entries: [],
      cap: 256,
      currentStatus: 'Idle',
      busy: false,
      followState: 'following',
      nextEntrySequence: 0
    });
  });

  it('exposes base selectors through RootState', () => {
    const state = createProductStore().getState();

    expect(selectActivityState(state)).toBe(state.activity);
    expect(selectActivityEntries(state)).toBe(state.activity.entries);
    expect(selectActivityCap(state)).toBe(256);
    expect(selectActivityFollowState(state)).toBe('following');
    expect(selectActivityHangSuspected(state)).toBe(false);
    expect(selectActiveAssistantRowId(state)).toBeUndefined();
  });

  it('accumulates assistant text into the active row', () => {
    let state = activityReducer(undefined, assistantTextReceived({
      timestamp: '2026-06-03T00:00:00.000Z',
      step: 'plan',
      sessionId: 'plan-1',
      messageId: 'message-1',
      text: 'Hello '
    }));

    state = activityReducer(state, assistantTextReceived({
      timestamp: '2026-06-03T00:00:01.000Z',
      step: 'plan',
      sessionId: 'plan-1',
      messageId: 'message-1',
      text: 'world'
    }));

    expect(state.entries).toHaveLength(1);
    expect(state.entries[0]).toMatchObject({
      level: 'progress',
      message: 'Hello world',
      event: 'assistant-text',
      step: 'plan',
      sessionId: 'plan-1',
      messageId: 'message-1'
    });
    expect(state.activeAssistantRowId).toBe(state.entries[0].id);
    expect(state.currentStatus).toBe('Hello world');
    expect(state.busy).toBe(true);
  });

  it('finalizes the active assistant row before recording a non-assistant entry', () => {
    let state = activityReducer(undefined, assistantTextReceived({
      timestamp: '2026-06-03T00:00:00.000Z',
      step: 'tasks',
      sessionId: 'tasks-1',
      messageId: 'message-1',
      text: 'Drafting tasks'
    }));

    state = activityReducer(state, recordActivity({
      timestamp: '2026-06-03T00:00:02.000Z',
      level: 'info',
      message: 'Running tool read',
      event: 'tool-call',
      step: 'tasks',
      sessionId: 'tasks-1'
    }));

    expect(state.entries.map((entry) => entry.message)).toEqual(['Drafting tasks', 'Running tool read']);
    expect(state.activeAssistantRowId).toBeUndefined();
  });

  it('keeps generated ids stable and unique after cap eviction', () => {
    let state = activityReducer(undefined, { type: 'test/init' });
    for (let index = 0; index < 300; index += 1) {
      state = activityReducer(state, recordActivity({
        timestamp: '2026-06-03T00:00:00.000Z',
        level: 'info',
        message: `entry ${index}`
      }));
    }

    const ids = state.entries.map((entry) => entry.id);
    expect(state.entries).toHaveLength(256);
    expect(new Set(ids)).toHaveLength(256);
  });

  it('does not collide with explicit caller-provided ids', () => {
    let state = activityReducer(undefined, recordActivity({
      id: 'activity-0',
      timestamp: '2026-06-03T00:00:00.000Z',
      level: 'info',
      message: 'explicit id'
    }));
    state = activityReducer(state, recordActivity({
      timestamp: '2026-06-03T00:00:01.000Z',
      level: 'info',
      message: 'generated id'
    }));

    expect(state.entries.map((entry) => entry.id)).toEqual(['activity-0', 'activity-1']);
  });

  it('starts a new assistant row for a different message id', () => {
    let state = activityReducer(undefined, assistantTextReceived({
      timestamp: '2026-06-03T00:00:00.000Z',
      step: 'plan',
      sessionId: 'plan-1',
      messageId: 'message-1',
      text: 'first'
    }));
    state = activityReducer(state, assistantTextReceived({
      timestamp: '2026-06-03T00:00:01.000Z',
      step: 'plan',
      sessionId: 'plan-1',
      messageId: 'message-2',
      text: 'second'
    }));

    expect(state.entries.map((entry) => entry.message)).toEqual(['first', 'second']);
    expect(state.activeAssistantRowId).toBe(state.entries[1].id);
  });

  it('keeps tool rows separate even when later assistant text has the same message id', () => {
    let state = activityReducer(undefined, assistantTextReceived({
      timestamp: '2026-06-03T00:00:00.000Z',
      step: 'tasks',
      sessionId: 'tasks-1',
      messageId: 'message-1',
      text: 'before tool'
    }));
    state = activityReducer(state, recordActivity({
      timestamp: '2026-06-03T00:00:01.000Z',
      level: 'info',
      message: 'Running tool read',
      kind: 'tool-call',
      event: 'tool-call',
      step: 'tasks',
      sessionId: 'tasks-1'
    }));
    state = activityReducer(state, assistantTextReceived({
      timestamp: '2026-06-03T00:00:02.000Z',
      step: 'tasks',
      sessionId: 'tasks-1',
      messageId: 'message-1',
      text: 'after tool'
    }));

    expect(state.entries.map((entry) => entry.message)).toEqual(['before tool', 'Running tool read', 'after tool']);
  });

  it('tracks follow state and hang visibility without adding entries', () => {
    let state = activityReducer(undefined, activityFollowStateChanged({ followState: 'paused' }));
    state = activityReducer(state, hangSuspectedRecorded({ marker: 'plan-1:2026-06-03T00:00:00.000Z' }));

    expect(state.followState).toBe('paused');
    expect(state.hangSuspectedFor).toBe('plan-1:2026-06-03T00:00:00.000Z');
    expect(state.entries).toEqual([]);
  });
});
