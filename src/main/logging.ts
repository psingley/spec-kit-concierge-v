import { appendFileSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Writable } from 'node:stream';
import { app } from 'electron';
import pino from 'pino';
import pretty from 'pino-pretty';
import packageJson from '../../package.json';

export type MainLogger = pino.Logger;

export type NowProvider = () => Date;

export type CreateMainLoggerOptions = {
  userDataPath?: string;
  /**
   * Source of "now" used to resolve the daily log file. Pass a function for
   * lazy evaluation (required for date rotation — see FR-008). A `Date` value
   * is also accepted for backwards compatibility but disables rotation.
   */
  now?: Date | NowProvider;
  packageVersion?: string;
  terminalStream?: NodeJS.WritableStream;
  enablePrettyStream?: boolean;
};

const formatLogDate = (date: Date): string => date.toISOString().slice(0, 10);

/**
 * A Writable stream that resolves the destination path per write call. This
 * is how we honor FR-008's "rotate by calendar date" requirement without
 * holding the file handle across day boundaries. Uses sync appendFileSync to
 * preserve the existing `sync: true` semantics from pino.destination.
 */
const createRotatingFileStream = (
  logDirectory: string,
  now: NowProvider
): NodeJS.WritableStream =>
  new Writable({
    write(chunk: Buffer | string, _encoding, callback): void {
      try {
        const logPath = path.join(logDirectory, `concierge-${formatLogDate(now())}.log`);
        appendFileSync(logPath, chunk);
        callback();
      } catch (error) {
        callback(error as Error);
      }
    }
  });

export const createMainLogger = (options: CreateMainLoggerOptions = {}): MainLogger => {
  const userDataPath = options.userDataPath ?? app.getPath('userData');
  const logDirectory = path.join(userDataPath, 'logs');
  mkdirSync(logDirectory, { recursive: true });

  const nowProvider: NowProvider =
    typeof options.now === 'function'
      ? options.now
      : ((): NowProvider => {
          const fixed = options.now;
          return (): Date => fixed ?? new Date();
        })();

  const fileStream = createRotatingFileStream(logDirectory, nowProvider);
  const enablePrettyStream =
    options.enablePrettyStream ?? process.env.NODE_ENV !== 'production';
  const streams: pino.StreamEntry[] = [{ stream: fileStream }];

  if (enablePrettyStream) {
    const prettyStream = pretty({
      colorize: true,
      destination: options.terminalStream ?? process.stdout,
      singleLine: true,
      translateTime: 'SYS:standard'
    });

    streams.push({ stream: prettyStream });
  }

  return pino(
    {
      level: process.env.CONCIERGE_DEBUG === '1' ? 'debug' : 'info',
      base: {
        pid: process.pid,
        hostname: os.hostname(),
        app: 'concierge',
        version: options.packageVersion ?? packageJson.version
      },
      redact: []
    },
    pino.multistream(streams)
  );
};
