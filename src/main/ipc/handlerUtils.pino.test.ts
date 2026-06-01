/**
 * Integration test: verifies that logHandlerError produces a non-blind log
 * line when routed through a REAL pino instance with no custom serializers —
 * matching the production config in src/main/logging.ts.
 *
 * The original live bug: an Error logged under key `error` (not `err`) caused
 * pino to emit `"error":{}` because its built-in serializer only fires for
 * `err`. This test catches that regression end-to-end.
 */
import { PassThrough } from 'node:stream';
import pino from 'pino';
import { describe, expect, it } from 'vitest';
import { logHandlerError } from './handlerUtils';

const buildRealLogger = (): { logger: pino.Logger; getLines: () => string[] } => {
  const chunks: string[] = [];
  const stream = new PassThrough();
  stream.on('data', (chunk: Buffer | string) => chunks.push(chunk.toString()));

  // Match production config from src/main/logging.ts: no custom serializers,
  // pino defaults (built-in `err` serializer is active).
  const logger = pino(
    {
      level: 'info',
      base: { pid: 0 }
    },
    stream
  );

  return {
    logger,
    getLines: () =>
      chunks
        .join('')
        .split('\n')
        .filter((l) => l.trim().length > 0)
  };
};

describe('logHandlerError — real pino integration (guards "error":{} regression)', () => {
  it('emits a JSON line where the Error message is recoverable via err or errorDetail', () => {
    const { logger, getLines } = buildRealLogger();

    logHandlerError(
      logger,
      { channel: 'repos:list', context: { senderId: 99 }, startedAt: 0, now: () => 1 },
      new Error('boom from integration test')
    );

    // Flush synchronously — pino writes synchronously to PassThrough by default.
    const lines = getLines();
    expect(lines.length).toBeGreaterThan(0);

    const parsed = JSON.parse(lines[0]!) as Record<string, unknown>;

    // The line must NOT use the blind `"error"` key — the old bug pattern.
    expect(parsed).not.toHaveProperty('error');

    // The Error message must be recoverable somewhere in the serialized line.
    const raw = lines[0]!;
    expect(raw).toContain('boom from integration test');

    // err key: pino's built-in serializer should expand it.
    const err = parsed.err as Record<string, unknown> | undefined;
    expect(err).toBeDefined();
    expect(err?.message).toBe('boom from integration test');
    expect(typeof err?.stack).toBe('string');

    // errorDetail: belt-and-suspenders field from serializeError.
    const detail = parsed.errorDetail as Record<string, unknown> | undefined;
    expect(detail).toBeDefined();
    expect(detail?.message).toBe('boom from integration test');

    // Structural fields must be present.
    expect(parsed.channel).toBe('repos:list');
    expect(parsed.success).toBe(false);
    expect(typeof parsed.latencyMs).toBe('number');
  });

  it('null-proto error object never produces a blank error field in the emitted JSON', () => {
    const { logger, getLines } = buildRealLogger();

    const nullProto = Object.create(null) as Record<string, unknown>;
    nullProto.code = 'ENULLPROTO';
    nullProto.stderr = 'something went wrong';

    logHandlerError(
      logger,
      { channel: 'git:read', context: { senderId: 1 }, startedAt: 0, now: () => 1 },
      nullProto
    );

    const lines = getLines();
    const parsed = JSON.parse(lines[0]!) as Record<string, unknown>;

    // Must not emit the blind `"error":{}` pattern — key must not be named `error`.
    expect(parsed).not.toHaveProperty('error');

    // errorDetail must be a non-empty object carrying the null-proto props.
    const detail = parsed.errorDetail as Record<string, unknown> | undefined;
    expect(detail).toBeDefined();
    expect(Object.keys(detail!).length).toBeGreaterThan(0);
    // The original props must be present — proves serializeError spread worked.
    expect(detail!.code).toBe('ENULLPROTO');
    expect(detail!.stderr).toBe('something went wrong');
  });
});
