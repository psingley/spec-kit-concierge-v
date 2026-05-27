import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import pino from 'pino';

export type MainLogger = pino.Logger;

export const createMainLogger = (): MainLogger => {
  const logDirectory = path.join(app.getPath('userData'), 'logs');
  mkdirSync(logDirectory, { recursive: true });

  return pino(
    { name: 'spec-kit-concierge' },
    pino.destination(path.join(logDirectory, 'main.log'))
  );
};
