import { describe, expect, it, vi } from 'vitest';
import { HANG_SUSPECTED_THRESHOLD_MS, setupTranscriptCaptureListener, transcriptCaptureTopic } from './transcriptCapture.listener';
import { acpStreamEventReceived, assistantTextReceived, markAcpEventSeen, recordActivity } from '../slices/activity';
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

  it('routes assistant text without recording a duplicate per-delta activity row', () => {
    vi.useFakeTimers();
    const startListening = vi.fn() as unknown as AppStartListening;
    setupTranscriptCaptureListener(startListening);

    const effect = vi.mocked(startListening).mock.calls[0]?.[0].effect;
    const dispatch = vi.fn();
    effect?.(acpStreamEventReceived({
      timestamp: '2026-06-03T00:00:00.000Z',
      sessionId: 'plan-1',
      step: 'plan',
      message: 'Hello',
      kind: 'assistant-text',
      messageId: 'message-1',
      raw: { sessionId: 's1', update: { sessionUpdate: 'agent_message_chunk' } }
    }), { dispatch } as never);

    expect(dispatch).toHaveBeenCalledWith(assistantTextReceived({
      timestamp: '2026-06-03T00:00:00.000Z',
      sessionId: 'plan-1',
      step: 'plan',
      text: 'Hello',
      messageId: 'message-1',
      raw: { sessionId: 's1', update: { sessionUpdate: 'agent_message_chunk' } }
    }));
    expect(dispatch).toHaveBeenCalledWith(markAcpEventSeen({
      timestamp: '2026-06-03T00:00:00.000Z',
      sessionId: 'plan-1',
      step: 'plan'
    }));
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: recordActivity.type }));
    vi.useRealTimers();
  });

  it('keeps tool updates visible as separate activity rows', () => {
    vi.useFakeTimers();
    const startListening = vi.fn() as unknown as AppStartListening;
    setupTranscriptCaptureListener(startListening);

    const effect = vi.mocked(startListening).mock.calls[0]?.[0].effect;
    const dispatch = vi.fn();
    effect?.(acpStreamEventReceived({
      timestamp: '2026-06-03T00:00:01.000Z',
      sessionId: 'plan-1',
      step: 'plan',
      message: 'Running read',
      kind: 'tool-call',
      raw: { sessionId: 's1', update: { sessionUpdate: 'tool_call', name: 'read' } }
    }), { dispatch } as never);

    expect(dispatch).toHaveBeenCalledWith(recordActivity({
      timestamp: '2026-06-03T00:00:01.000Z',
      level: 'info',
      message: 'Running read',
      kind: 'tool-call',
      event: 'tool-call',
      step: 'plan',
      sessionId: 'plan-1',
      raw: { sessionId: 's1', update: { sessionUpdate: 'tool_call', name: 'read' } }
    }));
    expect(dispatch).toHaveBeenCalledWith(markAcpEventSeen({
      timestamp: '2026-06-03T00:00:01.000Z',
      sessionId: 'plan-1',
      step: 'plan'
    }));
    vi.useRealTimers();
  });

  it('routes assistant bursts while marking each event as live', () => {
    vi.useFakeTimers();
    const startListening = vi.fn() as unknown as AppStartListening;
    setupTranscriptCaptureListener(startListening);

    const effect = vi.mocked(startListening).mock.calls[0]?.[0].effect;
    const dispatch = vi.fn();
    const listenerApi = { dispatch } as never;
    effect?.(acpStreamEventReceived({
      timestamp: '2026-06-03T00:00:00.000Z',
      sessionId: 'tasks-1',
      step: 'tasks',
      message: 'Hel',
      kind: 'assistant-text',
      messageId: 'message-1'
    }), listenerApi);
    effect?.(acpStreamEventReceived({
      timestamp: '2026-06-03T00:00:01.000Z',
      sessionId: 'tasks-1',
      step: 'tasks',
      message: 'lo',
      kind: 'assistant-text',
      messageId: 'message-1'
    }), listenerApi);

    expect(dispatch.mock.calls.filter((call) => call[0].type === assistantTextReceived.type)).toHaveLength(2);
    expect(dispatch.mock.calls.filter((call) => call[0].type === markAcpEventSeen.type)).toHaveLength(2);
    vi.useRealTimers();
  });
});
