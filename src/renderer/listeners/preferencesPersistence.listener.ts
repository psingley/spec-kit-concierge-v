import type { AppStartListening, ListenerTopicDescriptor } from './types';
import { api } from '../api';
import type { AppDispatch } from '../store';
import type { RendererPreferenceTheme } from '../api/preferences.factory';
import { recordActivity } from '../slices/activity';
import {
  preferencesPersistFailed,
  preferencesPersistStarted,
  preferencesPersistSucceeded,
  preferencesUpdated,
  recentRepositoryRecorded
} from '../slices/preferences';

export const preferencesPersistenceTopic: ListenerTopicDescriptor = {
  topic: 'preferencesPersistence',
  owns: 'preferences persistence coordination'
};

export const setupPreferencesPersistenceListener = (startListening: AppStartListening): void => {
  startListening({
    matcher: (action): action is ReturnType<typeof preferencesUpdated> | ReturnType<typeof recentRepositoryRecorded> =>
      preferencesUpdated.match(action) || recentRepositoryRecorded.match(action),
    effect: async (_action, listenerApi) => {
      listenerApi.cancelActiveListeners();
      await listenerApi.delay(250);
      const state = listenerApi.getState() as {
        preferences: {
          theme: RendererPreferenceTheme;
          accent: string;
          density: 'compact' | 'comfortable';
          activitySide: 'left' | 'right' | 'hidden';
          requireScrollToUnlock: boolean;
          recentRepositories: string[];
          selectedCopilotModel: string | null;
        };
      };
      listenerApi.dispatch(preferencesPersistStarted());
      const dispatch = listenerApi.dispatch as AppDispatch;
      const result = await dispatch(
        api.endpoints.writePreferences.initiate({
          theme: state.preferences.theme,
          accent: state.preferences.accent,
          density: state.preferences.density,
          activitySide: state.preferences.activitySide,
          requireScrollToUnlock: state.preferences.requireScrollToUnlock,
          recentRepositories: state.preferences.recentRepositories,
          selectedCopilotModel: state.preferences.selectedCopilotModel
        })
      );
      if ('error' in result) {
        const message = 'Preference persistence failed';
        listenerApi.dispatch(preferencesPersistFailed(message));
        listenerApi.dispatch(recordActivity({ timestamp: new Date().toISOString(), level: 'error', message }));
        return;
      }
      listenerApi.dispatch(preferencesPersistSucceeded());
    }
  });
};
