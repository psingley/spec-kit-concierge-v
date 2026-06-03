import type { AppStartListening, ListenerTopicDescriptor } from './types';
import {
  acpStreamEventReceived,
  assistantTextReceived,
  hangSuspectedRecorded,
  markAcpEventSeen,
  recordActivity,
  type ActivityState
} from '../slices/activity';

export const transcriptCaptureTopic: ListenerTopicDescriptor = {
  topic: 'transcriptCapture',
  owns: 'ACP transcript capture coordination'
};

export const HANG_CHECK_INTERVAL_MS = 30000;
export const HANG_SUSPECTED_THRESHOLD_MS = 2400000;

type TimerListenerApi = {
  getState: () => { activity: ActivityState };
  dispatch: (action: ReturnType<typeof recordActivity> | ReturnType<typeof hangSuspectedRecorded>) => unknown;
};

export const setupTranscriptCaptureListener = (startListening: AppStartListening): void => {
  let latestListenerApi: TimerListenerApi | undefined;

  startListening({
    actionCreator: acpStreamEventReceived,
    effect: (action, listenerApi) => {
      latestListenerApi = listenerApi as unknown as TimerListenerApi;
      const kind = action.payload.kind ?? 'generic';
      if (kind === 'assistant-text') {
        listenerApi.dispatch(
          assistantTextReceived({
            timestamp: action.payload.timestamp,
            step: action.payload.step,
            sessionId: action.payload.sessionId,
            text: action.payload.message,
            messageId: action.payload.messageId,
            raw: action.payload.raw
          })
        );
      } else {
        listenerApi.dispatch(
          recordActivity({
            timestamp: action.payload.timestamp,
            level: 'info',
            message: action.payload.message,
            kind,
            event: kind === 'generic' ? 'step-prompt-complete' : kind,
            step: action.payload.step,
            sessionId: action.payload.sessionId,
            raw: action.payload.raw
          })
        );
      }
      listenerApi.dispatch(
        markAcpEventSeen({
          timestamp: action.payload.timestamp,
          sessionId: action.payload.sessionId,
          step: action.payload.step
        })
      );
    }
  });

  setInterval(() => {
    if (latestListenerApi === undefined) {
      return;
    }
    const state = latestListenerApi.getState();
    const lastAcpEventAt = state.activity.lastAcpEventAt;
    if (lastAcpEventAt === undefined) {
      return;
    }
    const marker = `${state.activity.lastAcpSessionId ?? ''}:${lastAcpEventAt}`;
    if (
      Date.now() - Date.parse(lastAcpEventAt) < HANG_SUSPECTED_THRESHOLD_MS ||
      state.activity.hangSuspectedFor === marker
    ) {
      return;
    }
    latestListenerApi.dispatch(hangSuspectedRecorded({ marker }));
    latestListenerApi.dispatch(
      recordActivity({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: 'No recent output - the step may be stuck',
        event: 'hang-suspected',
        step: state.activity.lastAcpStep ?? 'specify',
        sessionId: state.activity.lastAcpSessionId ?? 'unknown',
        reason: 'acp-stream-silence'
      })
    );
  }, HANG_CHECK_INTERVAL_MS);
};
