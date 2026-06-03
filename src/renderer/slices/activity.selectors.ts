import type { RootState } from '../store';

export const selectActivityState = (state: RootState) => state.activity;
export const selectActivityEntries = (state: RootState) => state.activity.entries;
export const selectActivityCap = (state: RootState) => state.activity.cap;
export const selectLastAcpEventAt = (state: RootState) => state.activity.lastAcpEventAt;
export const selectActivityCurrentStatus = (state: RootState) => state.activity.currentStatus;
export const selectActivityBusy = (state: RootState) => state.activity.busy;
export const selectActivityLogRate = (state: RootState) => Math.min(1, state.activity.entries.length / 16);
export const selectActiveAssistantRowId = (state: RootState) => state.activity.activeAssistantRowId;
export const selectActivityFollowState = (state: RootState) => state.activity.followState;
export const selectActivityHangSuspected = (state: RootState) => state.activity.hangSuspectedFor !== undefined;
