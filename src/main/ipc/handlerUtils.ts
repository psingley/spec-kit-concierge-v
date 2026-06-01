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

/**
 * Best-effort String() that never throws. Each fallback is independently
 * guarded so a hostile Proxy (or any value whose toString/Symbol.toPrimitive
 * and Symbol.toStringTag traps all throw) cannot escape.
 */
const safeString = (v: unknown): string => {
  try {
    return String(v);
  } catch {
    /* fall through */
  }
  try {
    return Object.prototype.toString.call(v);
  } catch {
    /* fall through */
  }
  return '[unserializable]';
};

/**
 * Serialize any thrown value into a guaranteed non-empty plain object.
 *
 * Pino's standard error serializer only fires for the `err` key, so an `Error`
 * logged under a different key serializes to `{}` — a blind log line. This
 * helper always returns at least one field: for `Error` instances it surfaces
 * `message`, `name`, and `stack` plus any own-enumerable props (so exec errors
 * keep `code`/`cmd`/`stderr`/`signal`/`killed`/`stdout`).
 *
 * The function is defensively wrapped so that throwing getters on the error
 * object itself can never propagate — it would replace the original error with
 * an opaque serializer crash inside a catch block.
 */
export const serializeError = (error: unknown): Record<string, unknown> => {
  try {
    if (error instanceof Error) {
      let own: Record<string, unknown> = {};
      try {
        own = { ...(error as unknown as Record<string, unknown>) };
      } catch {
        // A throwing enumerable getter — skip own-prop spread, keep base fields.
      }
      return { message: error.message, name: error.name, stack: error.stack, ...own };
    }

    if (typeof error === 'object' && error !== null) {
      let own: Record<string, unknown> = {};
      try {
        own = { ...(error as Record<string, unknown>) };
      } catch {
        // Throwing getter — fall through to safeString fallback.
      }
      return Object.keys(own).length > 0 ? own : { value: safeString(error) };
    }

    return { value: safeString(error) };
  } catch {
    // Last-resort: the outer block itself failed (e.g. a hostile Proxy whose
    // instanceof / typeof traps throw). Use a static literal — never call
    // safeString here because that would re-invoke the same trap and throw again.
    return { value: '[unserializable error]' };
  }
};

export type HandlerLogFields = {
  channel: string;
  context: SenderContext;
  startedAt: number;
  now: () => number;
  [key: string]: unknown;
};

const baseFields = ({ channel, context, startedAt, now, ...rest }: HandlerLogFields): Record<string, unknown> => ({
  ...rest,
  channel,
  context,
  latencyMs: latencyMs(startedAt, now)
});

/**
 * Log an IPC handler failure with the error guaranteed to be non-empty.
 *
 * Logs under the pino `err` key (so the standard error serializer applies) and
 * an explicit `errorDetail` field (belt-and-suspenders against `"error":{}`).
 */
export const logHandlerError = (
  logger: StructuredHandlerLogger,
  fields: HandlerLogFields,
  error: unknown
): void => {
  logger.error(
    { ...baseFields(fields), success: false, err: error, errorDetail: serializeError(error) },
    'ipc handler invocation'
  );
};

/**
 * Log an IPC handler success. Pass `detail` to surface response outcome fields
 * (e.g. `{ label, provider, identity }`) so distinct outcomes are
 * distinguishable in the logs.
 */
export const logHandlerSuccess = (
  logger: StructuredHandlerLogger,
  fields: HandlerLogFields & { detail?: Record<string, unknown> }
): void => {
  const { detail, ...rest } = fields;
  logger.info({ ...baseFields(rest), ...detail, success: true }, 'ipc handler invocation');
};

/**
 * Build a logger `detail` object from a login response, omitting undefined
 * fields. `identity` collapses to the username (`identity.login`) — no PII
 * beyond the username/label/provider already exposed by the factory.
 */
export const loginDetail = (response: {
  label?: string;
  provider?: string;
  identity?: { login: string };
}): Record<string, unknown> => {
  const detail: Record<string, unknown> = {};
  if (response.label !== undefined) {
    detail.label = response.label;
  }
  if (response.provider !== undefined) {
    detail.provider = response.provider;
  }
  if (response.identity?.login !== undefined) {
    detail.identity = response.identity.login;
  }
  return detail;
};

export const assertOnePayload = (channel: string, args: unknown[]): unknown => {
  if (args.length !== 1) {
    throw new Error(`${channel} requires exactly one payload.`);
  }

  return args[0];
};
