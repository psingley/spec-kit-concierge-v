import type { AppStartListening, ListenerTopicDescriptor } from './types';

export const stepLifecycleTopic: ListenerTopicDescriptor = {
  topic: 'stepLifecycle',
  owns: 'step lifecycle coordination'
};

export const setupStepLifecycleListener = (startListening: AppStartListening): void => {
  void startListening;
};
