import type { AppStartListening, ListenerTopicDescriptor } from './types';

export const workspaceChangeTopic: ListenerTopicDescriptor = {
  topic: 'workspaceChange',
  owns: 'workspace change coordination'
};

export const setupWorkspaceChangeListener = (startListening: AppStartListening): void => {
  void startListening;
};
