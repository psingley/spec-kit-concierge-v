import type { AppStartListening, ListenerTopicDescriptor } from './types';
import { api } from '../api';
import type { AppDispatch } from '../store';
import { recordActivity } from '../slices/activity';
import {
  clarifyQuestionMalformed,
  dirtyResumeDetected,
  hookFailed,
  stepPending,
  stepReset,
  stepsRestorationRequested,
  stepsRestored
} from '../slices/steps';

export const stepLifecycleTopic: ListenerTopicDescriptor = {
  topic: 'stepLifecycle',
  owns: 'step lifecycle coordination'
};

const clarifyAttempts = new Map<string, number>();

export const setupStepLifecycleListener = (startListening: AppStartListening): void => {
  startListening({
    actionCreator: stepsRestorationRequested,
    effect: async (action, listenerApi) => {
      const dispatch = listenerApi.dispatch as unknown as AppDispatch;
      const result = await dispatch(
        api.endpoints.getStepState.initiate({ commits: action.payload.commits }, { forceRefetch: true })
      ).unwrap();
      listenerApi.dispatch(stepsRestored({ records: result.steps }));
    }
  });

  startListening({
    actionCreator: dirtyResumeDetected,
    effect: async (action, listenerApi) => {
      const dispatch = listenerApi.dispatch as unknown as AppDispatch;
      const result = await dispatch(
        api.endpoints.getGitState.initiate(
          { repositoryPath: action.payload.repositoryPath, paths: action.payload.expectedArtifacts },
          { forceRefetch: true }
        )
      ).unwrap();
      if (result.uncommittedPaths.length === 0) {
        return;
      }
      listenerApi.dispatch(stepPending({ step: action.payload.step, sessionId: action.payload.sessionId }));
      listenerApi.dispatch(
        recordActivity({
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Workspace dirty resume',
          event: 'workspace-dirty-resume',
          step: action.payload.step,
          sessionId: action.payload.sessionId,
          raw: { changedPaths: result.uncommittedPaths }
        })
      );
    }
  });

  startListening({
    actionCreator: hookFailed,
    effect: async (action, listenerApi) => {
      await listenerApi.delay(5000);
      listenerApi.dispatch(stepReset({ step: action.payload.step, reason: action.payload.reason }));
      listenerApi.dispatch(
        recordActivity({
          timestamp: new Date().toISOString(),
          level: 'error',
          message: 'Step Escape Hatch triggered',
          event: 'step-escape-hatch-triggered',
          step: action.payload.step,
          sessionId: action.payload.sessionId,
          reason: action.payload.reason
        })
      );
    }
  });

  startListening({
    actionCreator: clarifyQuestionMalformed,
    effect: async (action, listenerApi) => {
      const key = `${action.payload.sessionId}:${action.payload.questionId}`;
      const nextAttempt = (clarifyAttempts.get(key) ?? 0) + 1;
      clarifyAttempts.set(key, nextAttempt);

      if (nextAttempt >= 3) {
        listenerApi.dispatch(stepReset({ step: 'clarify', reason: 'clarify-rigor-exhausted' }));
        listenerApi.dispatch(
          recordActivity({
            timestamp: action.payload.timestamp,
            level: 'error',
            message: 'Clarify rigor exhausted',
            event: 'step-escape-hatch-triggered',
            step: 'clarify',
            sessionId: action.payload.sessionId,
            reason: 'clarify-rigor-exhausted',
            raw: action.payload
          })
        );
        return;
      }

      listenerApi.dispatch(
        recordActivity({
          timestamp: action.payload.timestamp,
          level: 'warn',
          message: 'Clarify question malformed; requesting rewrite',
          event: 'step-prompt-issued',
          step: 'clarify',
          sessionId: action.payload.sessionId,
          reason: action.payload.malformationCategory,
          raw: action.payload
        })
      );
    }
  });
};
