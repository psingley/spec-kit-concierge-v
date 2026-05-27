import type { IpcMainInvokeEvent } from 'electron';

export type SenderContext = {
  senderId: number;
};

export type IpcHandlerEvent = Pick<IpcMainInvokeEvent, 'sender'>;

export type StructuredHandlerLogger = {
  info: (fields: Record<string, unknown>, message: string) => void;
  error: (fields: Record<string, unknown>, message: string) => void;
};

export const getSenderContext = (event: IpcHandlerEvent): SenderContext => ({
  senderId: event.sender.id
});

export const latencyMs = (startedAt: number, now: () => number): number =>
  Math.round((now() - startedAt) * 1000) / 1000;

export const toError = (message: string): Error => new Error(message);

export const assertOnePayload = (channel: string, args: unknown[]): unknown => {
  if (args.length !== 1) {
    throw new Error(`${channel} requires exactly one payload.`);
  }

  return args[0];
};
