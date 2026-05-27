import { mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { app } from 'electron';
import pino from 'pino';
import pretty from 'pino-pretty';
import packageJson from '../../package.json';

export type MainLogger = pino.Logger;

export type CreateMainLoggerOptions = {
  userDataPath?: string;
  now?: Date;
  packageVersion?: string;
  terminalStream?: NodeJS.WritableStream;
  enablePrettyStream?: boolean;
};

const formatLogDate = (date: Date): string => date.toISOString().slice(0, 10);

export const createMainLogger = (options: CreateMainLoggerOptions = {}): MainLogger => {
  const userDataPath = options.userDataPath ?? app.getPath('userData');
  const logDirectory = path.join(userDataPath, 'logs');
  mkdirSync(logDirectory, { recursive: true });

  const logPath = path.join(logDirectory, `concierge-${formatLogDate(options.now ?? new Date())}.log`);
  const fileStream = pino.destination({ dest: logPath, sync: true });
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
