import type { createListenerMiddleware } from '@reduxjs/toolkit';

export type AppStartListening = ReturnType<typeof createListenerMiddleware>['startListening'];

export type ListenerTopicDescriptor = {
  topic: string;
  owns: string;
};
