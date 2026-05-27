import { mkdir, open } from 'node:fs/promises';
import path from 'node:path';
import type { MainLogger } from '../../logging';

export type SafeWriteStepContext = {
  stepId: string;
  label?: string;
};

export type SafeWriteRequest = {
  targetPath: string;
  contents: string;
  stepContext: SafeWriteStepContext;
};

type SafeWriteFileHandle = {
  writeFile(contents: string, options: { encoding: BufferEncoding }): Promise<void>;
  sync(): Promise<void>;
  close(): Promise<void>;
};

export type SafeWriteOptions = {
  openFile?: (targetPath: string, flags: 'w') => Promise<SafeWriteFileHandle>;
};

export const safeWrite = async (
  request: SafeWriteRequest,
  logger: Pick<MainLogger, 'info'>,
  options: SafeWriteOptions = {}
): Promise<void> => {
  logger.info(
    { targetPath: request.targetPath, stepContext: request.stepContext },
    'safe write requested'
  );

  await mkdir(path.dirname(request.targetPath), { recursive: true });
  const openFile = options.openFile ?? open;
  const handle = await openFile(request.targetPath, 'w');

  try {
    await handle.writeFile(request.contents, { encoding: 'utf8' });
    await handle.sync();
  } finally {
    await handle.close();
  }

  logger.info(
    { targetPath: request.targetPath, stepContext: request.stepContext },
    'safe write completed'
  );
};
