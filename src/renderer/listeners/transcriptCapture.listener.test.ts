import { describe, expect, it, vi } from 'vitest';
import { setupTranscriptCaptureListener, transcriptCaptureTopic } from './transcriptCapture.listener';
import { acpStreamEventReceived } from '../slices/activity';
import type { AppStartListening } from './types';

describe('transcript capture listener', () => {
  it('exports the reserved topic descriptor', () => {
    expect(transcriptCaptureTopic.topic).toBe('transcriptCapture');
  });

  it('registers Run 5 transcript capture effects and hang monitor', () => {
    vi.useFakeTimers();
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    const startListening = vi.fn() as unknown as AppStartListening;

    setupTranscriptCaptureListener(startListening);

    expect(startListening).toHaveBeenCalledTimes(1);
    expect(startListening).toHaveBeenCalledWith(
      expect.objectContaining({ actionCreator: acpStreamEventReceived, effect: expect.any(Function) })
    );
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30000);

    setIntervalSpy.mockRestore();
    vi.useRealTimers();
  });
});
