import { createAction, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { StepName } from './steps';

export type ActivityEntryKind = 'assistant-text' | 'tool-call' | 'status-update' | 'generic';
export type ActivityFollowState = 'following' | 'paused';

export type ActivityEntry = {
  id: string;
  timestamp: string;
  level: string;
  message: string;
  kind?: ActivityEntryKind;
  messageId?: string;
  event?: string;
  step?: StepName;
  sessionId?: string;
  reason?: string;
  trailer?: string;
  latencyMs?: number;
  raw?: unknown;
};

export type ActivityState = {
  entries: ActivityEntry[];
  cap: 256;
  currentStatus: string;
  busy: boolean;
  lastAcpEventAt?: string;
  lastAcpSessionId?: string;
  lastAcpStep?: StepName;
  hangSuspectedFor?: string;
  activeAssistantRowId?: string;
  followState: ActivityFollowState;
  nextEntrySequence: number;
};

export const activityInitialState: ActivityState = {
  entries: [],
  cap: 256,
  currentStatus: 'Idle',
  busy: false,
  followState: 'following',
  nextEntrySequence: 0
};

export type RecordActivityPayload = Omit<ActivityEntry, 'id'> & { id?: string };
export type AssistantTextReceivedPayload = {
  timestamp: string;
  step: StepName;
  sessionId: string;
  text: string;
  messageId?: string;
  raw?: unknown;
};

export const acpStreamEventReceived = createAction<{
  timestamp: string;
  sessionId: string;
  step: StepName;
  message: string;
  raw?: unknown;
}>('activity/acpStreamEventReceived');

const nextEntryId = (state: ActivityState): string => {
  const id = `activity-${state.nextEntrySequence}`;
  state.nextEntrySequence += 1;
  return id;
};

const enforceCap = (state: ActivityState): void => {
  if (state.entries.length <= state.cap) {
    return;
  }
  state.entries.splice(0, state.entries.length - state.cap);
  if (
    state.activeAssistantRowId !== undefined &&
    !state.entries.some((entry) => entry.id === state.activeAssistantRowId)
  ) {
    state.activeAssistantRowId = undefined;
  }
};

const appendEntry = (state: ActivityState, payload: RecordActivityPayload): void => {
  const id = payload.id ?? nextEntryId(state);
  state.entries.push({ id, ...payload });
  enforceCap(state);
};

const activitySlice = createSlice({
  name: 'activity',
  initialState: activityInitialState,
  reducers: {
    recordActivity: (state, action: PayloadAction<RecordActivityPayload>) => {
      state.activeAssistantRowId = undefined;
      appendEntry(state, action.payload);
      state.currentStatus = action.payload.message;
      state.busy = action.payload.level === 'progress' || action.payload.event === 'step-prompt-issued';
    },
    assistantTextReceived: (state, action: PayloadAction<AssistantTextReceivedPayload>) => {
      const activeEntry = state.activeAssistantRowId === undefined
        ? undefined
        : state.entries.find((entry) => entry.id === state.activeAssistantRowId);
      const canAppend =
        activeEntry !== undefined &&
        activeEntry.event === 'assistant-text' &&
        activeEntry.step === action.payload.step &&
        activeEntry.sessionId === action.payload.sessionId &&
        activeEntry.messageId === action.payload.messageId;

      if (canAppend) {
        activeEntry.message += action.payload.text;
        activeEntry.timestamp = action.payload.timestamp;
        activeEntry.raw = action.payload.raw;
      } else {
        appendEntry(state, {
          timestamp: action.payload.timestamp,
          level: 'progress',
          message: action.payload.text,
          kind: 'assistant-text',
          messageId: action.payload.messageId,
          event: 'assistant-text',
          step: action.payload.step,
          sessionId: action.payload.sessionId,
          raw: action.payload.raw
        });
        state.activeAssistantRowId = state.entries[state.entries.length - 1]?.id;
      }
      state.currentStatus = canAppend ? activeEntry.message : action.payload.text;
      state.busy = true;
    },
    assistantRowFinalized: (state) => {
      state.activeAssistantRowId = undefined;
    },
    activityFollowStateChanged: (state, action: PayloadAction<{ followState: ActivityFollowState }>) => {
      state.followState = action.payload.followState;
    },
    activityBusyChanged: (state, action: PayloadAction<{ busy: boolean; status?: string }>) => {
      state.busy = action.payload.busy;
      if (action.payload.status !== undefined) {
        state.currentStatus = action.payload.status;
      }
    },
    activityCleared: (state) => {
      state.entries = [];
      state.activeAssistantRowId = undefined;
    },
    markAcpEventSeen: (
      state,
      action: PayloadAction<{ timestamp: string; sessionId: string; step: StepName }>
    ) => {
      state.lastAcpEventAt = action.payload.timestamp;
      state.lastAcpSessionId = action.payload.sessionId;
      state.lastAcpStep = action.payload.step;
      state.hangSuspectedFor = undefined;
    },
    hangSuspectedRecorded: (state, action: PayloadAction<{ marker: string }>) => {
      state.hangSuspectedFor = action.payload.marker;
    }
  },
  extraReducers: () => {}
});

export const {
  recordActivity,
  assistantTextReceived,
  assistantRowFinalized,
  activityFollowStateChanged,
  activityBusyChanged,
  activityCleared,
  markAcpEventSeen,
  hangSuspectedRecorded
} = activitySlice.actions;
export const activityReducer = activitySlice.reducer;
export default activityReducer;
