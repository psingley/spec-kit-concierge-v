import { createAction, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { StepName } from './steps';

export type ActivityEntry = {
  id: string;
  timestamp: string;
  level: string;
  message: string;
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
  lastAcpEventAt?: string;
  lastAcpSessionId?: string;
  lastAcpStep?: StepName;
  hangSuspectedFor?: string;
};

export const activityInitialState: ActivityState = {
  entries: [],
  cap: 256
};

export type RecordActivityPayload = Omit<ActivityEntry, 'id'> & { id?: string };

export const acpStreamEventReceived = createAction<{
  timestamp: string;
  sessionId: string;
  step: StepName;
  message: string;
  raw?: unknown;
}>('activity/acpStreamEventReceived');

const appendEntry = (state: ActivityState, payload: RecordActivityPayload): void => {
  const id = payload.id ?? `${payload.timestamp}-${state.entries.length}`;
  state.entries.push({ id, ...payload });
  if (state.entries.length > state.cap) {
    state.entries.splice(0, state.entries.length - state.cap);
  }
};

const activitySlice = createSlice({
  name: 'activity',
  initialState: activityInitialState,
  reducers: {
    recordActivity: (state, action: PayloadAction<RecordActivityPayload>) => {
      appendEntry(state, action.payload);
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

export const { recordActivity, markAcpEventSeen, hangSuspectedRecorded } = activitySlice.actions;
export const activityReducer = activitySlice.reducer;
export default activityReducer;
