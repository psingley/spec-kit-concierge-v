import { describe, expect, it, vi } from 'vitest';
import { setupTranscriptCaptureListener, transcriptCaptureTopic } from './transcriptCapture.listener';
import type { AppStartListening } from './types';

describe('transcript capture listener', () => {
  it('exports the reserved topic descriptor', () => {
    expect(transcriptCaptureTopic.topic).toBe('transcriptCapture');
  });

  it('accepts startListening without registering Run 4 effects', () => {
    const startListening = vi.fn() as unknown as AppStartListening;

    setupTranscriptCaptureListener(startListening);

    expect(startListening).not.toHaveBeenCalled();
  });
});
