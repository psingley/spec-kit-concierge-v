import { describe, expect, it, vi } from 'vitest';
import { logHandlerError, logHandlerSuccess, serializeError, type StructuredHandlerLogger } from './handlerUtils';

describe('serializeError', () => {
  it('serializes an Error instance to a non-empty object exposing message, name, and stack', () => {
    const result = serializeError(new Error('boom'));

    expect(Object.keys(result).length).toBeGreaterThan(0);
    expect(result.message).toBe('boom');
    expect(result.name).toBe('Error');
    expect(typeof result.stack).toBe('string');
  });

  it('preserves own-enumerable props from exec-style errors', () => {
    const result = serializeError({ code: 1, cmd: 'gh repo list', stderr: 'x' });

    expect(result.code).toBe(1);
    expect(result.cmd).toBe('gh repo list');
    expect(result.stderr).toBe('x');
  });

  it('keeps exec-style own-enumerable props even on Error instances', () => {
    const error = Object.assign(new Error('exec failed'), {
      code: 128,
      cmd: 'git checkout',
      stderr: 'fatal',
      signal: null,
      killed: false,
      stdout: ''
    });

    const result = serializeError(error);

    expect(result.message).toBe('exec failed');
    expect(result.code).toBe(128);
    expect(result.cmd).toBe('git checkout');
    expect(result.stderr).toBe('fatal');
    expect(result.killed).toBe(false);
  });

  it('serializes a primitive string to a value field', () => {
    expect(serializeError('plain string')).toEqual({ value: 'plain string' });
  });

  it('serializes an Error with an empty message to a still-non-empty object', () => {
    const result = serializeError(new Error());

    expect(Object.keys(result).length).toBeGreaterThan(0);
    expect(result.name).toBe('Error');
    expect(typeof result.stack).toBe('string');
  });

  it('falls back to a value field for an empty non-Error object', () => {
    const result = serializeError({});

    expect(Object.keys(result).length).toBeGreaterThan(0);
    expect(result.value).toBe('[object Object]');
  });

  it('never returns an empty object for null or undefined', () => {
    expect(Object.keys(serializeError(null)).length).toBeGreaterThan(0);
    expect(Object.keys(serializeError(undefined)).length).toBeGreaterThan(0);
  });

  it('handles null-prototype objects without throwing', () => {
    const nullProto = Object.create(null) as Record<string, unknown>;
    nullProto.reason = 'bad';

    let result: Record<string, unknown> | undefined;
    expect(() => {
      result = serializeError(nullProto);
    }).not.toThrow();
    expect(result).toBeDefined();
    expect(Object.keys(result!).length).toBeGreaterThan(0);
  });

  it('handles empty null-prototype objects without throwing or returning {}', () => {
    const nullProto = Object.create(null);

    let result: Record<string, unknown> | undefined;
    expect(() => {
      result = serializeError(nullProto);
    }).not.toThrow();
    expect(result).toBeDefined();
    expect(Object.keys(result!).length).toBeGreaterThan(0);
  });

  it('handles an object with a throwing getter without crashing', () => {
    const bad = Object.defineProperty({}, 'boom', {
      get() {
        throw new Error('getter exploded');
      },
      enumerable: true
    });

    let result: Record<string, unknown> | undefined;
    expect(() => {
      result = serializeError(bad);
    }).not.toThrow();
    expect(result).toBeDefined();
    expect(Object.keys(result!).length).toBeGreaterThan(0);
  });

  it('handles a symbol without throwing', () => {
    let result: Record<string, unknown> | undefined;
    expect(() => {
      result = serializeError(Symbol('oops'));
    }).not.toThrow();
    expect(result).toBeDefined();
    expect(Object.keys(result!).length).toBeGreaterThan(0);
  });

  it('handles bigint without throwing', () => {
    let result: Record<string, unknown> | undefined;
    expect(() => {
      result = serializeError(BigInt(42));
    }).not.toThrow();
    expect(result).toBeDefined();
    expect(Object.keys(result!).length).toBeGreaterThan(0);
  });

  it('handles a hostile Proxy whose every trap throws without itself throwing', () => {
    // Every trap throws, including get (Symbol.toStringTag), ownKeys, and
    // getOwnPropertyDescriptor — this is the input class that broke safeString's
    // old single-catch design: the catch clause called Object.prototype.toString
    // which re-triggered the throwing get trap and escaped uncaught.
    const handler: ProxyHandler<object> = {
      get() {
        throw new Error('trap: get');
      },
      has() {
        throw new Error('trap: has');
      },
      ownKeys() {
        throw new Error('trap: ownKeys');
      },
      getOwnPropertyDescriptor() {
        throw new Error('trap: getOwnPropertyDescriptor');
      },
      getPrototypeOf() {
        throw new Error('trap: getPrototypeOf');
      }
    };
    const hostileProxy = new Proxy({}, handler);

    let result: Record<string, unknown> | undefined;
    expect(() => {
      result = serializeError(hostileProxy);
    }).not.toThrow();
    expect(result).toBeDefined();
    expect(Object.keys(result!).length).toBeGreaterThan(0);
  });
});

describe('logHandlerError (regression guard for "error":{} blind logs)', () => {
  const createSpyLogger = (): { logger: StructuredHandlerLogger; error: ReturnType<typeof vi.fn> } => {
    const error = vi.fn();
    return { logger: { info: vi.fn(), error }, error };
  };

  it('produces fields whose JSON serialization recovers the Error message (the old "error":{} bug)', () => {
    const { logger, error } = createSpyLogger();

    logHandlerError(logger, { channel: 'repos:list', context: { senderId: 1 }, startedAt: 0, now: () => 1 }, new Error('boom'));

    const [fields, message] = error.mock.calls[0]!;
    expect(message).toBe('ipc handler invocation');
    // Guard: the message must be recoverable from the serialized log line.
    expect(JSON.stringify(fields)).toContain('boom');
    expect(fields.success).toBe(false);
  });

  it('attaches a non-empty errorDetail and the pino-serializable err key', () => {
    const { logger, error } = createSpyLogger();

    logHandlerError(logger, { channel: 'repos:list', context: { senderId: 1 }, startedAt: 0, now: () => 1 }, new Error('boom'));

    const [fields] = error.mock.calls[0]!;
    expect(fields.err).toBeInstanceOf(Error);
    expect(Object.keys(fields.errorDetail as Record<string, unknown>).length).toBeGreaterThan(0);
    expect((fields.errorDetail as Record<string, unknown>).message).toBe('boom');
    expect(fields.channel).toBe('repos:list');
    expect(typeof fields.latencyMs).toBe('number');
  });

  it('preserves channel-specific extra fields', () => {
    const { logger, error } = createSpyLogger();

    logHandlerError(
      logger,
      { channel: 'mcp:config:fix', context: { senderId: 2 }, startedAt: 0, now: () => 1, reason: 'manual' },
      new Error('nope')
    );

    const [fields] = error.mock.calls[0]!;
    expect(fields.reason).toBe('manual');
  });

  it('sanitizes token-bearing IPC error serialization and log fields', () => {
    const { logger, error: errorSpy } = createSpyLogger();
    const token = 'secret-token';
    const base64 = Buffer.from(`person@example.com:${token}`).toString('base64');
    const thrown = Object.assign(new Error(`Authorization: Basic ${base64} ${token}`), {
      token,
      headers: { Authorization: `Basic ${base64}` }
    });

    const serialized = serializeError(thrown, [token]);
    logHandlerError(
      logger,
      { channel: 'jira:submit', context: { senderId: 1 }, startedAt: 0, now: () => 1 },
      thrown,
      [token]
    );

    expect(JSON.stringify(serialized)).toContain('[REDACTED]');
    expect(JSON.stringify(serialized)).not.toContain(token);
    expect(JSON.stringify(serialized)).not.toContain(base64);
    const [fields] = errorSpy.mock.calls[0]!;
    expect(JSON.stringify(fields.errorDetail)).not.toContain(token);
    expect(JSON.stringify(fields.errorDetail)).not.toContain(base64);
  });
});

describe('logHandlerSuccess', () => {
  const createSpyLogger = (): { logger: StructuredHandlerLogger; info: ReturnType<typeof vi.fn> } => {
    const info = vi.fn();
    return { logger: { info, error: vi.fn() }, info };
  };

  it('logs success:true with latency and no error fields', () => {
    const { logger, info } = createSpyLogger();

    logHandlerSuccess(logger, { channel: 'repos:list', context: { senderId: 1 }, startedAt: 0, now: () => 1 });

    const [fields, message] = info.mock.calls[0]!;
    expect(message).toBe('ipc handler invocation');
    expect(fields.success).toBe(true);
    expect(typeof fields.latencyMs).toBe('number');
    expect(fields.err).toBeUndefined();
  });

  it('spreads detail fields onto the success log line', () => {
    const { logger, info } = createSpyLogger();

    logHandlerSuccess(logger, {
      channel: 'auth:atlassian:login',
      context: { senderId: 1 },
      startedAt: 0,
      now: () => 1,
      detail: { label: 'Configured', provider: 'atlassian', identity: 'octocat' }
    });

    const [fields] = info.mock.calls[0]!;
    expect(fields.label).toBe('Configured');
    expect(fields.provider).toBe('atlassian');
    expect(fields.identity).toBe('octocat');
  });
});
