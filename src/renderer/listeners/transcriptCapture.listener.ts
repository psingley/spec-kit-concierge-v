import type { AppStartListening, ListenerTopicDescriptor } from './types';

export const transcriptCaptureTopic: ListenerTopicDescriptor = {
  topic: 'transcriptCapture',
  owns: 'ACP transcript capture coordination'
};

export const setupTranscriptCaptureListener = (startListening: AppStartListening): void => {
  void startListening;
};
