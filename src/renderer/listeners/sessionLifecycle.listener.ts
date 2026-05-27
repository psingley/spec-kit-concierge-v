import type { AppStartListening, ListenerTopicDescriptor } from './types';

export const sessionLifecycleTopic: ListenerTopicDescriptor = {
  topic: 'sessionLifecycle',
  owns: 'session, model, and mode lifecycle coordination'
};

export const setupSessionLifecycleListener = (startListening: AppStartListening): void => {
  void startListening;
};
