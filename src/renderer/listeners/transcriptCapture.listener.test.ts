import { describe, expect, it, vi } from 'vitest';
import { HANG_SUSPECTED_THRESHOLD_MS, setupTranscriptCaptureListener, transcriptCaptureTopic } from './transcriptCapture.listener';
import { acpStreamEventReceived } from '../slices/activity';
import type { AppStartListening } from './types';

describe('transcript capture listener', () => {
  it('exports the reserved topic descriptor', () => {
    expect(transcriptCaptureTopic.topic).toBe('transcriptCapture');
  });

  it('uses a 40-minute inert ACP silence threshold', () => {
    expect(HANG_SUSPECTED_THRESHOLD_MS).toBe(2400000);
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
