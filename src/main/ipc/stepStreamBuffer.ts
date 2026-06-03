import type { StepName, StepStreamEvent, StreamEventKind } from './stepStreamEvent.factory';

export type StreamProgressInput = {
  kind: StreamEventKind;
  message: string;
  level?: Extract<StepStreamEvent, { type: 'progress' }>['level'];
  messageId?: string;
  raw?: unknown;
};

export type BufferedStepStreamEmitter = {
  emit: (input: StreamProgressInput) => void;
  flush: () => void;
  dispose: () => void;
};

type BufferedAssistantText = {
  message: string;
  messageId?: string;
  raw?: unknown;
};

export const createBufferedStepStreamEmitter = (options: {
  step: StepName;
  sessionId: string;
  sendEvent: (event: StepStreamEvent) => void;
  intervalMs?: number;
}): BufferedStepStreamEmitter => {
  const intervalMs = options.intervalMs ?? 80;
  let buffer: BufferedAssistantText | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const clearTimer = (): void => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  const flush = (): void => {
    if (buffer === undefined) {
      return;
    }
    const event: Extract<StepStreamEvent, { type: 'progress' }> = {
      type: 'progress',
      step: options.step,
      sessionId: options.sessionId,
      level: 'info',
      message: buffer.message,
      timestamp: new Date().toISOString(),
      kind: 'assistant-text'
    };
    if (buffer.messageId !== undefined) {
      event.messageId = buffer.messageId;
    }
    if (buffer.raw !== undefined) {
      event.raw = buffer.raw;
    }
    buffer = undefined;
    clearTimer();
    options.sendEvent(event);
  };

  const scheduleFlush = (): void => {
    if (timer !== undefined) {
      return;
    }
    timer = setTimeout(flush, intervalMs);
    timer.unref?.();
  };

  return {
    emit: (input) => {
      if (input.kind === 'assistant-text') {
        if (buffer !== undefined && buffer.messageId === input.messageId) {
          buffer.message += input.message;
          buffer.raw = input.raw;
        } else {
          flush();
          buffer = { message: input.message, messageId: input.messageId, raw: input.raw };
        }
        scheduleFlush();
        return;
      }

      flush();
      const event: Extract<StepStreamEvent, { type: 'progress' }> = {
        type: 'progress',
        step: options.step,
        sessionId: options.sessionId,
        level: input.level ?? 'info',
        message: input.message,
        timestamp: new Date().toISOString(),
        kind: input.kind
      };
      if (input.messageId !== undefined) {
        event.messageId = input.messageId;
      }
      if (input.raw !== undefined) {
        event.raw = input.raw;
      }
      options.sendEvent(event);
    },
    flush,
    dispose: () => {
      clearTimer();
      buffer = undefined;
    }
  };
};
