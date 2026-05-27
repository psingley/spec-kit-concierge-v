import type { AppStartListening, ListenerTopicDescriptor } from './types';

export const acpStreamSubscriptionTopic: ListenerTopicDescriptor = {
  topic: 'acpStreamSubscription',
  owns: 'single ACP stream subscription path'
};

export const setupAcpStreamSubscriptionListener = (startListening: AppStartListening): void => {
  void startListening;
};
