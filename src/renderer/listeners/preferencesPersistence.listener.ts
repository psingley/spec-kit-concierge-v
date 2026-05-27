import type { AppStartListening, ListenerTopicDescriptor } from './types';

export const preferencesPersistenceTopic: ListenerTopicDescriptor = {
  topic: 'preferencesPersistence',
  owns: 'preferences persistence coordination'
};

export const setupPreferencesPersistenceListener = (startListening: AppStartListening): void => {
  void startListening;
};
